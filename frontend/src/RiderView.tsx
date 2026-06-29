import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Circle, MapPin, Search, Star, CarFront, ArrowUpDown, X, CheckCircle2, IndianRupee } from 'lucide-react';
import { supabase } from './supabaseClient';
import { useUserStore } from './store';
import RiderMap from './RiderMap';
import './RiderView.css'; 

const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const RiderView = () => {
  const { showToast, setProfile } = useUserStore();

  // --- CORE STATES ---
  const [isRestoring, setIsRestoring] = useState(true); // NEW: Prevents UI flicker on refresh
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [step, setStep] = useState(1); 
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [currentDispatchId, setCurrentDispatchId] = useState<string | null>(null);
  const [availableDrivers, setAvailableDrivers] = useState<any[]>([]);
  const [isRequesting, setIsRequesting] = useState(false);
  const [activeCoupon, setActiveCoupon] = useState<any>(null);
  const [liveDriverCoords, setLiveDriverCoords] = useState<{lat: number; lng: number} | null>(null);
  const [finalFare, setFinalFare] = useState<number | null>(null);

  // --- LOCATION STATES ---
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [pickupLat, setPickupLat] = useState<number | null>(null);
  const [pickupLng, setPickupLng] = useState<number | null>(null);
  const [destLat, setDestLat] = useState<number | null>(null);
  const [destLng, setDestLng] = useState<number | null>(null);
  const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<any[]>([]);
  const [activeField, setActiveField] = useState<'pickup' | 'destination' | null>(null);

  // --- SORTING STATES ---
  const [sortBy, setSortBy] = useState<'distance' | 'fare' | 'rating'>('distance');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // --- THEME SYNC ---
  useEffect(() => {
    const updateDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };

    updateDarkMode();

    const observer = new MutationObserver(() => {
      updateDarkMode();
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => {
      observer.disconnect();
    };
  }, []);

  // --- MOUNT SYNC & RESTORE (The Refresh Fix) ---
  useEffect(() => {
    const syncActiveState = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsRestoring(false);
        return;
      }

      const { data } = await supabase
        .from('ride_dispatches')
        .select('*, driver:drivers(*)')
        .eq('rider_id', user.id)
        .in('status', ['pending', 'accepted'])
        .maybeSingle();

      if (data) {
        setCurrentDispatchId(data.id);
        setSelectedDriver(data.driver);
        setPickup(data.pickup_name);
        setDestination(data.dropoff_name);
        setPickupLat(data.pickup_lat);
        setPickupLng(data.pickup_lng);
        setDestLat(data.dest_lat);
        setDestLng(data.dest_lng);
        setFinalFare(data.fare_amount);

        // Bookmark the ID in local storage
        localStorage.setItem('active_ride_id', data.id);

        if (data.status === 'pending') setStep(3);
        if (data.status === 'accepted') setStep(4);
      } else {
        // Clean up if no active ride
        localStorage.removeItem('active_ride_id');
        setStep(1);
      }
      
      setIsRestoring(false); // ALWAYS turn off loading spinner
    };
    syncActiveState();
  }, []);

  // --- LOCATION AUTOCOMPLETE ---
  useEffect(() => {
    const fetchLandmarks = async (query: string, setter: React.Dispatch<React.SetStateAction<any[]>>) => {
      if (query.trim().length < 2) { 
        setter([]); 
        return; 
      }
      try {
        const silLat = 24.7577, silLon = 92.7923; // NIT Silchar coords
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&lat=${silLat}&lon=${silLon}&limit=5`;
        const res = await fetch(url, {
          method: 'GET',
          mode: 'cors',
          credentials: 'omit',
          headers: { 'Accept': 'application/json' }
        });
        const data = await res.json();
        
        const formatted = data.features.map((f: any, index: number) => ({
          // Combine OSM ID, type, and index to ensure absolute uniqueness
          id: `${f.properties.osm_id || 'item'}-${f.properties.osm_type || ''}-${index}`,
          name: f.properties.name || f.properties.street || "Unknown Place",
          fullName: [f.properties.name, f.properties.city, f.properties.state].filter(Boolean).join(", "),
          lat: f.geometry.coordinates[1],
          lng: f.geometry.coordinates[0]
        }));
        setter(formatted);
      } catch (error) {
        console.error("Photon API Error:", error);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      if (activeField === 'pickup') fetchLandmarks(pickup, setPickupSuggestions);
      if (activeField === 'destination') fetchLandmarks(destination, setDestSuggestions);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [pickup, destination, activeField]);

  // --- ROAD DISTANCE API ---
  const fetchRoadDistance = async (lat1: number, lon1: number, lat2: number, lon2: number) => {
    try {
      const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`);
      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        return data.routes[0].distance / 1000;
      }
    } catch (e) {
      console.error("Road Distance Error:", e);
    }
    return getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2);
  };

  // --- FIND DRIVERS ---
  const handleSearchClick = async () => {
    if (!pickupLat || !pickupLng || !destLat || !destLng) {
      showToast("Please select valid locations from the suggestions.");
      return;
    }

    setStep(2);
    setAvailableDrivers([]);
    
    const { data: { user } } = await supabase.auth.getUser();
    let bestCoupon = null;

    if (user) {
      const { data: coupons } = await supabase
        .from('coupons')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_used', false)
        .order('discount_percent', { ascending: false })
        .limit(1);
        
      if (coupons && coupons.length > 0) {
        bestCoupon = coupons[0];
        setActiveCoupon(bestCoupon);
      }
    }

    const { data, error } = await supabase.rpc('get_nearby_drivers', {
      rider_lat: pickupLat,
      rider_lng: pickupLng,
      radius_km: 5.0
    });

    if (error) {
      showToast("Error finding drivers.");
      setStep(1);
    } else if (data) {
      const tripDistance = await fetchRoadDistance(pickupLat, pickupLng, destLat, destLng);
      
      const formattedDrivers = data.map((d: any) => {
        const baseAppFee = 10;
        const pickupCost = d.distance * 5;
        const tripCost = tripDistance * d.fare;
        const ratingBonus = Math.max(0, (d.rating - 4.0) * 5);
        const calculatedOriginalFare = Math.round(baseAppFee + pickupCost + tripCost + ratingBonus);
        const finalFare = bestCoupon ? Math.round(calculatedOriginalFare * (1 - bestCoupon.discount_percent / 100)) : calculatedOriginalFare;

        return {
          ...d,
          distance: parseFloat(d.distance.toFixed(2)),
          originalFare: calculatedOriginalFare,
          fare: finalFare,
          pfp: d.name ? d.name.substring(0, 2).toUpperCase() : 'DR'
        };
      });
      setAvailableDrivers(formattedDrivers);
    }
  };

  // --- REQUEST RIDE ---
  const handleRequestRide = async (driver: any) => {
    setIsRequesting(true);
    setSelectedDriver(driver);
    setFinalFare(driver.fare);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { 
      showToast("Error: Not logged in."); 
      setIsRequesting(false);
      return; 
    }

    const { data, error } = await supabase
      .from('ride_dispatches')
      .insert({
        rider_id: user.id,
        driver_id: driver.id,
        pickup_name: pickup,
        dropoff_name: destination,
        pickup_lat: pickupLat,
        pickup_lng: pickupLng,
        dest_lat: destLat,
        dest_lng: destLng,
        fare_amount: driver.fare, 
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      showToast("Failed to request ride.");
      setIsRequesting(false);
    } else {
      setCurrentDispatchId(data.id); // Ensure currentDispatchId is set on success
      localStorage.setItem('active_ride_id', data.id); // Save to local storage
      setStep(3);
      setIsRequesting(false);
    }
  };

  // --- CANCEL RIDE ---
  const handleCancelRequest = async () => {
    if (currentDispatchId) {
      await supabase.from('ride_dispatches').update({ status: 'cancelled' }).eq('id', currentDispatchId);
      setCurrentDispatchId(null);
      localStorage.removeItem('active_ride_id');
      setSelectedDriver(null); // Clear selected driver on cancel
    }
    setStep(2);
  };

  // --- MASTER REAL-TIME SUBSCRIPTION ---
  useEffect(() => {
    if (!currentDispatchId) return;

    const dispatchSubscription = supabase
      .channel(`dispatch_${currentDispatchId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'ride_dispatches', filter: `id=eq.${currentDispatchId}` },
        (payload) => {
          const newStatus = payload.new.status;
          
          if (newStatus === 'accepted') {
            setStep(4);
            showToast("Driver accepted your ride!");
          } else if (newStatus === 'rejected') {
            showToast("Driver declined. Try another.");
            setStep(2);
            setCurrentDispatchId(null);
            localStorage.removeItem('active_ride_id');
          } else if (newStatus === 'completed') {
            setStep(5);
            localStorage.removeItem('active_ride_id'); // Ride is over, wipe memory

            // Re-fetch profile to sync XP and Level updates from the database
            supabase.auth.getUser().then(({ data: { user } }) => {
              if (user) {
                supabase.from('profiles').select('*').eq('id', user.id).single()
                  .then(({ data: pData }) => { if (pData) setProfile(pData); });
              }
            });
          } else if (newStatus === 'cancelled' || newStatus === 'timeout') {
            setStep(1);
            setCurrentDispatchId(null);
            localStorage.removeItem('active_ride_id');
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(dispatchSubscription); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDispatchId, showToast]);

  // --- LIVE GPS TRACKING ---
  useEffect(() => {
    if (step === 4 && selectedDriver?.id) {
      const carTracker = supabase
        .channel(`live_track_${selectedDriver.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'drivers', filter: `id=eq.${selectedDriver.id}` },
          (payload) => {
            setLiveDriverCoords({ lat: payload.new.lat, lng: payload.new.lng });
          }
        )
        .subscribe();
      return () => { supabase.removeChannel(carTracker); };
    }
  }, [step, selectedDriver]);

  // --- UI RESET ---
  const resetRiderUI = () => {
    localStorage.removeItem('active_ride_id');
    setStep(1);
    setPickup('');
    setDestination('');
    setPickupLat(null);
    setPickupLng(null);
    setDestLat(null);
    setDestLng(null);
    setSelectedDriver(null);
    setCurrentDispatchId(null);
    setLiveDriverCoords(null);
    setFinalFare(null);
  };

  // --- UTILS ---
  const sortedDrivers = useMemo(() => {
    return [...availableDrivers].sort((a, b) => {
      const modifier = sortOrder === 'asc' ? 1 : -1;
      if (a[sortBy] < b[sortBy]) return -1 * modifier;
      if (a[sortBy] > b[sortBy]) return 1 * modifier;
      return 0;
    });
  }, [availableDrivers, sortBy, sortOrder]);

  const handleSelect = (item: any, type: 'pickup' | 'destination') => {
    if (type === 'pickup') { 
      setPickup(item.name); 
      setPickupLat(item.lat);
      setPickupLng(item.lng);
      setPickupSuggestions([]); 
    } else { 
      setDestination(item.name); 
      setDestLat(item.lat);
      setDestLng(item.lng);
      setDestSuggestions([]); 
    }
    setActiveField(null);
  };

  const activeUserLocation = pickupLat && pickupLng ? { lat: pickupLat, lng: pickupLng } : null;

  return (
    <div className="rider-container">
      <div className="ui-layer">
        {isRestoring ? (
          // --- LOADING SCREEN (Shown briefly on refresh) ---
          <div className="panel-card status-panel" style={{ padding: '2rem', textAlign: 'center' }}>
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} style={{ display: 'inline-block', marginBottom: '1rem' }}>
              <Search size={32} color="#2563eb" />
            </motion.div>
            <h3>Restoring Session...</h3>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {/* STEP 1: SEARCH */}
            {step === 1 && (
              <motion.div key="search" initial={{ y: '10%' }} animate={{ y: 0 }} exit={{ y: '10%' }} className="panel-card search-panel">
                <div className="panel-header">
                  <h2>Where to?</h2>
                  <p>Select your location for Shyft</p>
                </div>
                <div className="form-group">
                  <div className="input-wrapper">
                    <Circle className="input-icon" size={10} strokeWidth={3} />
                    <input id="pickup-input" name="pickup" placeholder="Pick up Location" value={pickup} onFocus={() => setActiveField('pickup')} onChange={(e) => setPickup(e.target.value)} className="location-input" />
                  </div>
                  {activeField === 'pickup' && pickupSuggestions.length > 0 && (
                    <div className="suggestions-dropdown">
                      {pickupSuggestions.map((item) => (
                        <div key={item.id} className="suggestion-item" onClick={() => handleSelect(item, 'pickup')}>
                          <MapPin className="suggestion-icon" size={16} /> 
                          <div className="suggestion-text">
                            <span className="suggestion-title">{item.name}</span>
                            <span className="suggestion-subtitle">{item.fullName}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="input-connector-line" />
                  <div className="input-wrapper">
                    <MapPin className="input-icon" size={18} strokeWidth={2.5} />
                    <input id="destination-input" name="destination" placeholder="Enter Destination" value={destination} onFocus={() => setActiveField('destination')} onChange={(e) => setDestination(e.target.value)} className="location-input" />
                  </div>
                  {activeField === 'destination' && destSuggestions.length > 0 && (
                    <div className="suggestions-dropdown">
                      {destSuggestions.map((item) => (
                        <div key={item.id} className="suggestion-item" onClick={() => handleSelect(item, 'destination')}>
                          <MapPin className="suggestion-icon" size={16} /> 
                          <div className="suggestion-text">
                            <span className="suggestion-title">{item.name}</span>
                            <span className="suggestion-subtitle">{item.fullName}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={handleSearchClick} className="primary-btn search-btn" disabled={!pickupLat || !destLat}>
                  <Search size={18} className="btn-icon" /> Find Drivers
                </button>
              </motion.div>
            )}

            {/* STEP 2: DRIVER LIST */}
            {step === 2 && (
              <motion.div key="drivers" initial={{ y: '10%' }} animate={{ y: 0 }} exit={{ y: '10%' }} className="panel-card drivers-panel">
                <button 
                  onClick={() => setStep(1)} 
                  className="back-btn"
                  style={{ 
                    display: 'block', 
                    margin: '0 auto 1.5rem 0', // Shifts it to the left with some bottom spacing
                    textAlign: 'left'
                  }}
                >← Back</button>
                <div className="drivers-header">
                  <div className="header-titles">
                    <h2>{availableDrivers.length > 0 ? `${availableDrivers.length} Near You` : 'Scanning...'}</h2>
                    {activeCoupon && <p className="coupon-text">✓ {activeCoupon.discount_percent}% Discount Applied</p>}
                  </div>
                  <div className="sort-controls">
                    {['distance', 'fare', 'rating'].map(opt => (
                      <button key={opt} onClick={() => setSortBy(opt as any)} className={`sort-btn ${sortBy === opt ? 'active' : ''}`}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</button>
                    ))}
                    <div className="sort-divider" />
                    <button onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')} className="sort-direction-btn">
                      <ArrowUpDown size={14} className={sortOrder === 'desc' ? 'rotate-180' : ''} />
                    </button>
                  </div>
                </div>
                <div className="driver-list">
                  {sortedDrivers.map((driver) => (
                    <div key={driver.id} className={`driver-card ${activeCoupon ? 'has-coupon' : ''}`}>
                      {activeCoupon && <div className="coupon-badge">{activeCoupon.discount_percent}% OFF</div>}
                      <div className="driver-avatar"><CarFront size={24} /></div>
                      <div className="driver-info">
                        <div className="driver-name-row">
                          <h4>{driver.name}</h4>
                          <div className="driver-rating"><Star size={10} className="star-icon" /> <span>{driver.rating}</span></div>
                        </div>
                        <p className="driver-vehicle">{driver.vehicle}</p>
                        <p className="driver-distance">{driver.distance} km away</p>
                      </div>
                      <div className="driver-actions">
                        <div className="fare-display">
                          {activeCoupon && <span className="original-fare">₹{driver.originalFare}</span>}
                          <span className="final-fare">₹{driver.fare}</span>
                        </div>
                        <button onClick={() => handleRequestRide(driver)} disabled={isRequesting} className={`request-btn ${isRequesting && selectedDriver?.id !== driver.id ? 'disabled' : ''}`}>
                          {isRequesting && selectedDriver?.id === driver.id ? '...' : 'Request'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* STEP 3: WAITING FOR ACCEPTANCE */}
            {step === 3 && (
              <motion.div key="waiting" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="panel-card status-panel">
                <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }} className="radar-animation">
                  <Search size={32} className="radar-icon" />
                </motion.div>
                <h2>Requesting {selectedDriver?.name}...</h2>
                <p>Waiting for driver to accept.</p>
                <button onClick={handleCancelRequest} className="cancel-btn">
                  <X size={16} /> Cancel Request
                </button>
              </motion.div>
            )}

            {/* STEP 4: RIDE IN PROGRESS */}
            {step === 4 && (
              <motion.div key="accepted" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="panel-card status-panel">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }} className="success-icon-wrapper">
                  <CheckCircle2 size={40} className="success-icon" />
                </motion.div>
                <h2>Ride in Progress</h2>
                <p><b>{selectedDriver?.name}</b> is heading to <b>{destination}</b>.</p>
              </motion.div>
            )}

            {/* STEP 5: TRIP COMPLETED & RECEIPT */}
            {step === 5 && (
              <motion.div key="finished" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="panel-card status-panel">
                 <motion.div initial={{ y: -20 }} animate={{ y: 0 }} style={{ marginBottom: '1.5rem' }}>
                    <CheckCircle2 size={60} color="#10b981" />
                 </motion.div>
                 <h2 style={{ fontSize: '24px', fontWeight: '900' }}>Ride Completed!</h2>
                 <p style={{ color: 'var(--text-secondary)' }}>You've arrived at <b>{destination}</b> safely.</p>
                 
                 {/* Receipt Box */}
                 <div style={{ 
                   backgroundColor: 'var(--input-bg)', 
                   padding: '24px', 
                   borderRadius: '20px', 
                   margin: '24px 0', 
                   width: '100%',
                   border: '1px solid var(--border-subtle)',
                   boxSizing: 'border-box'
                 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: '600', fontSize: '15px' }}>Total Paid</span>
                      <span style={{ fontWeight: '900', fontSize: '26px', display: 'flex', alignItems: 'center', color: '#10b981', gap: '4px' }}>
                        <IndianRupee size={20} /> {finalFare}
                      </span>
                    </div>
                    
                    {/* Divider */}
                    <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '16px 0' }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: '600', fontSize: '15px' }}>Driver</span>
                      <span style={{ fontWeight: '800', fontSize: '18px', color: 'var(--text-main)' }}>
                        {selectedDriver?.name}
                      </span>
                    </div>
                 </div>

                 {/* High-Contrast Reset Button */}
                 <button 
                  onClick={resetRiderUI} 
                  className="primary-btn" 
                  style={{ backgroundColor: '#2563eb', color: '#ffffff', border: 'none', width: '100%', padding: '16px', fontWeight: '700' }}
                 >
                  Back to Search
                 </button>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
      
      {/* MAP BACKGROUND */}
      <div className="map-layer">
        <RiderMap 
          userLocation={activeUserLocation} 
          destinationLocation={destLat && destLng ? { lat: destLat, lng: destLng } : null}
          driverLocation={liveDriverCoords || (selectedDriver ? { lat: selectedDriver.lat, lng: selectedDriver.lng } : null)}
          isDarkMode={isDarkMode}
        />
        <div className="map-gradient-overlay" />
      </div>
    </div>
  );
};

export default RiderView;