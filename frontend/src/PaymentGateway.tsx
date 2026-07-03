import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { ShieldCheck, Lock, CreditCard, DollarSign } from 'lucide-react';
import { supabase } from './supabaseClient';

// Ensure the user replaces this with their actual key via .env
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_dummy');

interface PaymentGatewayProps {
  clientSecret: string;
  amount: number;
  stripeAmount?: number;
  walletUsed?: number;
  rideId?: string;
  type?: 'ride' | 'subscription';
  onSuccess: () => void;
  onCancel: () => void;
}

const CheckoutForm = ({ amount, walletUsed, rideId, clientSecret, type = 'ride', onSuccess, onCancel }: any) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash' | 'wallet'>('card');
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  React.useEffect(() => {
    // Fetch current wallet balance
    const fetchBalance = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('wallet_balance').eq('id', user.id).single();
        if (data) setWalletBalance(data.wallet_balance);
      }
    };
    fetchBalance();
  }, []);
  


  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();


    const updateDatabase = async (method: string) => {
      if (type === 'subscription') {
        // Securely call RPC to subscribe
        await supabase.rpc('subscribe_premium');
        onSuccess();
        return;
      }

      // 1. Mark ride as paid and deduct wallet securely using RPC
      const { error: rpcError } = await supabase.rpc('process_ride_payment', {
        p_ride_id: rideId,
        p_wallet_used: walletUsed || 0,
        p_method: method
      });
      
      if (rpcError) {
        setError("Payment succeeded but database update failed: " + rpcError.message);
        setProcessing(false);
        return;
      }
      
      onSuccess();
    };

    if (paymentMethod === 'cash') {
      setProcessing(true);
      await updateDatabase('cash');
      return;
    }

    if (paymentMethod === 'wallet') {
      if (walletBalance === null || walletBalance < amount) {
        setError("Insufficient wallet balance");
        return;
      }
      setProcessing(true);
      // Directly mark as paid and deduct from db
      const { error: dbError } = await supabase
        .from('ride_dispatches')
        .update({ payment_status: 'paid', payment_method: 'wallet' })
        .eq('id', rideId);
      
      if (!dbError) {
        await supabase.from('profiles').update({ wallet_balance: walletBalance - amount }).eq('id', (await supabase.auth.getUser()).data.user?.id);
        onSuccess();
      } else {
        setError("Failed to process wallet payment");
        setProcessing(false);
      }
      return;
    }

    if (!stripe || !elements) return;
    setProcessing(true);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message || "An error occurred");
      setProcessing(false);
      return;
    }

    // Confirm Payment
    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required', // Avoid full page redirect if possible
    });

    if (confirmError) {
      setError(confirmError.message || "Payment failed");
      setProcessing(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      await updateDatabase('stripe');
    } else {
      setError("Payment processing...");
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      <div style={tabsStyle}>
        <button 
          type="button"
          onClick={() => setPaymentMethod('card')}
          style={paymentMethod === 'card' ? activeTabStyle : tabStyle}
        >
          <CreditCard size={18} /> Card
        </button>
        <button 
          type="button"
          onClick={() => setPaymentMethod('wallet')}
          style={paymentMethod === 'wallet' ? activeTabStyle : tabStyle}
        >
          <ShieldCheck size={18} /> Wallet
        </button>
        <button 
          type="button"
          onClick={() => setPaymentMethod('cash')}
          style={paymentMethod === 'cash' ? activeTabStyle : tabStyle}
        >
          <DollarSign size={18} /> Cash
        </button>
      </div>

      {paymentMethod === 'card' && (
        <div style={stripeContainerStyle}>
          <PaymentElement options={{ layout: 'tabs' }} />
        </div>
      )}
      
      {paymentMethod === 'cash' && (
        <div style={cashInfoStyle}>
          <h3>Pay Driver Directly</h3>
          <p>Please pay the driver <b>₹{amount?.toFixed(2)}</b> in cash at the end of your trip.</p>
        </div>
      )}

      {paymentMethod === 'wallet' && (
        <div style={cashInfoStyle}>
          <h3>NexRide Wallet</h3>
          {walletBalance !== null ? (
            walletBalance >= amount ? (
              <p style={{ color: '#16a34a', fontWeight: '600' }}>
                You have ₹{walletBalance.toFixed(2)} available. This covers the full fare of ₹{amount?.toFixed(2)}.
              </p>
            ) : (
              <p style={{ color: '#ef4444', fontWeight: '600' }}>
                Insufficient Balance. You have ₹{walletBalance.toFixed(2)} but need ₹{amount?.toFixed(2)}. Please choose another payment method.
              </p>
            )
          ) : (
            <p>Loading balance...</p>
          )}
        </div>
      )}

      {error && <div style={errorStyle}>{error}</div>}

      <div style={footerStyle}>
        <div style={secureBadgeStyle}>
          <ShieldCheck size={14} color="#16a34a" /> 
          <Lock size={14} color="#16a34a" />
          <span>256-bit Secure Encryption</span>
        </div>
        
        <div style={actionButtonsStyle}>
          <button type="button" onClick={onCancel} style={cancelBtnStyle} disabled={processing}>
            Cancel
          </button>
          <button type="submit" style={payBtnStyle} disabled={processing || (!stripe && paymentMethod === 'card' && clientSecret !== 'wallet_only') || (paymentMethod === 'wallet' && (walletBalance === null || walletBalance < amount))}>
            {processing ? 'Processing...' : `Pay ₹${amount?.toFixed(2)}`}
          </button>
        </div>
      </div>
    </form>
  );
};

