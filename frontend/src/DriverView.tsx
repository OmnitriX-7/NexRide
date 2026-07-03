import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, TrendingUp, Clock, Navigation, Search, XOctagon, Power, CarFront, AlertCircle, CheckCircle2, Gauge } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from './supabaseClient';
import { useUserStore } from './store';
import RiderMap from './RiderMap'; 
import IncomingCallModal from './IncomingCallModal'; 
import OutgoingCallModal from './OutgoingCallModal';
import RequestCard from './RequestCard'; 
import SOSModal from './SOSModal'; 
import './RiderView.css'; 

// Removed unused distance function
const DriverView = () => {
  const { showToast, profile } = useUserStore();
  const [isOnline, setIsOnline] = useState(false);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [activeRide, setActiveRide] = useState<any>(null);
  const [completedRide, setCompletedRide] = useState<any>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [currentSpeed, setCurrentSpeed] = useState<number>(0);
  const [weeklyEarnings, setWeeklyEarnings] = useState<any[]>([]);
  const [weeklyHours, setWeeklyHours] = useState<any[]>([]);
  const [driverRating, setDriverRating] = useState<string>('5.0');
  
  // SOS State
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [isEmergencyState, setIsEmergencyState] = useState(false);
  const [showIncomingCall, setShowIncomingCall] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [hasAnsweredSOSCall, setHasAnsweredSOSCall] = useState(false);
  const [showOutgoingPoliceCall, setShowOutgoingPoliceCall] = useState(false);

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
        
        // 1. Fetch active ride if any
        const { data: activeRideData } = await supabase
        .from('ride_dispatches')
        .select('*')
        .eq('driver_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

        if (activeRideData && ['accepted', 'in_progress', 'emergency'].includes(activeRideData.status)) {
          setActiveRide(activeRideData);
          setIsOnline(false);
          if (activeRideData.status === 'emergency') setIsEmergencyState(true);
        } else {
          // 2. No active ride, force offline on startup
          await supabase.from('drivers').update({ status: 'offline' }).eq('id', user.id);
          setIsOnline(false);
        }

        // Fetch driver rating
        const { data: driverProfile } = await supabase.from('drivers').select('rating').eq('id', user.id).single();
        if (driverProfile) setDriverRating(Number(driverProfile.rating || 5.0).toFixed(1));
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
          const { latitude, longitude, speed } = pos.coords;
          setCurrentLocation({ lat: latitude, lng: longitude });
          if (speed !== null && speed >= 0) {
            setCurrentSpeed(Math.round(speed * 3.6)); // Convert m/s to km/h
          } else {
            setCurrentSpeed(0);
          }
          if (driverId) {
            await supabase.from('drivers').update({ 
              lat: latitude, 
              lng: longitude, 
              speed: speed !== null && speed >= 0 ? Math.round(speed * 3.6) : 0 
            }).eq('id', driverId);
          }
        },
        async (err) => {
          console.warn("Geolocation warning:", err.message);
          // Removed hardcoded fallback per user request
        },
        { enableHighAccuracy: false, maximumAge: 0, timeout: 30000 }
      );
    }

    return () => {
      if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
    };
  }, [isOnline, activeRide, driverId]);

  // --- ONLINE HEARTBEAT ---
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (driverId && (isOnline || activeRide)) {
      const ping = async () => {
        await supabase.rpc('log_driver_online_time', { p_driver_id: driverId, p_minutes: 1 });
      };
      
      // Ping every 60 seconds
      intervalId = setInterval(() => {
        ping();
      }, 60000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [driverId, isOnline, activeRide]);

  // --- FETCH WEEKLY EARNINGS ---
  useEffect(() => {
    const fetchEarnings = async () => {
      if (!driverId) return;
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data } = await supabase
        .from('ride_dispatches')
        .select('created_at, fare_amount')
        .eq('driver_id', driverId)
        .eq('status', 'completed')
        .gte('created_at', sevenDaysAgo.toISOString());

      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      // Initialize all days
      const grouped = days.reduce((acc: any, day) => ({ ...acc, [day]: 0 }), {});

      if (data) {
        data.forEach((curr: any) => {
          const dayName = days[new Date(curr.created_at).getDay()];
          grouped[dayName] = (grouped[dayName] || 0) + Number(curr.fare_amount);
        });
      }
      
      const todayIdx = new Date().getDay();
      // Reorder array so today is the last element
      const orderedDays = [];
      for (let i = 6; i >= 0; i--) {
        const d = (todayIdx - i + 7) % 7;
        orderedDays.push(days[d]);
      }

      const chartData = orderedDays.map(day => ({
        name: day,
        earnings: grouped[day]
      }));
      setWeeklyEarnings(chartData);

      // Fetch driver_daily_stats
      const { data: statsData } = await supabase
        .from('driver_daily_stats')
        .select('stat_date, online_minutes')
        .eq('driver_id', driverId)
        .gte('stat_date', sevenDaysAgo.toISOString().split('T')[0]);

      const groupedHours = days.reduce((acc: any, day) => ({ ...acc, [day]: 0 }), {});
      if (statsData) {
        statsData.forEach((curr: any) => {
          const dayName = days[new Date(curr.stat_date).getDay()];
          groupedHours[dayName] = (groupedHours[dayName] || 0) + curr.online_minutes;
        });
      }

      const hoursChartData = orderedDays.map(day => ({
        name: day,
        hours: Number((groupedHours[day] / 60).toFixed(1))
      }));
      setWeeklyHours(hoursChartData);
    };
    fetchEarnings();
  }, [driverId, activeRide, completedRide]);

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
    if (!driverId) return;

    const channel = supabase
      .channel('ride_updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ride_dispatches' },
        (payload) => {
          if (isOnline && payload.new.status === 'pending' && payload.new.driver_id === driverId) {
            setIncomingRequests((prev) => [...prev, payload.new]);
            showToast("New Ride Request Inbound!");
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'ride_dispatches' },
        (payload) => {
          if (['cancelled', 'timeout'].includes(payload.new.status)) {
            setIncomingRequests((prev) => prev.filter(req => req.id !== payload.new.id));
          }

          setActiveRide((prev: any) => {
            if (prev?.id === payload.new.id) {
              if (['cancelled', 'timeout'].includes(payload.new.status)) {
                showToast("Ride was cancelled!");
                return null;
              }
              
              let updated = { ...prev };
              let changed = false;

              if (payload.new.payment_status === 'paid' && prev.payment_status !== 'paid') {
                showToast("Rider has paid!");
                updated.payment_status = 'paid';
                changed = true;
              }

              if (payload.new.status === 'emergency' && prev.status !== 'emergency') {
                setIsEmergencyState(true);
                updated.status = 'emergency';
                changed = true;
              } else if (payload.new.status && payload.new.status !== 'emergency' && prev.status === 'emergency') {
                setIsEmergencyState(false);
                updated.status = payload.new.status;
                changed = true;
              }

              return changed ? updated : prev;
            }
            return prev;
          });
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

    // Bypassed for testing purposes so drivers can complete rides without moving
    // if (currentLocation) {
    //   const dist = getDistanceFromLatLonInKm(currentLocation.lat, currentLocation.lng, activeRide.dest_lat, activeRide.dest_lng);
    //   if (dist > 0.5) {
    //     showToast("You are too far from the destination to complete the ride.");
    //     return;
    //   }
    // }

    if (activeRide.payment_status !== 'paid') {
      showToast("Cannot complete: Waiting for rider to pay.");
      return;
    }

    const { error: dispatchErr } = await supabase
      .from('ride_dispatches')
      .update({ status: 'completed' })
      .eq('id', activeRide.id);
    
    if (dispatchErr) {
      showToast("Error completing ride.");
      return;
    }

    await supabase
      .from('drivers')
      .update({ status: 'available' })
      .eq('id', driverId);

    showToast("Ride successfully completed!");
    setCompletedRide(activeRide);
    setActiveRide(null);
    setIsOnline(false);
  };

  const confirmCancelRideEarly = async () => {
    if (!activeRide?.id || !driverId) return;

    setShowCancelModal(false);

    const { error: dispatchErr } = await supabase
      .from('ride_dispatches')
      .update({ status: 'cancelled' })
      .eq('id', activeRide.id);
    
    if (dispatchErr) {
      showToast("Error cancelling ride.");
      return;
    }

    await supabase
      .from('drivers')
      .update({ status: 'available' })
      .eq('id', driverId);

    showToast("Ride cancelled.");
    setActiveRide(null);
    setIsOnline(true);
  };

  useEffect(() => {
    let interval: any;
    if (activeRide?.id && isOnline) {
      const fetchAndCheckTime = async () => {
        const { data } = await supabase.from('ride_dispatches').select('created_at').eq('id', activeRide.id).maybeSingle();
        if (data?.created_at) {
          let timeStr = data.created_at;
          if (!timeStr.endsWith('Z') && !timeStr.includes('+')) {
            timeStr += 'Z';
          }
          const createdAt = new Date(timeStr).getTime();
          const now = Date.now();
          const diffHours = (now - createdAt) / (1000 * 60 * 60);
          if (diffHours > 12 && !showIncomingCall && !hasAnsweredSOSCall) {
            setShowIncomingCall(true);
          }
        }
      };
      fetchAndCheckTime();
      interval = setInterval(fetchAndCheckTime, 60000);
    }
    return () => clearInterval(interval);
  }, [activeRide?.id, isOnline, showIncomingCall, hasAnsweredSOSCall]);

  return (
    <div className="rider-container">
      <div className="ui-layer">
        
        {/* HEADER / ONLINE TOGGLE */}
        <div className="panel-card" style={{ padding: '2.5rem', marginBottom: '1rem', textAlign: 'center' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '28px', fontWeight: '900', margin: '0 0 8px 0' }}>
              {completedRide ? "Ride Completed" : (activeRide ? "In Trip" : (isOnline ? "You're Online" : "Go Online"))}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
              {completedRide ? "Trip finished successfully" : (activeRide ? "Navigation Active" : (isOnline ? "Scanning for nearby riders..." : "Ready to start earning?"))}
            </p>
          </div>

          {!completedRide && (
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
          )}
        </div>

        {/* INCOMING REQUESTS MOVED TO RIGHT PANEL */}
          {/* INCOMING FAKE CALL OVERLAY */}
      {showIncomingCall && (
        <IncomingCallModal onClose={(accepted) => { 
          setShowIncomingCall(false); 
          if (accepted) setHasAnsweredSOSCall(true); 
        }} />
      )}

      {/* CANCEL RIDE CONFIRMATION MODAL MOVED TO ROOT */}
        {activeRide && !isEmergencyState && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="panel-card" style={{ borderTop: '5px solid #22c55e' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
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
                onClick={() => setShowSOSModal(true)}
                style={{ padding: '6px 12px', backgroundColor: '#fef2f2', color: '#ef4444', borderRadius: '12px', fontWeight: '800', border: '1px solid #fecaca', cursor: 'pointer' }}
              >
                SOS
              </button>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => setShowCancelModal(true)} 
                style={{ flex: 0.3, padding: '16px', backgroundColor: '#fee2e2', color: '#ef4444', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
              >
                <XOctagon size={24} />
              </button>
              <button 
                onClick={finishRide} 
                className="primary-btn" 
                style={{ flex: 1, backgroundColor: activeRide.payment_status === 'paid' ? '#22c55e' : '#cbd5e1' }}
                disabled={activeRide.payment_status !== 'paid'}
              >
                Complete Ride
              </button>
            </div>
          </motion.div>
        )}

        {/* COMPLETED RIDE VIEW */}
        {completedRide && (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ marginTop: '1.5rem', backgroundColor: 'var(--input-bg)', padding: '24px', borderRadius: '24px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '24px' }}>
               <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#10b981', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '16px' }}>
                 <CheckCircle2 size={48} color="white" />
               </div>
               <h3 style={{ fontSize: '28px', fontWeight: '900', margin: 0 }}>₹{completedRide.fare_amount}</h3>
               <p style={{ color: '#10b981', fontWeight: '700', marginTop: '4px' }}>Paid via {completedRide.payment_method || 'Digital Wallet'}</p>
            </div>
            
            <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', marginBottom: '16px' }} />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
               <span style={{ color: 'var(--text-secondary)' }}>From</span>
               <span style={{ fontWeight: '600' }}>{completedRide.pickup_name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
               <span style={{ color: 'var(--text-secondary)' }}>To</span>
               <span style={{ fontWeight: '600' }}>{completedRide.dropoff_name}</span>
            </div>

            <button 
              onClick={() => { setCompletedRide(null); setIsOnline(true); toggleOnlineStatus(); }}
              className="primary-btn" 
              style={{ width: '100%', padding: '16px', backgroundColor: '#2563eb', color: 'white', fontWeight: '700', border: 'none' }}
            >
              Back to Home
            </button>
          </motion.div>
        )}

        {/* STATS GRID & CHART */}
        {!activeRide && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '1rem' }}>
              <StatBox icon={<Star size={16} color="#eab308" />} label={driverRating} sub="Rating" />
              <StatBox icon={<TrendingUp size={16} color="#10b981" />} label={`₹${weeklyEarnings[weeklyEarnings.length - 1]?.earnings || 0}`} sub="Today" />
              <StatBox icon={<Clock size={16} color="#3b82f6" />} label={`${weeklyHours[weeklyHours.length - 1]?.hours || 0}h`} sub="Shift" />
            </div>

            {/* WEEKLY EARNINGS & HOURS CHARTS */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginTop: '1rem' }}>
              <div className="panel-card" style={{ padding: '1.5rem', backgroundColor: 'var(--surface)' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px' }}>Weekly Earnings</h3>
                <div style={{ width: '100%', height: '180px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyEarnings}>
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: 'var(--border-subtle)' }} contentStyle={{ backgroundColor: 'var(--surface)', border: 'none', borderRadius: '8px', color: 'var(--text-primary)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} itemStyle={{ color: '#1f2937' }} formatter={(val: number) => [`₹${val}`, 'Earnings']} />
                      <Bar dataKey="earnings" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="panel-card" style={{ padding: '1.5rem', backgroundColor: 'var(--surface)' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px' }}>Hours Online</h3>
                <div style={{ width: '100%', height: '180px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyHours}>
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: 'var(--border-subtle)' }} contentStyle={{ backgroundColor: 'var(--surface)', border: 'none', borderRadius: '8px', color: 'var(--text-primary)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} itemStyle={{ color: '#1f2937' }} formatter={(val: number) => [`${val}h`, 'Hours Online']} />
                      <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
        <div className="map-layer" style={{ flex: incomingRequests.length > 0 ? 0.5 : 1, transition: 'flex 0.3s ease' }}>
          <RiderMap 
            userLocation={activeRide?.pickup_lat ? { lat: activeRide.pickup_lat, lng: activeRide.pickup_lng } : null} 
            destinationLocation={activeRide?.dest_lat ? { lat: activeRide.dest_lat, lng: activeRide.dest_lng } : null} 
            driverLocation={currentLocation}
            isDarkMode={isDarkMode} 
          />
          <div className="map-gradient-overlay" />
          
          {/* SPEEDOMETER OVERLAY */}
          {isOnline && (
            <div style={{ position: 'absolute', top: '16px', right: '16px', backgroundColor: 'var(--surface)', padding: '12px 16px', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 10, border: '1px solid var(--border-subtle)' }}>
              <Gauge size={24} color="#3b82f6" />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '20px', fontWeight: '900', lineHeight: '1', color: 'var(--text-main)' }}>{currentSpeed}</span>
                <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>km/h</span>
              </div>
            </div>
          )}
        </div>

        {/* INCOMING REQUESTS PANEL */}
        {incomingRequests.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            style={{ 
              flex: 0.5, 
              display: 'flex', 
              flexDirection: 'column', 
              backgroundColor: 'var(--card-bg)', 
              borderRadius: '24px', 
              border: '1px solid var(--border-subtle)', 
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)',
              padding: '24px',
              overflow: 'hidden'
            }}
          >
            <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: '900', color: 'var(--text-main)' }}>
              Incoming Requests ({incomingRequests.length})
            </h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(2, 1fr)', 
              gap: '16px', 
              overflowY: 'auto', 
              paddingRight: '8px',
              alignItems: 'start'
            }}>
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
          </motion.div>
        )}
      </div>

      {/* EMERGENCY STATE OVERLAY */}
      <AnimatePresence>
        {isEmergencyState && activeRide && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(239, 68, 68, 0.95)',
              zIndex: 3000, display: 'flex', flexDirection: 'column',
              justifyContent: 'center', alignItems: 'center', padding: '24px',
              color: 'white', textAlign: 'center', backdropFilter: 'blur(10px)'
            }}
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              style={{ width: '80px', height: '80px', backgroundColor: 'white', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '24px' }}
            >
              <Search size={40} color="#ef4444" />
            </motion.div>
            <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '16px' }}>EMERGENCY SOS</h1>
            <p style={{ fontSize: '18px', opacity: 0.9, marginBottom: '40px', maxWidth: '300px' }}>This ride has been flagged. Help is a tap away.</p>
            <button 
              onClick={() => setShowOutgoingPoliceCall(true)}
              style={{ width: '100%', padding: '20px', borderRadius: '16px', backgroundColor: 'white', color: '#ef4444', fontSize: '20px', fontWeight: '800', border: 'none', marginBottom: '16px', cursor: 'pointer', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}
            >
              CALL POLICE (911)
            </button>
            {profile?.emergency_contact_phone && (
              <a href={`tel:${profile.emergency_contact_phone}`} style={{ textDecoration: 'none', width: '100%', maxWidth: '300px' }}>
                <button style={{ width: '100%', padding: '20px', borderRadius: '16px', backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', fontSize: '18px', fontWeight: '700', border: '2px solid white', marginBottom: '40px', cursor: 'pointer' }}>
                  CALL EMERGENCY CONTACT
                </button>
              </a>
            )}
            <button 
              onClick={async () => {
                await supabase.from('ride_dispatches').update({ status: 'in_progress' }).eq('id', activeRide.id);
                setIsEmergencyState(false);
              }}
              style={{ padding: '16px 32px', borderRadius: '30px', backgroundColor: 'transparent', color: 'white', fontSize: '16px', fontWeight: '600', border: '1px solid rgba(255,255,255,0.4)', cursor: 'pointer' }}
            >
              Mark as Safe / Cancel SOS
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {showSOSModal && activeRide && (
        <SOSModal 
          onClose={() => setShowSOSModal(false)}
          onConfirm={async () => {
            setShowSOSModal(false);
            await supabase.from('ride_dispatches').update({ status: 'emergency' }).eq('id', activeRide.id);
            setIsEmergencyState(true);
          }}
        />
      )}

      {showOutgoingPoliceCall && (
        <OutgoingCallModal onClose={() => setShowOutgoingPoliceCall(false)} />
      )}

      {/* CANCEL RIDE CONFIRMATION MODAL */}
      <AnimatePresence>
        {showCancelModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '24px' }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              style={{ backgroundColor: 'var(--card-bg)', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}
            >
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#fee2e2', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 24px auto' }}>
                <AlertCircle size={32} color="#ef4444" />
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '12px', color: 'var(--text-main)' }}>Cancel Ride?</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '16px', lineHeight: '1.5', marginBottom: '32px' }}>
                Are you sure you want to end this trip early? This will terminate the ride immediately for both you and the rider.
              </p>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => setShowCancelModal(false)}
                  style={{ flex: 1, padding: '16px', borderRadius: '14px', border: '1px solid var(--border-subtle)', backgroundColor: 'transparent', color: 'var(--text-main)', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}
                >
                  No, Keep Driving
                </button>
                <button 
                  onClick={confirmCancelRideEarly}
                  style={{ flex: 1, padding: '16px', borderRadius: '14px', border: 'none', backgroundColor: '#ef4444', color: 'white', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Yes, Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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