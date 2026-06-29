import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from './supabaseClient';
import { Trophy, Medal, MapPin, DollarSign, Star, Car, User as UserIcon, Activity } from 'lucide-react';
import './ProfileDashboard.css'; // Re-use some premium card styles

type LeaderboardMode = 'drivers' | 'riders';
type DriverMetric = 'total_distance' | 'total_rides' | 'total_earned' | 'rating';
type RiderMetric = 'total_rides' | 'total_spent' | 'total_distance';

interface LeaderboardEntry {
  id: string;
  full_name: string;
  avatar_url: string;
  total_distance?: number;
  total_rides?: number;
  total_earned?: number;
  total_spent?: number;
  rating?: number;
}

const Leaderboard = () => {
  const [mode, setMode] = useState<LeaderboardMode>('drivers');
  const [driverMetric, setDriverMetric] = useState<DriverMetric>('total_earned');
  const [riderMetric, setRiderMetric] = useState<RiderMetric>('total_rides');
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const table = mode === 'drivers' ? 'driver_leaderboard' : 'rider_leaderboard';
        const metric = mode === 'drivers' ? driverMetric : riderMetric;
        
        const { data: results, error } = await supabase
          .from(table)
          .select('*')
          .order(metric, { ascending: false })
          .limit(100);

        if (error) throw error;
        setData(results || []);
      } catch (err) {
        console.error("Failed to fetch leaderboard:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [mode, driverMetric, riderMetric]);

  const getMetricDisplay = (entry: LeaderboardEntry) => {
    if (mode === 'drivers') {
      switch (driverMetric) {
        case 'total_distance': return `${entry.total_distance?.toFixed(1) || 0} km`;
        case 'total_rides': return `${entry.total_rides || 0} Rides`;
        case 'total_earned': return `$${entry.total_earned?.toFixed(2) || '0.00'}`;
        case 'rating': return `${entry.rating?.toFixed(2) || '5.00'} ★`;
      }
    } else {
      switch (riderMetric) {
        case 'total_distance': return `${entry.total_distance?.toFixed(1) || 0} km`;
        case 'total_rides': return `${entry.total_rides || 0} Rides`;
        case 'total_spent': return `$${entry.total_spent?.toFixed(2) || '0.00'}`;
      }
    }
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy size={20} color="#eab308" />; // Gold
    if (index === 1) return <Medal size={20} color="#94a3b8" />; // Silver
    if (index === 2) return <Medal size={20} color="#b45309" />; // Bronze
    return <span style={{ fontWeight: 'bold', color: 'var(--text-secondary)' }}>#{index + 1}</span>;
  };

  return (
    <div style={containerStyle}>
      <div style={headerSectionStyle}>
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} style={titleStyle}>
          <Trophy size={28} color="#2563eb" />
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '800' }}>Leaderboards</h1>
        </motion.div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '8px' }}>
          Updated automatically every 24 hours
        </p>

        {/* Mode Toggle */}
        <div style={toggleContainerStyle}>
          <button 
            style={mode === 'drivers' ? activeToggleStyle : inactiveToggleStyle}
            onClick={() => setMode('drivers')}
          >
            <Car size={16} /> Top Drivers
          </button>
          <button 
            style={mode === 'riders' ? activeToggleStyle : inactiveToggleStyle}
            onClick={() => setMode('riders')}
          >
            <UserIcon size={16} /> Top Riders
          </button>
        </div>

        {/* Metric Pills */}
        <div style={pillsContainerStyle}>
          {mode === 'drivers' ? (
            <>
              <MetricPill active={driverMetric === 'total_earned'} onClick={() => setDriverMetric('total_earned')} icon={<DollarSign size={14}/>} label="Highest Earners" />
              <MetricPill active={driverMetric === 'total_rides'} onClick={() => setDriverMetric('total_rides')} icon={<Activity size={14}/>} label="Most Rides" />
              <MetricPill active={driverMetric === 'total_distance'} onClick={() => setDriverMetric('total_distance')} icon={<MapPin size={14}/>} label="Max Distance" />
              <MetricPill active={driverMetric === 'rating'} onClick={() => setDriverMetric('rating')} icon={<Star size={14}/>} label="Top Rated" />
            </>
          ) : (
            <>
              <MetricPill active={riderMetric === 'total_rides'} onClick={() => setRiderMetric('total_rides')} icon={<Activity size={14}/>} label="Most Rides" />
              <MetricPill active={riderMetric === 'total_spent'} onClick={() => setRiderMetric('total_spent')} icon={<DollarSign size={14}/>} label="Highest Spenders" />
              <MetricPill active={riderMetric === 'total_distance'} onClick={() => setRiderMetric('total_distance')} icon={<MapPin size={14}/>} label="Max Distance" />
            </>
          )}
        </div>
      </div>

      <div style={listSectionStyle}>
        {loading ? (
          <div style={loadingStyle}>
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
              <Trophy size={32} color="#2563eb" opacity={0.5} />
            </motion.div>
            <p>Loading rankings...</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {data.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={loadingStyle}>
                <p>No data available yet.</p>
              </motion.div>
            ) : (
              data.map((entry, idx) => (
                <motion.div
                  key={entry.id + mode}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.05 }}
                  style={{...cardStyle, border: idx < 3 ? '1px solid rgba(37, 99, 235, 0.3)' : '1px solid var(--border-subtle)'}}
                >
                  <div style={rankStyle}>
                    {getRankIcon(idx)}
                  </div>
                  
                  <div style={avatarContainerStyle}>
                    {entry.avatar_url ? (
                      <img src={entry.avatar_url} alt={entry.full_name} style={avatarStyle} />
                    ) : (
                      <div style={placeholderAvatarStyle}><UserIcon size={20} color="#cbd5e1" /></div>
                    )}
                  </div>

                  <div style={nameStyle}>
                    {entry.full_name || 'Anonymous'}
                  </div>

                  <div style={metricValueStyle}>
                    {getMetricDisplay(entry)}
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

// Sub-components & Styles
const MetricPill = ({ active, onClick, icon, label }: any) => (
  <button 
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', gap: '6px',
      padding: '8px 16px', borderRadius: '20px', border: 'none',
      fontSize: '13px', fontWeight: '600', cursor: 'pointer',
      backgroundColor: active ? '#2563eb' : 'var(--bg-main)',
      color: active ? 'white' : 'var(--text-secondary)',
      transition: 'all 0.2s',
      boxShadow: active ? '0 4px 12px rgba(37, 99, 235, 0.3)' : 'none'
    }}
  >
    {icon} {label}
  </button>
);

const containerStyle: React.CSSProperties = {
  paddingTop: '80px',
  minHeight: '100vh',
  backgroundColor: 'var(--bg-main)',
  display: 'flex',
  flexDirection: 'column',
};

const headerSectionStyle: React.CSSProperties = {
  padding: '0 24px 16px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  backgroundColor: 'var(--card-bg)',
  borderBottom: '1px solid var(--border-subtle)',
  boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
  position: 'sticky',
  top: '70px',
  zIndex: 10,
};

const titleStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  color: 'var(--text-main)',
};

const toggleContainerStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  backgroundColor: 'var(--bg-main)',
  padding: '4px',
  borderRadius: '12px',
  marginTop: '20px',
  width: '100%',
  maxWidth: '400px',
};

const baseToggleStyle: React.CSSProperties = {
  flex: 1,
  padding: '10px',
  borderRadius: '8px',
  border: 'none',
  fontSize: '14px',
  fontWeight: '700',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  transition: 'all 0.3s'
};

const activeToggleStyle: React.CSSProperties = {
  ...baseToggleStyle,
  backgroundColor: 'var(--card-bg)',
  color: 'var(--text-main)',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
};

const inactiveToggleStyle: React.CSSProperties = {
  ...baseToggleStyle,
  backgroundColor: 'transparent',
  color: 'var(--text-secondary)'
};

const pillsContainerStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  marginTop: '20px',
  width: '100%',
  overflowX: 'auto',
  paddingBottom: '8px',
  WebkitOverflowScrolling: 'touch',
};

const listSectionStyle: React.CSSProperties = {
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  maxWidth: '600px',
  margin: '0 auto',
  width: '100%'
};

const cardStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '16px',
  backgroundColor: 'var(--card-bg)',
  borderRadius: '16px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
  gap: '16px'
};

const rankStyle: React.CSSProperties = {
  width: '30px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center'
};

const avatarContainerStyle: React.CSSProperties = {
  width: '48px',
  height: '48px',
  borderRadius: '50%',
  overflow: 'hidden',
  flexShrink: 0
};

const avatarStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover'
};

const placeholderAvatarStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  backgroundColor: 'var(--bg-main)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center'
};

const nameStyle: React.CSSProperties = {
  flex: 1,
  fontSize: '16px',
  fontWeight: '700',
  color: 'var(--text-main)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis'
};

const metricValueStyle: React.CSSProperties = {
  fontSize: '15px',
  fontWeight: '800',
  color: '#2563eb'
};

const loadingStyle: React.CSSProperties = {
  padding: '40px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '16px',
  color: 'var(--text-secondary)'
};

export default Leaderboard;
