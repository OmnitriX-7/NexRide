import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from './supabaseClient';
import { useUserStore } from './store'; 
import Navbar from './Navbar';
import RiderView from './RiderView';
import DriverView from './DriverView';
import LoadingScreen from './LoadingScreen';

const Home = () => {
  const { profile, showToast } = useUserStore();
  // Initialize mode based on database role
  const [isDriverMode, setIsDriverMode] = useState(profile?.role === 'driver');

  useEffect(() => {
    if (profile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsDriverMode(profile.role === 'driver');
    }
  }, [profile]);

  // Handle manual toggle from Navbar

  // Real-time listener for Rewards/Coupons
  useEffect(() => {
    if (!profile?.id) return;

    const rewardChannel = supabase.channel(`user-rewards-${profile.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'coupons', filter: `user_id=eq.${profile.id}` },
        async (payload: any) => {
          if (payload.new.is_referral_reward && !payload.new.notified) {
            showToast(`Referral Unlocked! ${payload.new.discount_percent}% discount ready.`);
            // Mark as notified in DB
            await supabase.from('coupons').update({ notified: true }).eq('id', payload.new.id);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(rewardChannel); };
  }, [profile?.id, showToast]);

  if (!profile) return <LoadingScreen />;

  return (
    <div 
      className="home-wrapper"
      style={{ 
        position: 'relative', 
        minHeight: '100vh', 
        width: '100%', 
        backgroundColor: 'var(--bg-main)',
        color: 'var(--text-main)',
        transition: 'background-color 0.3s ease',
        overflowX: 'hidden'
      }}
    >
      <div style={{ position: 'sticky', top: 0, zIndex: 1000 }}>
        <Navbar />
      </div>

      <main style={{ width: '100%', minHeight: 'calc(100vh - 80px)' }}>
        <AnimatePresence mode="wait">
          {isDriverMode ? (
            <motion.div
              key="driver"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <DriverView />
            </motion.div>
          ) : (
            <motion.div
              key="rider"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <RiderView />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Decorative background blur */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        width: '100%',
        height: '100px',
        background: 'linear-gradient(transparent, var(--bg-main))',
        pointerEvents: 'none',
        zIndex: 5,
        opacity: 0.5
      }} />
    </div>
  );
};

export default Home;