import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Wallet, Receipt, Plus, ArrowUpRight, ArrowDownLeft, Clock, MapPin, IndianRupee } from 'lucide-react';
import { useUserStore } from './store';
import { supabase } from './supabaseClient';
import './PaymentsDashboard.css';

const PaymentsDashboard = () => {
  const { profile, showToast, setProfile } = useUserStore();
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingFunds, setIsAddingFunds] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!profile?.id) return;
      const { data, error } = await supabase
        .from('ride_dispatches')
        .select('*')
        .or(`rider_id.eq.${profile.id},driver_id.eq.${profile.id}`)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(20);

      if (data) {
        setHistory(data);
      }
      setIsLoading(false);
    };

    fetchHistory();
  }, [profile?.id]);

  const handleAddFunds = async () => {
    if (!profile?.id) return;
    setIsAddingFunds(true);
    
    // Simulate adding $50 to wallet
    const newBalance = (profile.wallet_balance || 0) + 50.00;
    
    const { error } = await supabase
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', profile.id);

    if (!error) {
      setProfile({ ...profile, wallet_balance: newBalance });
      showToast("Added ₹50.00 to your NexRide Wallet!");
    } else {
      showToast("Failed to add funds. Ensure wallet_balance column exists.");
    }
    
    setIsAddingFunds(false);
  };

  return (
    <div className="payments-page">
      <div className="payments-container">
        
        <header className="payments-header">
          <h1>Payments & Wallet</h1>
          <p>Manage your payment methods and view your ride history.</p>
        </header>

        <div className="top-widgets">
          
          {/* WALLET CARD */}
          <motion.div 
            className="widget-card wallet-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="wallet-header">
              <div className="icon-wrapper">
                <Wallet size={24} color="#ffffff" />
              </div>
              <span className="badge">NexRide Cash</span>
            </div>
            
            <div className="balance-section">
              <span className="balance-label">Current Balance</span>
              <h2 className="balance-amount">
                <IndianRupee size={28} />
                {(profile?.wallet_balance || 0).toFixed(2)}
              </h2>
            </div>

            <button className="add-funds-btn" onClick={handleAddFunds} disabled={isAddingFunds}>
              {isAddingFunds ? <Clock size={18} className="spin" /> : <Plus size={18} />}
              {isAddingFunds ? "Adding..." : "Add ₹50.00"}
            </button>
          </motion.div>

          {/* SAVED CARDS WIDGET */}
          <motion.div 
            className="widget-card cards-widget"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="cards-header">
              <h3>Saved Payment Methods</h3>
            </div>
            
            <div className="mock-credit-card">
              <div className="card-logo">VISA</div>
              <div className="card-chip"></div>
              <div className="card-number">**** **** **** 4242</div>
              <div className="card-footer">
                <span>Expires 12/30</span>
              </div>
            </div>

            <button className="add-card-btn">
              <Plus size={18} /> Add New Method
            </button>
          </motion.div>

        </div>

        {/* TRANSACTION HISTORY */}
        <motion.div 
          className="history-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="history-header">
            <h3><Receipt size={20} /> Recent Transactions</h3>
          </div>

          <div className="history-list">
            {isLoading ? (
              <div className="loading-state">Loading history...</div>
            ) : history.length === 0 ? (
              <div className="empty-state">
                <Receipt size={48} color="#cbd5e1" />
                <p>No transactions yet.</p>
              </div>
            ) : (
              history.map((ride) => {
                const isRider = ride.rider_id === profile?.id;
                const formattedDate = new Date(ride.created_at).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                });

                return (
                  <div key={ride.id} className="history-item">
                    <div className="history-icon-wrapper" style={{ backgroundColor: isRider ? '#fee2e2' : '#dcfce7' }}>
                      {isRider ? <ArrowUpRight size={20} color="#ef4444" /> : <ArrowDownLeft size={20} color="#22c55e" />}
                    </div>
                    
                    <div className="history-details">
                      <h4 className="history-title">{ride.dropoff_name}</h4>
                      <div className="history-meta">
                        <span>{formattedDate}</span>
                        <span className="dot">•</span>
                        <span className="payment-method-tag">
                          {ride.payment_method === 'stripe' ? <CreditCard size={12} /> : <Wallet size={12} />}
                          {ride.payment_method?.toUpperCase() || 'CASH'}
                        </span>
                      </div>
                    </div>

                    <div className="history-amount">
                      <span style={{ color: isRider ? '#0f172a' : '#16a34a' }}>
                        {isRider ? '-' : '+'}₹{ride.fare_amount}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PaymentsDashboard;
