require('dotenv').config();
const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

app.post('/create-payment-intent', async (req, res) => {
  try {
    const { ride_id, wallet_used = 0, currency = 'usd', type = 'ride' } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).send({ error: { message: "Missing Authorization header" } });
    }

    const token = authHeader.split(' ')[1];
    
    // Create Supabase client for this user request
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    let finalAmount = 0;

    if (type === 'subscription') {
      finalAmount = 29.99; // Hardcoded premium subscription amount
    } else {
      if (!ride_id) {
        return res.status(400).send({ error: { message: "Missing ride_id" } });
      }

      // 1. Securely fetch ride details from Supabase using user's token
      // RLS ensures they can only read their own rides
      const { data: ride, error: rideError } = await supabase
        .from('ride_dispatches')
        .select('fare_amount, rider_id')
        .eq('id', ride_id)
        .single();

      if (rideError || !ride) {
        return res.status(403).send({ error: { message: "Ride not found or unauthorized" } });
      }

      // 2. Validate wallet balance if wallet_used > 0
      if (wallet_used > 0) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('wallet_balance')
          .eq('id', ride.rider_id)
          .single();
          
        if (profileError || !profile || profile.wallet_balance < wallet_used) {
          return res.status(400).send({ error: { message: "Insufficient wallet balance" } });
        }
      }

      // 3. Calculate true final amount
      finalAmount = Math.max(0, ride.fare_amount - wallet_used);
    }

    if (finalAmount <= 0) {
      // Return a special flag indicating free/wallet-only payment
      return res.send({ clientSecret: 'wallet_only' });
    }

    // 4. Create a PaymentIntent with the verified order amount
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(finalAmount * 100), // Stripe expects amounts in cents
      currency: currency,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.send({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error("Stripe Error:", error);
    res.status(400).send({ error: { message: error.message } });
  }
});

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => console.log(`Node server listening on port ${PORT}!`));
