import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Power, Star, TrendingUp, Navigation, CarFront, Clock } from 'lucide-react';
import { supabase } from './supabaseClient';
import { useUserStore } from './store';
import RiderMap from './RiderMap'; 
import RequestCard from './RequestCard'; 
import './RiderView.css'; 

const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const DriverView = () => {
  const { showToast, setProfile } = useUserStore();
  const [isOnline, setIsOnline] = useState(false);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [activeRide, setActiveRide] = useState<any>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);

  // --- 1. THEME SYNC ---
  useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains('dark'));
    const observer = new MutationObserver(() => setIsDarkMode(document.documentElement.classList.contains('dark')));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // --- 2. INITIALIZE DRIVER ---
  useEffect(() => {
    const initDriver = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setDriverId(user.id);
        const { data: driverData } = await supabase.from('drivers').select('status').eq('id', user.id).maybeSingle();
        
        if (driverData?.status === 'busy') {
          const { data: rideData } = await supabase
            .from('ride_dispatches')
            .select('*')
            .eq('driver_id', user.id)
            .eq('status', 'accepted')
            .maybeSingle();
          
          if (rideData) {
            setActiveRide(rideData);
            setIsOnline(false);
          }
        } else {
          // Default to offline on fresh login for safety
          await supabase.from('drivers').update({ status: 'offline' }).eq('id', user.id);
          setIsOnline(false);
        }
      }
    };
    initDriver();
  }, []);

  // --- 3. GPS HEARTBEAT ---
  useEffect(() => {
    let watchId: number;
    
    if ((isOnline || activeRide) && driverId && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          setCurrentLocation({ lat: latitude, lng: longitude });
          if (driverId) {
            await supabase.from('drivers').update({ lat: latitude, lng: longitude }).eq('id', driverId);
          }
        },
        (err) => console.warn(err.message),
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
      );
    }

    return () => {
      if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
    };
  }, [isOnline, activeRide, driverId]);

  // --- 4. TOGGLE ONLINE STATUS ---
  const toggleOnlineStatus = async () => {
    if (!driverId || activeRide) return;
    const newStatus = !isOnline ? 'available' : 'offline';
    const { error } = await supabase.from('drivers').update({ status: newStatus }).eq('id', driverId);
    if (!error) {
      setIsOnline(!isOnline);
      showToast(newStatus === 'available' ? "You are now Online" : "You are now Offline");
    }
  };

  // --- 5. REAL-TIME REQUEST LISTENER ---
  useEffect(() => {
    if (!driverId || !isOnline) {
      setIncomingRequests([]);
      return;
    }

    const channel = supabase
      .channel('ride_requests')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ride_dispatches' },
        (payload) => {
          console.log("New Dispatch Event:", payload);
          // Filter logic moved inside to ensure reliability
          if (payload.new.status === 'pending' && payload.new.driver_id === driverId) {
            setIncomingRequests((prev) => [...prev, payload.new]);
            showToast("New Ride Request Inbound!");
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'ride_dispatches' },
        (payload) => {
          if (payload.new.driver_id === driverId) {
            if (['cancelled', 'timeout'].includes(payload.new.status)) {
              setIncomingRequests((prev) => prev.filter(req => req.id !== payload.new.id));
              setActiveRide((prev: any) => prev?.id === payload.new.id ? null : prev);
            }
            if (payload.new.payment_status === 'paid') {
              setActiveRide((prev: any) => {
                if (prev?.id === payload.new.id && prev.payment_status !== 'paid') {
                  showToast("Rider has paid!");
                  return { ...prev, payment_status: 'paid' };
                }
                return prev;
              });
            }
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [driverId, isOnline]);

  const handleResponse = async (request: any, status: 'accepted' | 'rejected') => {
    setIncomingRequests((prev) => prev.filter(req => req.id !== request.id));
    
    const { error } = await supabase
      .from('ride_dispatches')
      .update({ status })
      .eq('id', request.id);

    if (!error && status === 'accepted') {
      await supabase.from('drivers').update({ status: 'busy' }).eq('id', driverId);
      setActiveRide(request);
      setIsOnline(false); 
      showToast("Trip Accepted!");
    } else if (error) {
      console.error("Response Error:", error);
      showToast("Failed to respond to request.");
    }
  };

  const finishRide = async () => {
    if (!activeRide?.id || !driverId) return;

    // Basic proximity check before allowing "Complete Ride"
    if (currentLocation) {
      const dist = getDistanceFromLatLonInKm(currentLocation.lat, currentLocation.lng, activeRide.dest_lat, activeRide.dest_lng);
      if (dist > 0.5) { // 500 meters
        showToast("You are too far from the destination to complete the ride.");
        return;
      }
    }

    if (activeRide.payment_status !== 'paid') {
      showToast("Cannot complete: Waiting for rider to pay.");
      return;
    }

    // 1. Update Trip Status
    const { error: dispatchErr } = await supabase
      .from('ride_dispatches')
      .update({ status: 'completed' })
      .eq('id', activeRide.id);

    if (dispatchErr) {
      console.error("Database Error:", dispatchErr);
      // If you see this toast, the SQL Check Constraint or RLS is still the issue
      showToast(`Error: ${dispatchErr.message}`);
      return;
    }

    // 2. Reset Driver Availability
    const { error: driverErr } = await supabase
      .from('drivers')
      .update({ status: 'available' })
      .eq('id', driverId);

    if (!driverErr) {
      // Re-fetch profile to sync XP and Level updates from the database
      const { data: pData } = await supabase.from('profiles').select('*').eq('id', driverId).single();
      if (pData) setProfile(pData);

      setActiveRide(null);
      setIsOnline(true);
      showToast("Trip completed! You are back online.");
    }
  };

  return (
    <div className="rider-container">
      <div className="ui-layer">
        
        {/* BIG STATUS CARD */}
        <div className="panel-card" style={{ padding: '2.5rem', marginBottom: '1rem', textAlign: 'center' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '28px', fontWeight: '900', margin: '0 0 8px 0' }}>
              {activeRide ? "In Trip" : (isOnline ? "You're Online" : "Go Online")}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
              {activeRide ? "Navigation Active" : (isOnline ? "Scanning for nearby riders..." : "Ready to start earning?")}
            </p>
          </div>

          <div style={{ position: 'relative', display: 'inline-block' }}>
            <AnimatePresence>
              {isOnline && !activeRide && (
                <motion.div 
                  initial={{ scale: 1, opacity: 0.5 }} 
                  animate={{ scale: 1.8, opacity: 0 }} 
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: '50%', backgroundColor: '#10b981', zIndex: 0 }}
                />
              )}
            </AnimatePresence>
            
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleOnlineStatus} 
              disabled={!!activeRide}
              style={{
                width: '100px', height: '100px', borderRadius: '50%',
                backgroundColor: activeRide ? '#3b82f6' : (isOnline ? '#10b981' : '#334155'),
                color: 'white', border: 'none', cursor: activeRide ? 'not-allowed' : 'pointer',
                display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', zIndex: 1,
                boxShadow: isOnline ? '0 10px 25px rgba(16, 185, 129, 0.4)' : '0 4px 12px rgba(0,0,0,0.1)'
              }}
            >
              {activeRide ? <CarFront size={40} /> : <Power size={40} />}
            </motion.button>
          </div>
        </div>

        {/* REQUESTS QUEUE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <AnimatePresence>
            {incomingRequests.map((req) => (
              <RequestCard 
                key={req.id} 
                request={req} 
                handleResponse={handleResponse} 
                driverLocation={currentLocation}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* ACTIVE TRIP PANEL */}
        {activeRide && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="panel-card" style={{ borderTop: '5px solid #22c55e' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ padding: '10px', backgroundColor: 'rgba(34, 197, 94, 0.1)', borderRadius: '12px' }}>
                <Navigation size={24} color="#22c55e" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h4 style={{ margin: 0 }}>On Trip • ₹{activeRide.fare_amount}</h4>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>Destination: {activeRide.dropoff_name}</p>
                {activeRide.payment_status === 'paid' ? (
                  <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 'bold' }}>Payment Received</span>
                ) : (
                  <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 'bold' }}>Waiting for Payment...</span>
                )}
              </div>
            </div>
            <button 
              onClick={finishRide} 
              className="primary-btn" 
              style={{ backgroundColor: activeRide.payment_status === 'paid' ? '#22c55e' : '#cbd5e1' }}
              disabled={activeRide.payment_status !== 'paid'}
            >
              Complete Ride
            </button>
          </motion.div>
        )}

        {/* STATS GRID */}
        {!activeRide && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '1rem' }}>
            <StatBox icon={<Star size={16} color="#eab308" />} label="4.9" sub="Rating" />
            <StatBox icon={<TrendingUp size={16} color="#10b981" />} label="₹1,240" sub="Today" />
            <StatBox icon={<Clock size={16} color="#3b82f6" />} label="3h" sub="Shift" />
          </div>
        )}
      </div>

      <div className="map-layer">
        <RiderMap 
          userLocation={activeRide ? { lat: activeRide.pickup_lat, lng: activeRide.pickup_lng } : currentLocation} 
          destinationLocation={activeRide ? { lat: activeRide.dest_lat, lng: activeRide.dest_lng } : null}
          isDarkMode={isDarkMode}
        />
        <div className="map-gradient-overlay" />
      </div>
    </div>
  );
};

const StatBox = ({ icon, label, sub }: any) => (
  <div className="panel-card" style={{ padding: '12px', textAlign: 'center' }}>
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '4px' }}>{icon}</div>
    <div style={{ fontWeight: '900', fontSize: '16px' }}>{label}</div>
    <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{sub}</div>
  </div>
);

export default DriverView;