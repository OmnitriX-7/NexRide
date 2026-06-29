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
  rideId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const CheckoutForm = ({ amount, rideId, onSuccess, onCancel }: any) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash'>('card');
  
  const handleCashPayment = async () => {
    setProcessing(true);
    try {
      // Mark as paid in DB directly for cash
      const { error: dbError } = await supabase
        .from('ride_dispatches')
        .update({ payment_status: 'paid', payment_method: 'cash' })
        .eq('id', rideId);
      
      if (dbError) throw dbError;
      onSuccess();
    } catch (err: any) {
      setError(err.message);
      setProcessing(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (paymentMethod === 'cash') {
      return handleCashPayment();
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
      // Update Database
      const { error: dbError } = await supabase
        .from('ride_dispatches')
        .update({ payment_status: 'paid', payment_method: 'stripe' })
        .eq('id', rideId);
      
      if (dbError) {
        setError("Payment succeeded but database update failed.");
      } else {
        onSuccess();
      }
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
          <CreditCard size={18} /> Online / Card
        </button>
        <button 
          type="button"
          onClick={() => setPaymentMethod('cash')}
          style={paymentMethod === 'cash' ? activeTabStyle : tabStyle}
        >
          <DollarSign size={18} /> Pay Cash
        </button>
      </div>

      {paymentMethod === 'card' ? (
        <div style={stripeContainerStyle}>
          <PaymentElement options={{ layout: 'tabs' }} />
        </div>
      ) : (
        <div style={cashInfoStyle}>
          <h3>Pay Driver Directly</h3>
          <p>Please pay the driver <b>${amount.toFixed(2)}</b> in cash at the end of your trip.</p>
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
          <button type="submit" style={payBtnStyle} disabled={processing || (!stripe && paymentMethod === 'card')}>
            {processing ? 'Processing...' : `Pay $${amount.toFixed(2)}`}
          </button>
        </div>
      </div>
    </form>
  );
};

export const PaymentGateway = ({ clientSecret, amount, rideId, onSuccess, onCancel }: PaymentGatewayProps) => {
  return (
    <div style={overlayStyle}>
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={modalStyle}
      >
        <div style={headerStyle}>
          <h2>Complete Payment</h2>
          <p>NexRide Secure Checkout</p>
        </div>

        {clientSecret ? (
          <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
            <CheckoutForm amount={amount} rideId={rideId} onSuccess={onSuccess} onCancel={onCancel} />
          </Elements>
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
  borderRadius: '24px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
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
