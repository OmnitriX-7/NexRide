import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Trophy, CreditCard, 
  Crown, Users, Star, 
  ShieldAlert, LogOut, ChevronRight,
  Moon, Sun, Car
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient'; 
import { useUserStore } from './store'; // Added store import

interface MenuButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  isDestructive?: boolean;
}

const Navbar = () => {
  const { profile, setProfile } = useUserStore(); // Pulling profile from store
  const [isOpen, setIsOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => 
    document.documentElement.classList.contains('dark') || localStorage.getItem('theme') === 'dark'
  );
  const navigate = useNavigate();

  const handleReferral = async () => {
    if (isSharing) return;
    
    try {
      setIsSharing(true);
      const userId = profile?.id;
      if (!userId) return;

      const referralLink = `${window.location.origin}/?ref=${userId}`;
      const shareData = {
        title: 'Join NexRide',
        text: 'Use my link to join NexRide and we both get ride discounts!',
        url: referralLink,
      };

      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(referralLink);
        alert("Referral link copied!");
      }
    } catch (err: any) {
      // If the user aborts the share sheet, do not attempt to copy to clipboard because 
      // the document will have lost focus and throw a NotAllowedError.
      if (err.name !== 'AbortError') {
        console.error('Error sharing:', err);
        const userId = profile?.id;
        if (userId) {
          try {
            const referralLink = `${window.location.origin}/?ref=${userId}`;
            await navigator.clipboard.writeText(referralLink);
            alert("Referral link copied!");
          } catch (e) {
            console.error("Clipboard write failed", e);
          }
        }
      }
    } finally {
      setIsSharing(false);
    }
  };


  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleLogout = async () => {
    if (window.confirm("Are you sure you want to log out?")) {
      localStorage.removeItem('active_ride_id');
      await supabase.auth.signOut();
      setProfile(null); // Clear store on logout
      navigate('/', { replace: true });
    }
  };

  return (
    <header style={headerStyle}>
      <div 
        style={{ ...logoContainerStyle, cursor: 'pointer' }} 
        onClick={() => navigate('/home')}
        title="Go to Home"
      >
        <div style={logoIconStyle}><Car size={24} strokeWidth={2.5} /></div>
        <span style={{ fontWeight: '800', fontSize: '22px', color: '#2563eb' }}>
          NexRide
        </span>
      </div>

      <div style={{ position: 'relative' }}>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          style={{ 
            ...pfpButtonStyle, 
            overflow: 'visible',
            border: profile?.is_premium ? '2px solid #fbbf24' : 'none',
            position: 'relative'
          }}
        >
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden' }}>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <User size={22} color="white" />
            )}
          </div>
          {profile?.is_premium && (
            <div style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#fbbf24', borderRadius: '50%', padding: '2px' }}>
              <Crown size={12} color="#000" />
            </div>
          )}
        </motion.button>

        <AnimatePresence>
          {isOpen && (
            <>
              <div style={backdropStyle} onClick={() => setIsOpen(false)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                style={menuCardStyle}
              >
                <div 
                  style={menuHeaderStyle} 
                  onClick={() => { navigate('/profile'); setIsOpen(false); }}
                >
                   <div style={{ 
                     ...largePfpStyle, 
                     borderRadius: '50%', 
                     overflow: 'visible',
                     position: 'relative',
                     border: profile?.is_premium ? '3px solid #fbbf24' : 'none'
                   }}>
                     <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden' }}>
                       {profile?.avatar_url ? (
                         <img src={profile.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                       ) : (
                         <User size={24} color="#2563eb"/>
                       )}
                     </div>
                     {profile?.is_premium && (
                       <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', background: '#fbbf24', borderRadius: '50%', padding: '4px' }}>
                         <Crown size={16} color="#000" />
                       </div>
                     )}
                   </div>
                   <div style={{ flex: 1 }}>
                     <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text-main)' }}>
                       {profile?.full_name || 'User'} 
                     </div>
                     <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                       {profile?.role === 'driver' ? 'Verified Driver' : 'NexRide Rider'}
                     </div>
                   </div>
                   <ChevronRight size={16} color="#cbd5e1" />
                </div>

                <div style={listStyle}>
                  <MenuButton icon={<Trophy size={18}/>} label="Leaderboard" onClick={() => { navigate('/leaderboard'); setIsOpen(false); }} />
                  <MenuButton icon={<CreditCard size={18}/>} label="Payments" onClick={() => navigate('/payments')} />

                  <div style={toggleItemStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {isDarkMode ? <Moon size={18} color="var(--text-main)"/> : <Sun size={18} color="var(--text-main)"/>}
                      <span style={{ color: 'var(--text-main)', fontSize: '14px', fontWeight: '500' }}>Dark Mode</span>
                    </div>
                    <button onClick={toggleDarkMode} style={toggleSwitchStyle(isDarkMode)}>
                      <motion.div animate={{ x: isDarkMode ? 18 : 2 }} style={toggleCircleStyle} />
                    </button>
                  </div>

                  <MenuButton icon={<Crown size={18} color="#eab308"/>} label="NexRide Elite" onClick={() => navigate('/premium')} />
                  
                  <MenuButton 
                    icon={<Users size={18} color="#2563eb"/>} 
                    label="Refer a Friend" 
                    onClick={handleReferral}
                  />

                  <MenuButton icon={<Star size={18}/>} label="Rate App" />
                  <MenuButton icon={<ShieldAlert size={18} color="#ef4444"/>} label="SOS / Safety" />
                  
                  <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: '8px', paddingTop: '8px' }}>
                    <MenuButton 
                      icon={<LogOut size={18} color="#ef4444" />} 
                      label="Log Out" 
                      isDestructive={true}
                      onClick={handleLogout} 
                    />
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
};

const MenuButton = ({ icon, label, onClick, isDestructive }: MenuButtonProps) => {
  return (
    <button 
      onClick={onClick} 
      style={{
        ...menuBtnStyle, 
        color: isDestructive ? '#ef4444' : 'var(--text-main)'
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {icon} <span>{label}</span>
      </span>
    </button>
  );
};

/* --- STYLES --- */
const headerStyle: React.CSSProperties = { 
  position: 'absolute', top: 0, width: '100%', padding: '20px 24px', 
  display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
  zIndex: 1000, boxSizing: 'border-box' 
};

const logoContainerStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '10px' };

const logoIconStyle: React.CSSProperties = { 
  backgroundColor: '#2563eb', color: 'white', padding: '8px', 
  borderRadius: '10px', display: 'flex', justifyContent: 'center', 
  alignItems: 'center', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)' 
};

const pfpButtonStyle: React.CSSProperties = { 
  width: '44px', height: '44px', borderRadius: '50%', 
  backgroundColor: '#0f172a', border: 'none', cursor: 'pointer', 
  display: 'flex', justifyContent: 'center', alignItems: 'center',
  boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
};

const menuCardStyle: React.CSSProperties = { 
  position: 'absolute', top: '55px', right: '0px', width: '260px', 
  borderRadius: '24px', padding: '12px', zIndex: 1001,
  backgroundColor: 'var(--card-bg)',
  border: '1px solid var(--border-subtle)',
  boxShadow: '0 20px 40px rgba(0,0,0,0.15)'
};

const menuHeaderStyle: React.CSSProperties = { 
  display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', 
  cursor: 'pointer', borderRadius: '16px', marginBottom: '8px',
  backgroundColor: 'var(--bg-main)'
};

const largePfpStyle: React.CSSProperties = { 
  width: '40px', height: '40px', borderRadius: '12px', 
  backgroundColor: 'rgba(37, 99, 235, 0.1)', display: 'flex', 
  justifyContent: 'center', alignItems: 'center' 
};

const listStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '2px' };

const menuBtnStyle: React.CSSProperties = { 
  display: 'flex', alignItems: 'center', width: '100%', padding: '10px 12px', 
  border: 'none', background: 'transparent', borderRadius: '12px', 
  cursor: 'pointer', textAlign: 'left', fontSize: '14px', fontWeight: '500' 
};

const toggleItemStyle: React.CSSProperties = { 
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
  padding: '10px 12px', fontSize: '14px', fontWeight: '500' 
};

const toggleSwitchStyle = (isOn: boolean): React.CSSProperties => ({ 
  width: '36px', height: '20px', borderRadius: '20px', 
  backgroundColor: isOn ? '#2563eb' : '#cbd5e1', border: 'none', 
  cursor: 'pointer', position: 'relative', display: 'flex', 
  alignItems: 'center', transition: 'background-color 0.3s ease' 
});

const toggleCircleStyle: React.CSSProperties = { 
  width: '16px', height: '16px', borderRadius: '50%', 
  backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', 
  position: 'absolute' 
};

const backdropStyle: React.CSSProperties = { 
  position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1000 
};

export default Navbar;