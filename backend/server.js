require('dotenv').config();
const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
app.use(cors());
app.use(express.json());

app.post('/create-payment-intent', async (req, res) => {
  try {
    const { amount, currency = 'usd' } = req.body;

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe expects amounts in cents
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
