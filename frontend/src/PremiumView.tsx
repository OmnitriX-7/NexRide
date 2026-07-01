import { useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, Star, ShieldCheck, Zap, ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import { useUserStore } from './store';
import { supabase } from './supabaseClient';
import { PaymentGateway } from './PaymentGateway';
import './PremiumView.css';

const PremiumView = () => {
  const { profile, setProfile, showToast } = useUserStore();
  const [showPayment, setShowPayment] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);

  const handleSubscribe = async () => {
    if (!profile?.id) return;
    setIsLoading(true);
    
    try {
      const res = await fetch('http://localhost:4242/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 499 })
      });
      const data = await res.json();
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
        setShowPayment(true);
      }
    } catch (err) {
      showToast("Error connecting to payment server");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    setShowPayment(false);
    
    // Refresh profile from DB to get the new expiry date
    const { data } = await supabase.from('profiles').select('*').eq('id', profile!.id).single();
    if (data) {
      setProfile(data);
    } else {
      setProfile({ ...profile!, is_premium: true });
    }
    showToast('Welcome to NexRide Elite! 🎉');
  };

  const handleWalletPurchase = async () => {
    if (!profile?.id || (profile.wallet_balance || 0) < 499) return;
    setWalletLoading(true);
    try {
      // 1. Deduct wallet balance
      const newBalance = (profile.wallet_balance || 0) - 499;
      
      // 2. Set expiry date (30 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      
      const { error } = await supabase.from('profiles').update({
        wallet_balance: newBalance,
        is_premium: true,
        premium_expires_at: expiresAt.toISOString()
      }).eq('id', profile.id);
      
      if (error) throw error;
      
      // Update local state
      setProfile({
        ...profile,
        wallet_balance: newBalance,
        is_premium: true,
        premium_expires_at: expiresAt.toISOString()
      });
      showToast('Welcome to NexRide Elite! 🎉');
    } catch (err) {
      showToast('Error processing wallet payment.');
    } finally {
      setWalletLoading(false);
    }
  };

  const getDaysRemaining = () => {
    if (!profile?.premium_expires_at) return 30;
    const expiry = new Date(profile.premium_expires_at);
    const today = new Date();
    const diffTime = Math.abs(expiry.getTime() - today.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (profile?.is_premium) {
    return (
      <div className="premium-page">
        <motion.div 
          className="premium-active-container"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="crown-icon-large">
            <Crown size={64} color="#fbbf24" />
          </div>
          <h1>You are an Elite Member!</h1>
          <p>Thank you for subscribing to NexRide Elite. Enjoy your 10% discounts on all rides, priority matching, and your exclusive profile badge.</p>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#fef3c7', color: '#d97706', padding: '12px 24px', borderRadius: '24px', marginTop: '16px', fontWeight: 'bold' }}>
            <Clock size={20} />
            Your Elite benefits expire in {getDaysRemaining()} days.
          </div>
          
          <div className="perks-grid">
            <div className="perk-active"><CheckCircle2 color="#22c55e" /> 10% Off All Rides</div>
            <div className="perk-active"><CheckCircle2 color="#22c55e" /> Priority Matching</div>
            <div className="perk-active"><CheckCircle2 color="#22c55e" /> Elite Profile Badge</div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="premium-page">
      <div className="premium-container">
        
        <header className="premium-header">
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="premium-badge"
          >
            <Crown size={20} color="#fbbf24" />
            <span>NEXRIDE ELITE</span>
          </motion.div>
          
          <motion.h1
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            Upgrade your daily commute.
          </motion.h1>
          
          <motion.p
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Get exclusive perks, huge savings, and ride in style.
          </motion.p>
        </header>

        <div className="features-grid">
          <motion.div className="feature-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <div className="feature-icon"><Zap size={24} color="#a855f7" /></div>
            <h3>10% Off Every Ride</h3>
            <p>Save money instantly on every trip you take with NexRide.</p>
          </motion.div>

          <motion.div className="feature-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <div className="feature-icon"><Star size={24} color="#fbbf24" /></div>
            <h3>Priority Matching</h3>
            <p>Get matched with top-rated drivers faster during peak hours.</p>
          </motion.div>

          <motion.div className="feature-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <div className="feature-icon"><ShieldCheck size={24} color="#22c55e" /></div>
            <h3>Elite Profile Badge</h3>
            <p>Stand out with an exclusive golden crown around your avatar.</p>
          </motion.div>
        </div>

        <motion.div 
          className="pricing-card"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
        >
          <div className="pricing-info">
            <span className="price">₹499</span>
            <span className="period">/ 30 days</span>
          </div>
          <button className="subscribe-btn" onClick={handleSubscribe} disabled={isLoading || walletLoading}>
            {isLoading ? "Processing..." : "Subscribe Now"} <ArrowRight size={20} />
          </button>
          
          {profile && (profile.wallet_balance || 0) >= 499 && (
            <button 
              onClick={handleWalletPurchase}
              disabled={isLoading || walletLoading}
              style={{
                width: '100%', padding: '16px', borderRadius: '100px', border: '1.5px solid rgba(255,255,255,0.2)',
                background: 'transparent', color: 'white', fontWeight: '700', fontSize: '16px',
                cursor: 'pointer', marginTop: '12px', transition: 'background 0.2s'
              }}
            >
              {walletLoading ? "Processing..." : `Pay with Wallet (Bal: ₹${profile.wallet_balance})`}
            </button>
          )}

          <p className="cancel-text" style={{ marginTop: '16px' }}>One-time payment for 30 days of Elite status.</p>
        </motion.div>
      </div>

      {showPayment && clientSecret && (
        <PaymentGateway 
          clientSecret={clientSecret} 
          amount={499} 
          type="subscription"
          onSuccess={handlePaymentSuccess} 
          onCancel={() => setShowPayment(false)} 
        />
      )}
    </div>
  );
};

export default PremiumView;
