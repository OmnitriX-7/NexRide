import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from './supabaseClient'; 
import { useUserStore } from './store'; 
import Auth from './Auth';
import OnboardingSurvey from './OnboardingSurvey';
import Home from './Home';
import LoadingScreen from './LoadingScreen';
import NotificationToast from './NotificationToast';
import ProfileDashboard from './ProfileDashboard';
import Navbar from './Navbar';
import Leaderboard from './Leaderboard';
import PaymentsDashboard from './PaymentsDashboard';
import PremiumView from './PremiumView';

function App() {
  const { setProfile, hasProfile, setHasProfile } = useUserStore();
  const [session, setSession] = useState<any>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const fetchAndSyncProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle(); 
      
      if (error) throw error;

      if (data) {
        // Enforce premium expiry
        if (data.is_premium && data.premium_expires_at) {
          if (new Date(data.premium_expires_at) < new Date()) {
            data.is_premium = false;
            // Optionally update DB here in background
            supabase.from('profiles').update({ is_premium: false }).eq('id', userId);
          }
        }
        setProfile(data);
        setHasProfile(data.onboarded); 
        return data.onboarded;
      }
      
      setHasProfile(false);
      return false;
    } catch (err) {
      setHasProfile(false);
      return false;
    }
  };

  useEffect(() => {
    const initApp = async () => {
      // Ensure splash screen shows for at least 2 seconds to match animation
      const minLoadingTime = new Promise(resolve => setTimeout(resolve, 2000));
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (initialSession) {
          setSession(initialSession);
          await fetchAndSyncProfile(initialSession.user.id);
        } else {
          setHasProfile(false);
          setSession(null);
        }
      } catch (error) {
        console.error(error);
      } finally {
        await minLoadingTime;
        setIsInitialLoading(false);
      }
    };

    initApp();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (event === 'SIGNED_IN' && currentSession) {
        await fetchAndSyncProfile(currentSession.user.id);
        setSession(currentSession);
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
        setHasProfile(false);
        setSession(null);
        setIsInitialLoading(false);
      } else if (currentSession) {
        setSession(currentSession);
        setIsInitialLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [setProfile, setHasProfile]);

  if (isInitialLoading) {
    return <LoadingScreen />;
  }

  return (
    <Router>
      <NotificationToast />
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={
            !session ? <Auth /> : 
            (hasProfile ? <Navigate to="/home" replace /> : <Navigate to="/onboarding" replace />)
          } />

          <Route path="/onboarding" element={
            session && !hasProfile ? <OnboardingSurvey /> : 
            (hasProfile ? <Navigate to="/home" replace /> : <Navigate to="/" replace />)
          } />

          <Route path="/home" element={
            session && hasProfile ? (
              <motion.div 
                key="home-content" 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                style={{ width: '100%' }}
              >
                <Home />
              </motion.div>
            ) : (
              <Navigate to={session ? "/onboarding" : "/"} replace />
            )
          } />

          <Route path="/profile" element={
            session && hasProfile ? (
              <motion.div 
                key="profile-content" 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                style={{ width: '100%' }}
              >
                <div style={{ position: 'sticky', top: 0, zIndex: 1000 }}>
                  <Navbar />
                </div>
                <ProfileDashboard />
              </motion.div>
            ) : (
              <Navigate to={session ? "/onboarding" : "/"} replace />
            )
          } />

          <Route path="/leaderboard" element={
            session && hasProfile ? (
              <motion.div 
                key="leaderboard-content" 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                style={{ width: '100%', height: '100%', overflow: 'hidden' }}
              >
                <div style={{ position: 'sticky', top: 0, zIndex: 1000 }}>
                  <Navbar />
                </div>
                <Leaderboard />
              </motion.div>
            ) : (
              <Navigate to={session ? "/onboarding" : "/"} replace />
            )
          } />

          <Route path="/payments" element={
            !session ? <Navigate to="/" replace /> :
            (!hasProfile ? <Navigate to="/onboarding" replace /> : (
              <>
                <Navbar />
                <PaymentsDashboard />
              </>
            ))
          } />

          <Route path="/premium" element={
            !session ? <Navigate to="/" replace /> :
            (!hasProfile ? <Navigate to="/onboarding" replace /> : (
              <>
                <Navbar />
                <PremiumView />
              </>
            ))
          } />

          <Route path="*" element={
            <Navigate to={!session ? "/" : (hasProfile ? "/home" : "/onboarding")} replace />
          } />
        </Routes>
      </AnimatePresence>
    </Router>
  );
}

export default App;