const WalletOnlyCheckoutForm = ({ walletUsed, rideId, onSuccess, onCancel }: any) => {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleWalletPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    
    // 1. Mark ride as paid
    const { error: dbError } = await supabase
      .from('ride_dispatches')
      .update({ payment_status: 'paid', payment_method: 'wallet' })
      .eq('id', rideId);
    
    if (dbError) {
      setError("Payment succeeded but database update failed.");
      setProcessing(false);
      return;
    }
    
    // 2. Deduct wallet balance if used
    if (walletUsed > 0) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('wallet_balance').eq('id', user.id).single();
        if (profile) {
          await supabase.from('profiles').update({ wallet_balance: Math.max(0, profile.wallet_balance - walletUsed) }).eq('id', user.id);
        }
      }
    }
    
    onSuccess();
  };

  return (
    <form onSubmit={handleWalletPayment} style={formStyle}>
      <div style={cashInfoStyle}>
        <h3>Free Ride!</h3>
        <p>Your wallet balance covers the entire cost of this ride.</p>
      </div>

      {error && <div style={errorStyle}>{error}</div>}

      <div style={footerStyle}>
        <div style={secureBadgeStyle}>
          <ShieldCheck size={14} color="#16a34a" /> 
          <Lock size={14} color="#16a34a" />
          <span>256-bit Secure Encryption</span>
        </div>
        
        <div style={actionButtonsStyle}>
          <button type="button" onClick={onCancel} style={cancelBtnStyle} disabled={processing}>
            Cancel
          </button>
          <button type="submit" style={payBtnStyle} disabled={processing}>
            {processing ? 'Processing...' : 'Confirm Free Ride'}
          </button>
        </div>
      </div>
    </form>
  );
};

export const PaymentGateway = ({ clientSecret, amount, stripeAmount, walletUsed, rideId, type = 'ride', onSuccess, onCancel }: PaymentGatewayProps) => {
  const isWalletOnly = clientSecret === 'wallet_only';
  
  return (
    <div style={overlayStyle}>
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={modalStyle}
      >
        <div style={headerStyle}>
          <h2>{type === 'subscription' ? 'Subscribe to Elite' : 'Complete Payment'}</h2>
          <p>NexRide Secure Checkout</p>
          
          <div style={{ marginTop: '16px', background: '#fff', borderRadius: '12px', padding: '16px', textAlign: 'left', border: '1px solid #e2e8f0' }}>
            {type === 'subscription' ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>NexRide Elite (30 Days):</span>
                  <span>₹499.00</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderTop: '1px solid #e2e8f0', paddingTop: '8px', marginTop: '8px' }}>
                  <span>Total to Pay:</span>
                  <span>₹499.00</span>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>Base Fare:</span>
                  <span>₹{amount.toFixed(2)}</span>
                </div>
                {amount - (stripeAmount || 0) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#16a34a' }}>
                    <span>Elite Discount:</span>
                    <span>-₹{(amount - (stripeAmount || 0)).toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderTop: '1px solid #e2e8f0', paddingTop: '8px', marginTop: '8px' }}>
                  <span>Total to Pay:</span>
                  <span>₹{stripeAmount?.toFixed(2)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {clientSecret ? (
          isWalletOnly ? (
            <WalletOnlyCheckoutForm walletUsed={walletUsed} rideId={rideId} onSuccess={onSuccess} onCancel={onCancel} />
          ) : (
            <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
              <CheckoutForm amount={amount} stripeAmount={stripeAmount} walletUsed={walletUsed} rideId={rideId} clientSecret={clientSecret} type={type} onSuccess={onSuccess} onCancel={onCancel} />
            </Elements>
          )
        ) : (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <p>Initializing secure payment gateway...</p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

// --- STYLES ---
const overlayStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
  backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
  display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
};
const modalStyle: React.CSSProperties = {
  backgroundColor: 'white', width: '90%', maxWidth: '500px',
  borderRadius: '24px', overflowY: 'auto', maxHeight: '90vh', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
};
const headerStyle: React.CSSProperties = {
  backgroundColor: '#f8fafc', padding: '24px', borderBottom: '1px solid #e2e8f0', textAlign: 'center'
};
const formStyle: React.CSSProperties = {
  padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px'
};
const tabsStyle: React.CSSProperties = {
  display: 'flex', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '12px', gap: '4px'
};
const tabStyle: React.CSSProperties = {
  flex: 1, padding: '12px', borderRadius: '8px', border: 'none', background: 'none',
  cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
  color: '#64748b', fontWeight: '600'
};
const activeTabStyle: React.CSSProperties = {
  ...tabStyle, backgroundColor: 'white', color: '#0f172a', boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
};
const stripeContainerStyle: React.CSSProperties = {
  minHeight: '200px'
};
const cashInfoStyle: React.CSSProperties = {
  padding: '30px 20px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1'
};
const errorStyle: React.CSSProperties = {
  color: '#ef4444', fontSize: '14px', backgroundColor: '#fef2f2', padding: '12px', borderRadius: '8px'
};
const footerStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px'
};
const secureBadgeStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px',
  fontSize: '12px', color: '#16a34a', fontWeight: '600'
};
const actionButtonsStyle: React.CSSProperties = {
  display: 'flex', gap: '12px'
};
const cancelBtnStyle: React.CSSProperties = {
  flex: 1, padding: '16px', border: '1px solid #e2e8f0', backgroundColor: 'white', borderRadius: '12px', cursor: 'pointer', fontWeight: '600'
};
const payBtnStyle: React.CSSProperties = {
  flex: 2, padding: '16px', border: 'none', backgroundColor: '#2563eb', color: 'white', borderRadius: '12px', cursor: 'pointer', fontWeight: '700', fontSize: '16px'
};
