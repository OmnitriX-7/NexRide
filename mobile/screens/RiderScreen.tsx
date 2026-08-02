import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity, 
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, FlatList, ScrollView, Image
} from 'react-native';
import { MapPin, Search, CarFront, CheckCircle2, AlertTriangle, Circle, ArrowUpDown, Star, IndianRupee, Gauge, X, AlertCircle, LocateFixed } from 'lucide-react-native';
import { supabase } from '../supabaseClient';
import { VEHICLE_MODELS } from '../utils/vehicles';
import { useUserStore } from '../store';
import { useTheme } from '../theme';
import WebViewMap from '../components/WebViewMap';
import SOSModal from '../components/SOSModal';
import IncomingCallModal from '../components/IncomingCallModal';
import OutgoingCallModal from '../components/OutgoingCallModal';
import RateAppModal from '../components/RateAppModal';
import PaymentGateway from '../components/PaymentGateway';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Haversine distance formula
const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function RiderScreen() {
  const { profile, showToast, setProfile } = useUserStore();
  const { colors, isDark } = useTheme();
  
  const styles = getStyles(colors);
  
  const [isRestoring, setIsRestoring] = useState(true);
  const [step, setStep] = useState(1);
  const [activeRideId, setActiveRideId] = useState<string | null>(null);
  
  // Locations
  const [pickupLat, setPickupLat] = useState<number | null>(null);
  const [pickupLng, setPickupLng] = useState<number | null>(null);
  const [destLat, setDestLat] = useState<number | null>(null);
  const [destLng, setDestLng] = useState<number | null>(null);
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  
  // Suggestions (Geocoding)
  const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<any[]>([]);
  const [activeField, setActiveField] = useState<'pickup' | 'destination' | null>(null);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  // Drivers & Coupons
  const [availableDrivers, setAvailableDrivers] = useState<any[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [activeCoupon, setActiveCoupon] = useState<any>(null);
  
  // Sorting
  const [sortBy, setSortBy] = useState<'distance' | 'fare' | 'rating'>('distance');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Active Ride State
  const [finalFare, setFinalFare] = useState<number | null>(null);
  const [paymentPaid, setPaymentPaid] = useState(false);
  const [isEmergencyState, setIsEmergencyState] = useState(false);
  const [driverSpeed, setDriverSpeed] = useState<number>(0);
  const [liveDriverCoords, setLiveDriverCoords] = useState<{lat: number; lng: number} | null>(null);
  
  // Modals
  const [showSOS, setShowSOS] = useState(false);
  const [showIncomingCall, setShowIncomingCall] = useState(false);
  const [hasAnsweredSOSCall, setHasAnsweredSOSCall] = useState(false);
  const [showOutgoingPoliceCall, setShowOutgoingPoliceCall] = useState(false);
  
  // Payment Gateway
  const [showPaymentGateway, setShowPaymentGateway] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [walletUsed, setWalletUsed] = useState(0);
  const [stripeAmount, setStripeAmount] = useState(0);

  // Rating
  const [rating, setRating] = useState<number>(0);
  const [review, setReview] = useState<string>('');
  const [ratingSubmitted, setRatingSubmitted] = useState<boolean>(false);

  // Sync Active Ride
  useEffect(() => {
    const syncActiveState = async () => {
      if (!profile?.id) {
        setIsRestoring(false);
        return;
      }

      const { data } = await supabase
        .from('ride_dispatches')
        .select('*, driver:drivers(*)')
        .eq('rider_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && ['pending', 'accepted', 'in_progress', 'emergency'].includes(data.status)) {
        setActiveRideId(data.id);
        setSelectedDriver(data.driver);
        setPickup(data.pickup_name);
        setDestination(data.dropoff_name);
        setPickupLat(data.pickup_lat);
        setPickupLng(data.pickup_lng);
        setDestLat(data.dest_lat);
        setDestLng(data.dest_lng);
        setFinalFare(data.fare_amount);
        setPaymentPaid(data.payment_status === 'paid');

        await AsyncStorage.setItem('active_ride_id', data.id);

        if (data.status === 'pending') setStep(3);
        if (data.status === 'accepted') setStep(4);
        if (data.status === 'in_progress' || data.status === 'emergency') setStep(5);
        if (data.status === 'emergency') setIsEmergencyState(true);
      } else {
        await AsyncStorage.removeItem('active_ride_id');
        setStep(1);
      }
      setIsRestoring(false);
    };
    syncActiveState();
  }, [profile?.id]);

  // Master Real-Time Subscription
  useEffect(() => {
    if (!activeRideId) return;

    const dispatchSubscription = supabase
      .channel(`dispatch_${activeRideId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'ride_dispatches', filter: `id=eq.${activeRideId}` },
        (payload) => {
          if (payload.new) {
            const newStatus = payload.new.status;
            const newPaymentStatus = payload.new.payment_status;

            if (newStatus === 'emergency') setIsEmergencyState(true);
            else if (isEmergencyState) setIsEmergencyState(false);

            if (newPaymentStatus === 'paid') {
              setPaymentPaid(true);
              setShowPaymentGateway(false);
            }

            if (newStatus === 'accepted') {
              setStep(4);
              showToast("Driver accepted your ride!");
            } else if (newStatus === 'rejected') {
              showToast("Driver declined. Try another.");
              setStep(2);
              setActiveRideId(null);
              AsyncStorage.removeItem('active_ride_id');
            } else if (newStatus === 'completed') {
              setStep(6);
              AsyncStorage.removeItem('active_ride_id');
              
              if (profile?.id) {
                supabase.from('profiles').select('*').eq('id', profile.id).single()
                  .then(({ data: pData }) => { if (pData) setProfile(pData); });
              }
            } else if (newStatus === 'cancelled' || newStatus === 'timeout') {
              resetRiderUI();
              showToast("Ride was cancelled or timed out.");
            }
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(dispatchSubscription); };
  }, [activeRideId, showToast]);

  // Live GPS Tracking
  useEffect(() => {
    if (step >= 4 && selectedDriver?.id) {
      const carTracker = supabase
        .channel(`live_track_${selectedDriver.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'drivers', filter: `id=eq.${selectedDriver.id}` },
          (payload) => {
            setLiveDriverCoords({ lat: payload.new.lat, lng: payload.new.lng });
            if (payload.new.speed !== undefined) {
              setDriverSpeed(payload.new.speed);
            }
          }
        )
        .subscribe();
      return () => { supabase.removeChannel(carTracker); };
    }
  }, [step, selectedDriver]);

  // Rider 12-hour Limit Check
  useEffect(() => {
    let interval: any;
    if ((step === 5 || step === 4) && activeRideId) {
      const fetchAndCheckTime = async () => {
        const { data } = await supabase.from('ride_dispatches').select('created_at').eq('id', activeRideId).maybeSingle();
        if (data?.created_at) {
          let timeStr = data.created_at;
          if (!timeStr.endsWith('Z') && !timeStr.includes('+')) timeStr += 'Z';
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
  }, [step, activeRideId, showIncomingCall, hasAnsweredSOSCall]);


  // Geocoding Effect (Photon API)
  useEffect(() => {
    const fetchLandmarks = async (query: string, setter: any) => {
      if (query.length < 3) { setter([]); return; }
      try {
        const silLat = 24.7577, silLon = 92.7923;
        const response = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&lat=${silLat}&lon=${silLon}&limit=5`);
        const data = await response.json();
        const formatted = data.features.map((f: any, index: number) => ({
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

  const handleSelectSuggestion = (item: any, type: 'pickup' | 'destination') => {
    if (type === 'pickup') { 
      setPickup(item.name); setPickupLat(item.lat); setPickupLng(item.lng); setPickupSuggestions([]); 
    } else { 
      setDestination(item.name); setDestLat(item.lat); setDestLng(item.lng); setDestSuggestions([]); 
    }
    setActiveField(null);
  };

  const handleUseCurrentLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showToast('Permission to access location was denied');
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      setPickupLat(location.coords.latitude);
      setPickupLng(location.coords.longitude);
      setPickup('My Current Location');
      setActiveField(null);
      showToast('Current location selected!');
    } catch (e) {
      showToast("Failed to get current location");
    }
  };

  const handleSearchDrivers = async () => {
    if (!pickupLat || !destLat) {
      showToast("Please select valid locations.");
      return;
    }
    setStep(2);
    setLoadingDrivers(true);
    setAvailableDrivers([]);
    
    let bestCoupon = null;
    if (profile?.id) {
      const { data: coupons } = await supabase
        .from('coupons')
        .select('*')
        .eq('user_id', profile.id)
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
      console.error("find drivers error:", error);
      showToast(`Error finding drivers: ${error.message}`);
      setStep(1);
    } else if (data) {
      const tripDistance = getDistanceFromLatLonInKm(pickupLat, pickupLng!, destLat, destLng!);
      
      const formattedDrivers = data.map((d: any) => {
        const baseAppFee = 10;
        const pickupCost = d.distance * 5;
        const tripCost = tripDistance * d.fare;
        const ratingBonus = Math.max(0, (d.rating - 4.0) * 5);
        const calculatedOriginalFare = Math.round(baseAppFee + pickupCost + tripCost + ratingBonus);
        const fFare = bestCoupon ? Math.round(calculatedOriginalFare * (1 - bestCoupon.discount_percent / 100)) : calculatedOriginalFare;

        return {
          ...d,
          distance: parseFloat(d.distance.toFixed(2)),
          originalFare: calculatedOriginalFare,
          fare: fFare
        };
      });
      setAvailableDrivers(formattedDrivers);
    }
    setLoadingDrivers(false);
  };

  const sortedDrivers = useMemo(() => {
    return [...availableDrivers].sort((a, b) => {
      const modifier = sortOrder === 'asc' ? 1 : -1;
      if (a[sortBy] < b[sortBy]) return -1 * modifier;
      if (a[sortBy] > b[sortBy]) return 1 * modifier;
      return 0;
    });
  }, [availableDrivers, sortBy, sortOrder]);

  const requestRide = async (driver: any) => {
    if (!profile?.id) return;
    setIsRequesting(true);
    setSelectedDriver(driver);
    setFinalFare(driver.fare);
    
    const { data, error } = await supabase.from('ride_dispatches').insert([{
      rider_id: profile.id,
      driver_id: driver.id,
      pickup_lat: pickupLat,
      pickup_lng: pickupLng,
      pickup_name: pickup,
      dest_lat: destLat,
      dest_lng: destLng,
      dropoff_name: destination,
      fare_amount: driver.fare,
      status: 'pending'
    }]).select().single();

    if (error) {
      console.error("Ride Request Error:", error);
      showToast(`Failed to request ride: ${error.message || 'Unknown error'}`);
    } else {
      setActiveRideId(data.id);
      AsyncStorage.setItem('active_ride_id', data.id);
      setStep(3);
    }
    setIsRequesting(false);
  };

  const cancelRide = async () => {
    if (activeRideId) {
      await supabase.from('ride_dispatches').update({ status: 'cancelled' }).eq('id', activeRideId);
      setActiveRideId(null);
      AsyncStorage.removeItem('active_ride_id');
      setSelectedDriver(null);
    }
    setStep(2);
  };

  const resetRiderUI = () => {
    AsyncStorage.removeItem('active_ride_id');
    setStep(1);
    setPickup(''); setDestination('');
    setPickupLat(null); setPickupLng(null);
    setDestLat(null); setDestLng(null);
    setSelectedDriver(null); setActiveRideId(null);
    setLiveDriverCoords(null); setFinalFare(null);
    setPaymentPaid(false); setIsEmergencyState(false);
    setRating(0); setReview(''); setRatingSubmitted(false);
  };

  const handlePayNow = async () => {
    if (!finalFare || !activeRideId) return;
    
    let discountedFare = finalFare;
    if (profile?.is_premium) discountedFare = finalFare * 0.9;
    
    setStripeAmount(discountedFare);
    
    if (discountedFare <= 0) {
      setClientSecret('wallet_only');
      setShowPaymentGateway(true);
      return;
    }
    
    // Fallback Mock for mobile test environments without the Node server running
    setClientSecret('pi_mock_secret_123');
    setShowPaymentGateway(true);
  };

  const submitRating = async () => {
    if (activeRideId) {
      setRatingSubmitted(true);
      await supabase.rpc('submit_ride_rating', { p_dispatch_id: activeRideId, p_rating: rating, p_review: review.trim() || null });
      showToast("Thank you for your feedback!");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mapContainer}>
        <WebViewMap 
          userLocation={pickupLat && pickupLng ? { lat: pickupLat, lng: pickupLng } : null}
          destinationLocation={destLat && destLng ? { lat: destLat, lng: destLng } : null}
          driverLocation={liveDriverCoords || (selectedDriver ? { lat: selectedDriver.current_lat || pickupLat, lng: selectedDriver.current_lng || pickupLng } : null)}
          isDarkMode={isDark}
        />
        
        {/* Speedometer Overlay */}
        {step >= 4 && step <= 5 && (
          <View style={styles.speedometer}>
            <Gauge size={24} color="#3b82f6" />
            <View style={{ marginLeft: 8 }}>
              <Text style={styles.speedText}>{driverSpeed}</Text>
              <Text style={styles.speedLabel}>km/h</Text>
            </View>
          </View>
        )}
      </View>

      {/* Emergency Overlay */}
      {isEmergencyState && (
        <View style={styles.emergencyOverlay}>
          <View style={styles.emergencyIconWrapper}>
            <AlertCircle size={40} color={colors.danger} />
          </View>
          <Text style={styles.emergencyTitle}>EMERGENCY SOS</Text>
          <Text style={styles.emergencySubtitle}>Your ride has been flagged. Help is a tap away.</Text>
          
          <TouchableOpacity style={styles.emergencyCallBtn} onPress={() => setShowOutgoingPoliceCall(true)}>
            <Text style={styles.emergencyCallBtnText}>CALL POLICE (911)</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.emergencyCancelBtn}
            onPress={async () => {
              if (activeRideId) {
                await supabase.from('ride_dispatches').update({ status: 'in_progress' }).eq('id', activeRideId);
                setIsEmergencyState(false);
              }
            }}
          >
            <Text style={styles.emergencyCancelBtnText}>Mark as Safe / Cancel SOS</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Standard Bottom Sheet */}
      {!isEmergencyState && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.bottomSheet}>
          {isRestoring ? (
            <View style={[styles.sheetContent, {alignItems: 'center', paddingVertical: 40}]}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.sheetTitle, {marginTop: 16}]}>Restoring Session...</Text>
            </View>
          ) : (
            <>
              {/* STEP 1: Search */}
              {step === 1 && (
                <View style={styles.sheetContent}>
                  <View style={styles.header}>
                    <Text style={[styles.sheetTitle, {fontSize: 24}]}>Where to?</Text>
                  </View>

                  <View style={styles.formGroup}>
                    <View style={[styles.inputContainer, focusedInput === 'pickup' && styles.inputContainerFocused]}>
                      <Circle size={12} color={colors.icon} style={styles.inputIcon} />
                      <TextInput 
                        style={[styles.input, {fontSize: 16}]} 
                        placeholder="Pick up Location" 
                        value={pickup} 
                        onChangeText={setPickup}
                        onFocus={() => { setActiveField('pickup'); setFocusedInput('pickup'); }}
                        onBlur={() => setFocusedInput(null)}
                      />
                      <TouchableOpacity onPress={handleUseCurrentLocation} style={styles.currentLocBtn}>
                        <LocateFixed size={20} color={colors.primary} />
                      </TouchableOpacity>
                    </View>

                    {activeField === 'pickup' && pickupSuggestions.length > 0 && (
                      <View style={styles.suggestionsContainer}>
                        {pickupSuggestions.map(item => (
                          <TouchableOpacity key={item.id} style={styles.suggestionItem} onPress={() => handleSelectSuggestion(item, 'pickup')}>
                            <MapPin size={16} color={colors.iconMuted} style={{marginTop: 2}} />
                            <View style={{marginLeft: 12}}>
                              <Text style={styles.suggestionTitle}>{item.name}</Text>
                              <Text style={styles.suggestionSubtitle}>{item.fullName}</Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    <View style={styles.connectorLine} />

                    <View style={[styles.inputContainer, focusedInput === 'dest' && styles.inputContainerFocused]}>
                      <View style={{width: 12, height: 12, backgroundColor: colors.text, marginRight: 8}} />
                      <TextInput 
                        style={[styles.input, {fontSize: 16}]} 
                        placeholder="Enter Destination" 
                        value={destination} 
                        onChangeText={setDestination} 
                        onFocus={() => { setActiveField('destination'); setFocusedInput('dest'); }}
                        onBlur={() => setFocusedInput(null)}
                      />
                    </View>

                    {activeField === 'destination' && destSuggestions.length > 0 && (
                      <View style={styles.suggestionsContainer}>
                        {destSuggestions.map(item => (
                          <TouchableOpacity key={item.id} style={styles.suggestionItem} onPress={() => handleSelectSuggestion(item, 'destination')}>
                            <MapPin size={16} color={colors.iconMuted} style={{marginTop: 2}} />
                            <View style={{marginLeft: 12}}>
                              <Text style={styles.suggestionTitle}>{item.name}</Text>
                              <Text style={styles.suggestionSubtitle}>{item.fullName}</Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>

                  <TouchableOpacity 
                    style={[styles.primaryBtn, (!pickupLat || !destLat) && styles.disabledBtn]} 
                    onPress={handleSearchDrivers}
                    disabled={!pickupLat || !destLat}
                  >
                    <Text style={[styles.btnText, {fontSize: 18}]}>Find Drivers</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* STEP 2: Drivers List */}
              {step === 2 && (
                <View style={styles.sheetContent}>
                  <TouchableOpacity onPress={() => setStep(1)} style={{alignSelf: 'flex-start', marginBottom: 12}}>
                    <Text style={styles.backText}>← Back</Text>
                  </TouchableOpacity>
                  
                  <View style={styles.driversHeader}>
                    <View>
                      <Text style={styles.sheetTitle}>{availableDrivers.length > 0 ? `${availableDrivers.length} Near You` : 'Scanning...'}</Text>
                      {activeCoupon && <Text style={styles.couponBadgeText}>✓ {activeCoupon.discount_percent}% Discount Applied</Text>}
                    </View>
                    
                    <View style={styles.sortControls}>
                      {['distance', 'fare', 'rating'].map((opt) => (
                        <TouchableOpacity key={opt} onPress={() => setSortBy(opt as any)} style={[styles.sortBtn, sortBy === opt && styles.sortBtnActive]}>
                          <Text style={[styles.sortBtnText, sortBy === opt && styles.sortBtnTextActive]}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</Text>
                        </TouchableOpacity>
                      ))}
                      <TouchableOpacity onPress={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')} style={styles.sortDirBtn}>
                        <ArrowUpDown size={14} color={colors.iconMuted} style={sortOrder === 'desc' ? {transform: [{rotate: '180deg'}]} : undefined} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  {loadingDrivers ? <ActivityIndicator size="large" color={colors.primary} style={{marginTop:20, marginBottom: 20}}/> : (
                    <FlatList
                      data={sortedDrivers}
                      keyExtractor={(item) => item.id}
                      style={{ maxHeight: 300 }}
                      showsVerticalScrollIndicator={false}
                      renderItem={({ item }) => (
                        <View style={[styles.driverCard, activeCoupon && styles.driverCardCoupon]}>
                          {activeCoupon && <View style={styles.driverCouponBadge}><Text style={styles.driverCouponText}>{activeCoupon.discount_percent}% OFF</Text></View>}
                          
                          <View style={styles.driverInfo}>
                            <View style={styles.avatarContainer}>
                              {VEHICLE_MODELS.find(v => v.id === item.vehicle_model) ? (
                                <Image 
                                  source={VEHICLE_MODELS.find(v => v.id === item.vehicle_model)?.image} 
                                  style={{width: 48, height: 48, borderRadius: 12, resizeMode: 'cover'}} 
                                />
                              ) : (
                                <CarFront size={24} color="#475569" />
                              )}
                            </View>
                            <View style={{marginLeft: 12}}>
                              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                <Text style={styles.driverName}>{item.full_name || 'Driver'}</Text>
                                <View style={styles.driverRating}>
                                  <Star size={10} color="#fbbf24" fill="#fbbf24" />
                                  <Text style={styles.driverRatingText}>{item.rating}</Text>
                                </View>
                              </View>
                              <Text style={styles.driverSub}>{VEHICLE_MODELS.find(v => v.id === item.vehicle_model)?.name || item.vehicle_model || 'NexRide Cab'}</Text>
                              <Text style={styles.driverSub}>{item.distance.toFixed(1)} km away</Text>
                            </View>
                          </View>
                          
                          <View style={{alignItems: 'flex-end', justifyContent: 'center'}}>
                            {activeCoupon && <Text style={styles.originalFare}>₹{item.originalFare}</Text>}
                            <Text style={styles.fareText}>₹{item.fare}</Text>
                            <TouchableOpacity 
                              style={[styles.smBtn, isRequesting && selectedDriver?.id !== item.id && styles.disabledBtn]} 
                              onPress={() => requestRide(item)}
                              disabled={isRequesting}
                            >
                              <Text style={styles.smBtnText}>{isRequesting && selectedDriver?.id === item.id ? '...' : 'Request'}</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    />
                  )}
                </View>
              )}

              {/* STEP 3: Requesting */}
              {step === 3 && (
                <View style={styles.sheetContent}>
                  <View style={{alignItems: 'center', paddingVertical: 16}}>
                    <ActivityIndicator size="large" color={colors.primary} style={{marginBottom: 16}} />
                    <Text style={styles.sheetTitle}>Requesting {selectedDriver?.full_name}...</Text>
                    <Text style={styles.subtitle}>Waiting for the driver to accept your request.</Text>
                  </View>
                  <TouchableOpacity style={styles.cancelBtn} onPress={cancelRide}>
                    <X size={16} color={colors.danger} style={{marginRight: 6}} />
                    <Text style={styles.cancelBtnText}>Cancel Request</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* STEP 4: Accepted */}
              {step === 4 && (
                <View style={styles.sheetContent}>
                  <View style={{alignItems: 'center', marginBottom: 12}}>
                    <CheckCircle2 size={40} color="#16a34a" style={{marginBottom: 12}} />
                    <Text style={styles.sheetTitle}>Driver is on the way!</Text>
                    <Text style={[styles.subtitle, {textAlign: 'center'}]}><Text style={{fontWeight: 'bold', color: '#0f172a'}}>{selectedDriver?.full_name}</Text> is heading to pick you up at <Text style={{fontWeight: 'bold', color: '#0f172a'}}>{pickup}</Text>.</Text>
                  </View>
                  
                  <View style={{flexDirection: 'row', gap: 12}}>
                    {!paymentPaid ? (
                      <TouchableOpacity style={[styles.primaryBtn, {flex: 1}]} onPress={handlePayNow}>
                        <Text style={styles.btnText}>Pay Now (₹{finalFare})</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={[styles.primaryBtn, {flex: 1, backgroundColor: '#dcfce7'}]}>
                        <Text style={[styles.btnText, {color: '#166534'}]}>Payment Completed ✓</Text>
                      </View>
                    )}
                    <TouchableOpacity style={styles.sosSecondaryBtn} onPress={() => setShowSOS(true)}>
                      <Text style={styles.sosSecondaryBtnText}>SOS</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* STEP 5: In Progress */}
              {step === 5 && (
                <View style={styles.sheetContent}>
                  <View style={{alignItems: 'center', marginBottom: 12}}>
                    <CarFront size={50} color={colors.primary} style={{marginBottom: 12}} />
                    <Text style={styles.sheetTitle}>Ride in Progress</Text>
                    <Text style={[styles.subtitle, {textAlign: 'center'}]}>You're currently in a ride with <Text style={{fontWeight: 'bold', color: '#0f172a'}}>{selectedDriver?.full_name}</Text>.</Text>
                  </View>
                  
                  <View style={{flexDirection: 'row', gap: 12, justifyContent: 'center'}}>
                    <TouchableOpacity style={styles.sosSecondaryBtn} onPress={() => setShowSOS(true)}>
                      <Text style={styles.sosSecondaryBtnText}>SOS Emergency</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* STEP 6: Finished / Receipt */}
              {step === 6 && (
                <ScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
                  <View style={{alignItems: 'center', marginBottom: 16}}>
                    <CheckCircle2 size={60} color="#10b981" style={{marginBottom: 16}} />
                    <Text style={styles.sheetTitle}>Ride Completed!</Text>
                    <Text style={[styles.subtitle, {textAlign: 'center'}]}>You've arrived at <Text style={{fontWeight: 'bold', color: '#0f172a'}}>{destination}</Text> safely.</Text>
                  </View>
                  
                  <View style={styles.receiptBox}>
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>Total Paid</Text>
                      <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <IndianRupee size={20} color="#10b981" />
                        <Text style={styles.receiptAmount}>{finalFare}</Text>
                      </View>
                    </View>
                    <View style={styles.receiptDivider} />
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>Driver</Text>
                      <Text style={styles.receiptValue}>{selectedDriver?.full_name}</Text>
                    </View>

                    {/* Rating Section */}
                    <View style={styles.ratingSection}>
                      {!ratingSubmitted ? (
                        <>
                          <Text style={styles.ratingTitle}>Rate Your Trip</Text>
                          <View style={styles.starsContainer}>
                            {[1,2,3,4,5].map(s => (
                              <TouchableOpacity key={s} onPress={() => setRating(s)}>
                                <Star size={36} color={s <= rating ? "#fbbf24" : "#cbd5e1"} fill={s <= rating ? "#fbbf24" : "transparent"} />
                              </TouchableOpacity>
                            ))}
                          </View>
                          {rating > 0 && (
                            <View style={{width: '100%', marginTop: 12}}>
                              <TextInput 
                                style={styles.reviewInput}
                                placeholder="Leave a comment for the driver (optional)..."
                                placeholderTextColor="#94a3b8"
                                multiline
                                value={review}
                                onChangeText={setReview}
                              />
                              <TouchableOpacity style={styles.submitRatingBtn} onPress={submitRating}>
                                <Text style={styles.submitRatingText}>Submit Feedback</Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </>
                      ) : (
                        <View style={styles.ratingSuccessBox}>
                          <Text style={styles.ratingSuccessText}>✓ Thank you for rating!</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <TouchableOpacity style={styles.primaryBtn} onPress={resetRiderUI}>
                    <Text style={styles.btnText}>Back to Search</Text>
                  </TouchableOpacity>
                </ScrollView>
              )}
            </>
          )}
        </KeyboardAvoidingView>
      )}

      {/* External Modals */}
      <SOSModal visible={showSOS} onClose={() => setShowSOS(false)} onConfirm={async () => {
        setShowSOS(false);
        if (activeRideId) {
          await supabase.from('ride_dispatches').update({ status: 'emergency' }).eq('id', activeRideId);
          setIsEmergencyState(true);
        }
      }} />

      <IncomingCallModal visible={showIncomingCall} onClose={(accepted) => {
        setShowIncomingCall(false);
        if (accepted) setHasAnsweredSOSCall(true);
      }} />

      <OutgoingCallModal visible={showOutgoingPoliceCall} onClose={() => setShowOutgoingPoliceCall(false)} />

      {/* Payment Gateway Modal */}
      {showPaymentGateway && clientSecret && (
        <PaymentGateway
          visible={showPaymentGateway}
          clientSecret={clientSecret}
          amount={finalFare!}
          stripeAmount={stripeAmount}
          walletUsed={walletUsed}
          rideId={activeRideId!}
          onSuccess={() => { setPaymentPaid(true); setShowPaymentGateway(false); showToast("Payment Successful!"); }}
          onCancel={() => setShowPaymentGateway(false)}
        />
      )}

    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  mapContainer: { flex: 1 },
  bottomSheet: Platform.select({
    web: {
      backgroundColor: colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28,
      boxShadow: '0 -10px 25px rgba(0,0,0,0.05)', padding: 24, paddingBottom: 24,
    } as any,
    default: {
      backgroundColor: colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28,
      shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 25, elevation: 20,
      padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    }
  }),
  topSearchContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    alignSelf: 'center',
    width: '90%',
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 25,
    elevation: 15,
    zIndex: 100,
  },
  sheetContent: { gap: 16 },
  header: { marginBottom: 8 },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  subtitle: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  formGroup: { gap: 12, position: 'relative' },
  inputContainer: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, 
    borderWidth: 1, borderColor: colors.border, borderRadius: 16, height: 50, paddingHorizontal: 16 
  },
  inputContainerFocused: Platform.select({
    web: { borderColor: colors.primary, backgroundColor: colors.card, boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.1)' } as any,
    default: { borderColor: colors.primary, backgroundColor: colors.card }
  }),
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: colors.text, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) } as any,
  currentLocBtn: { padding: 8, marginRight: -8 },
  currentLocBtnText: { color: colors.primary, fontWeight: '700', fontSize: 11 },
  connectorLine: { position: 'absolute', left: 21, top: 30, bottom: 30, width: 2, backgroundColor: colors.border, zIndex: -1 },
  suggestionsContainer: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, 
    marginTop: -8, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, maxHeight: 180, zIndex: 10
  },
  suggestionItem: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  suggestionTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  suggestionSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  primaryBtn: { 
    backgroundColor: colors.primary, borderRadius: 16, height: 54, 
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 12
  },
  disabledBtn: { backgroundColor: '#94a3b8' },
  btnText: { color: colors.card, fontWeight: '700', fontSize: 13 },
  
  // Drivers List
  backText: { color: colors.primary, fontWeight: '600' },
  driversHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  couponBadgeText: { color: '#16a34a', fontSize: 12, fontWeight: '700', marginTop: 4 },
  sortControls: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 8, padding: 4 },
  sortBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  sortBtnActive: { backgroundColor: colors.card },
  sortBtnText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  sortBtnTextActive: { color: colors.text },
  sortDirBtn: { paddingHorizontal: 6, paddingVertical: 6, justifyContent: 'center' },
  driverCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    paddingVertical: 16, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.border
  },
  driverCardCoupon: { backgroundColor: '#f0fdf4', borderRadius: 12, paddingHorizontal: 16 },
  driverCouponBadge: { position: 'absolute', top: -10, left: 16, backgroundColor: '#16a34a', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  driverCouponText: { color: colors.card, fontSize: 10, fontWeight: '800' },
  driverInfo: { flexDirection: 'row', alignItems: 'center' },
  avatarContainer: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  driverName: { fontWeight: '700', fontSize: 16, color: colors.text, marginRight: 8 },
  driverRating: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  driverRatingText: { fontSize: 10, fontWeight: '700', color: '#b45309', marginLeft: 2 },
  driverSub: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  originalFare: { fontSize: 12, color: colors.iconMuted, textDecorationLine: 'line-through' },
  fareText: { fontWeight: '800', fontSize: 18, color: '#16a34a', marginBottom: 6 },
  smBtn: { backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 10 },
  smBtnText: { color: colors.card, fontWeight: '700', fontSize: 13 },
  cancelBtn: { backgroundColor: '#fef2f2', height: 52, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  cancelBtnText: { color: colors.danger, fontWeight: '700', fontSize: 16 },
  
  sosSecondaryBtn: { paddingHorizontal: 24, paddingVertical: 14, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  sosSecondaryBtnText: { color: colors.danger, fontWeight: '800', fontSize: 16 },
  
  // Speedometer
  speedometer: {
    position: 'absolute', top: 16, right: 16, backgroundColor: colors.card, paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 20, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 15, elevation: 10, borderWidth: 1, borderColor: colors.border, zIndex: 10
  },
  speedText: { fontSize: 20, fontWeight: '900', color: colors.text, lineHeight: 22 },
  speedLabel: { fontSize: 10, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' },

  // Emergency Mode Overlay
  emergencyOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(239, 68, 68, 0.95)',
    justifyContent: 'center', alignItems: 'center', padding: 24, zIndex: 3000
  },
  emergencyIconWrapper: { width: 80, height: 80, backgroundColor: colors.card, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  emergencyTitle: { fontSize: 32, fontWeight: '800', color: colors.card, marginBottom: 16 },
  emergencySubtitle: { fontSize: 18, color: colors.card, opacity: 0.9, textAlign: 'center', marginBottom: 40 },
  emergencyCallBtn: { width: '100%', padding: 20, borderRadius: 16, backgroundColor: colors.card, alignItems: 'center', marginBottom: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 25, elevation: 10 },
  emergencyCallBtnText: { color: colors.danger, fontSize: 20, fontWeight: '800' },
  emergencyCancelBtn: { paddingHorizontal: 32, paddingVertical: 16, borderRadius: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  emergencyCancelBtnText: { color: colors.card, fontSize: 16, fontWeight: '600' },

  // Receipt & Rating
  receiptBox: { backgroundColor: colors.background, padding: 24, borderRadius: 20, borderWidth: 1, borderColor: colors.border, width: '100%', marginVertical: 24 },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  receiptLabel: { color: colors.textMuted, fontWeight: '600', fontSize: 15 },
  receiptAmount: { fontSize: 26, fontWeight: '900', color: '#10b981', marginLeft: 4 },
  receiptValue: { fontSize: 18, fontWeight: '800', color: colors.text },
  receiptDivider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 16 },
  ratingSection: { marginTop: 24, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#e2e8f0', alignItems: 'center' },
  ratingTitle: { fontSize: 16, fontWeight: '800', marginBottom: 12, color: colors.text },
  starsContainer: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  reviewInput: { width: '100%', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, minHeight: 80, textAlignVertical: 'top' },
  submitRatingBtn: { width: '100%', backgroundColor: '#10b981', padding: 12, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  submitRatingText: { color: colors.card, fontWeight: '800', fontSize: 16 },
  ratingSuccessBox: { padding: 12, backgroundColor: '#dcfce7', borderRadius: 12, width: '100%', alignItems: 'center' },
  ratingSuccessText: { color: '#166534', fontWeight: 'bold' }
});
