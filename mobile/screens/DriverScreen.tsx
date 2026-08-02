import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity, 
  ActivityIndicator, Platform, ScrollView, Animated
} from 'react-native';
import { supabase } from '../supabaseClient';
import { useUserStore } from '../store';
import WebViewMap from '../components/WebViewMap';
import SOSModal from '../components/SOSModal';
import IncomingCallModal from '../components/IncomingCallModal';
import OutgoingCallModal from '../components/OutgoingCallModal';
import { Gauge, Navigation, CheckCircle2, Power, CarFront, Star, TrendingUp, Clock, Search, XOctagon, AlertCircle, MapPin, Check, X, IndianRupee } from 'lucide-react-native';
import * as Location from 'expo-location';
import { useTheme } from '../theme';

// Haversine formula
const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Simple Request Card Component
const RequestCard = ({ request, handleResponse, driverLocation }: any) => {
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleResponse(request, 'rejected');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [request, handleResponse]);

  const getDistanceToRider = () => {
    const riderLat = request.pickup_lat;
    const riderLng = request.pickup_lng;
    if (!driverLocation || !riderLat || !riderLng) return null;
    return getDistanceFromLatLonInKm(driverLocation.lat, driverLocation.lng, riderLat, riderLng).toFixed(1);
  };

  const distanceText = getDistanceToRider();

  return (
    <View style={styles.requestCard}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a' }}>Incoming Request</Text>
        <Text style={{ fontSize: 14, fontWeight: '900', color: timeLeft <= 10 ? '#ef4444' : '#64748b' }}>{timeLeft}s</Text>
      </View>
      
      <View style={{ width: '100%', height: 6, backgroundColor: '#f1f5f9', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
        <View style={{ height: '100%', backgroundColor: timeLeft > 10 ? '#10b981' : '#ef4444', width: `${(timeLeft / 30) * 100}%` }} />
      </View>

      <View style={styles.requestDetails}>
         <View style={styles.locationRow}>
            <MapPin size={18} color={colors.primary} />
            <Text style={{ fontWeight: '700', fontSize: 14, marginLeft: 10, flex: 1 }}>{request.pickup_name}</Text>
         </View>
         
         <View style={styles.distanceRow}>
            <Navigation size={12} color={colors.iconMuted} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#64748b', marginLeft: 8 }}>
              {distanceText ? `${distanceText} km from you` : 'Calculating distance...'}
            </Text>
         </View>

         <View style={styles.locationRow}>
            <MapPin size={18} color={colors.danger} />
            <Text style={{ fontWeight: '700', fontSize: 14, marginLeft: 10, flex: 1 }}>{request.dropoff_name}</Text>
         </View>
         
         <View style={styles.fareRow}>
            <Text style={{ color: '#64748b', fontWeight: '600', fontSize: 13 }}>Earnings</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <IndianRupee size={18} color="#10b981" />
              <Text style={styles.farePrice}>{request.fare_amount}</Text>
            </View>
         </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <TouchableOpacity style={styles.rejectBtn} onPress={() => handleResponse(request, 'rejected')}>
          <X size={20} color={colors.danger} strokeWidth={3} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.acceptBtn} onPress={() => handleResponse(request, 'accepted')}>
          <Check size={20} color={colors.card} strokeWidth={3} style={{ marginRight: 8 }} />
          <Text style={styles.acceptBtnText}>Accept Trip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function DriverScreen() {
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);
  
  const { profile, showToast, setProfile } = useUserStore();
  
  const [isOnline, setIsOnline] = useState(false);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [activeRide, setActiveRide] = useState<any>(null);
  const [completedRide, setCompletedRide] = useState<any>(null);
  
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [currentSpeed, setCurrentSpeed] = useState<number>(0);
  
  const [weeklyEarnings, setWeeklyEarnings] = useState(0);
  const [weeklyHours, setWeeklyHours] = useState(0);
  const [driverRating, setDriverRating] = useState<string>('5.0');
  
  // Modals & States
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [isEmergencyState, setIsEmergencyState] = useState(false);
  const [showIncomingCall, setShowIncomingCall] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [hasAnsweredSOSCall, setHasAnsweredSOSCall] = useState(false);
  const [showOutgoingPoliceCall, setShowOutgoingPoliceCall] = useState(false);

  // Initialize Driver
  useEffect(() => {
    const initDriver = async () => {
      if (!profile?.id) return;
        
      const { data: activeRideData } = await supabase
        .from('ride_dispatches')
        .select('*')
        .eq('driver_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeRideData && ['accepted', 'in_progress', 'emergency'].includes(activeRideData.status)) {
        setActiveRide(activeRideData);
        setIsOnline(false);
        if (activeRideData.status === 'emergency') setIsEmergencyState(true);
      } else {
        await supabase.from('drivers').update({ status: 'offline' }).eq('id', profile.id);
        setIsOnline(false);
      }

      const { data: driverProfile } = await supabase.from('drivers').select('rating').eq('id', profile.id).single();
      if (driverProfile) setDriverRating(Number(driverProfile.rating || 5.0).toFixed(1));
    };
    initDriver();
  }, [profile?.id]);

  // GPS Tracking using expo-location
  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;
    
    const startTracking = async () => {
      if (!profile?.id || (!isOnline && !activeRide)) return;

      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showToast('Permission to access location was denied');
        return;
      }

      locationSubscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 10 },
        async (location) => {
          const lat = location.coords.latitude;
          const lng = location.coords.longitude;
          const speed = location.coords.speed !== null && location.coords.speed >= 0 ? Math.round(location.coords.speed * 3.6) : 0;
          
          setCurrentLocation({ lat, lng });
          setCurrentSpeed(speed);

          await supabase.from('drivers').update({ lat, lng, speed }).eq('id', profile.id);
        }
      );
    };

    startTracking();

    return () => {
      if (locationSubscription) locationSubscription.remove();
    };
  }, [isOnline, activeRide, profile?.id]);

  // Fetch Weekly Stats Simplified
  useEffect(() => {
    const fetchStats = async () => {
      if (!profile?.id) return;
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: dispatches } = await supabase
        .from('ride_dispatches')
        .select('fare_amount')
        .eq('driver_id', profile.id)
        .eq('status', 'completed')
        .gte('created_at', sevenDaysAgo.toISOString());
        
      if (dispatches) {
        const totalEarnings = dispatches.reduce((acc, curr) => acc + Number(curr.fare_amount), 0);
        setWeeklyEarnings(totalEarnings);
      }

      const { data: stats } = await supabase
        .from('driver_daily_stats')
        .select('online_minutes')
        .eq('driver_id', profile.id)
        .gte('stat_date', sevenDaysAgo.toISOString().split('T')[0]);
        
      if (stats) {
        const totalMins = stats.reduce((acc, curr) => acc + curr.online_minutes, 0);
        setWeeklyHours(Number((totalMins / 60).toFixed(1)));
      }
    };
    fetchStats();
  }, [profile?.id, activeRide, completedRide]);

  // Toggle Online Status
  const toggleOnlineStatus = async () => {
    if (!profile?.id || activeRide) return;
    const newStatus = !isOnline ? 'available' : 'offline';
    const { error } = await supabase.from('drivers').update({ status: newStatus }).eq('id', profile.id);
    if (!error) {
      setIsOnline(!isOnline);
      showToast(newStatus === 'available' ? "You are now Online" : "You are now Offline");
    }
  };

  // Real-time Request Listener
  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel('ride_updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ride_dispatches' },
        (payload) => {
          if (isOnline && payload.new.status === 'pending' && payload.new.driver_id === profile.id) {
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
  }, [profile?.id, isOnline]);

  const handleResponse = async (request: any, status: 'accepted' | 'rejected') => {
    setIncomingRequests((prev) => prev.filter(req => req.id !== request.id));
    
    const { error } = await supabase.from('ride_dispatches').update({ status }).eq('id', request.id);

    if (!error && status === 'accepted') {
      await supabase.from('drivers').update({ status: 'busy' }).eq('id', profile?.id);
      setActiveRide(request);
      setIsOnline(false); 
      showToast("Trip Accepted!");
    } else if (error) {
      showToast("Failed to respond to request.");
    }
  };

  const startTrip = async () => {
    if (!activeRide?.id || !profile?.id) return;
    const { error } = await supabase.from('ride_dispatches').update({ status: 'in_progress' }).eq('id', activeRide.id);
    if (error) { showToast("Error starting trip."); return; }
    setActiveRide((prev: any) => ({ ...prev, status: 'in_progress' }));
    showToast("Trip Started!");
  };

  const finishRide = async () => {
    if (!activeRide?.id || !profile?.id) return;

    if (activeRide.payment_status !== 'paid') {
      showToast("Cannot complete: Waiting for rider to pay.");
      return;
    }

    const { error: dispatchErr } = await supabase.from('ride_dispatches').update({ status: 'completed' }).eq('id', activeRide.id);
    if (dispatchErr) { showToast("Error completing ride."); return; }

    await supabase.from('drivers').update({ status: 'available' }).eq('id', profile.id);

    showToast("Ride successfully completed!");
    setCompletedRide(activeRide);
    setActiveRide(null);
    setIsOnline(false);
  };

  const confirmCancelRideEarly = async () => {
    if (!activeRide?.id || !profile?.id) return;
    setShowCancelModal(false);

    const { error: dispatchErr } = await supabase.from('ride_dispatches').update({ status: 'cancelled' }).eq('id', activeRide.id);
    if (dispatchErr) { showToast("Error cancelling ride."); return; }

    await supabase.from('drivers').update({ status: 'available' }).eq('id', profile.id);

    showToast("Ride cancelled.");
    setActiveRide(null);
    setIsOnline(true);
  };

  // 12-hour Check
  useEffect(() => {
    let interval: any;
    if (activeRide?.id && isOnline) {
      const fetchAndCheckTime = async () => {
        const { data } = await supabase.from('ride_dispatches').select('created_at').eq('id', activeRide.id).maybeSingle();
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
  }, [activeRide?.id, isOnline, showIncomingCall, hasAnsweredSOSCall]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mapContainer}>
        <WebViewMap 
          userLocation={activeRide?.pickup_lat ? { lat: activeRide.pickup_lat, lng: activeRide.pickup_lng } : null} 
          destinationLocation={activeRide?.dest_lat ? { lat: activeRide.dest_lat, lng: activeRide.dest_lng } : null} 
          driverLocation={currentLocation}
          isDarkMode={isDark}
        />
        
        {isOnline && (
          <View style={styles.speedometer}>
            <Gauge size={24} color="#3b82f6" />
            <View style={{ marginLeft: 8 }}>
              <Text style={styles.speedText}>{currentSpeed}</Text>
              <Text style={styles.speedLabel}>km/h</Text>
            </View>
          </View>
        )}
      </View>

      {/* Emergency Overlay */}
      {isEmergencyState && activeRide && (
        <View style={styles.emergencyOverlay}>
          <View style={styles.emergencyIconWrapper}>
            <Search size={40} color={colors.danger} />
          </View>
          <Text style={styles.emergencyTitle}>EMERGENCY SOS</Text>
          <Text style={styles.emergencySubtitle}>This ride has been flagged. Help is a tap away.</Text>
          
          <TouchableOpacity style={styles.emergencyCallBtn} onPress={() => setShowOutgoingPoliceCall(true)}>
            <Text style={styles.emergencyCallBtnText}>CALL POLICE (911)</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.emergencyCancelBtn}
            onPress={async () => {
              await supabase.from('ride_dispatches').update({ status: 'in_progress' }).eq('id', activeRide.id);
              setIsEmergencyState(false);
            }}
          >
            <Text style={styles.emergencyCancelBtnText}>Mark as Safe / Cancel SOS</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* BOTTOM SHEET */}
      {!isEmergencyState && (
        <View style={styles.bottomSheet}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            {/* Online Toggle Header */}
            <View style={{ alignItems: 'center', paddingVertical: 16 }}>
              <Text style={{ fontSize: 24, fontWeight: '900', color: '#0f172a', marginBottom: 4 }}>
                {completedRide ? "Ride Completed" : (activeRide ? "In Trip" : (isOnline ? "You're Online" : "Go Online"))}
              </Text>
              <Text style={{ fontSize: 14, color: '#64748b', marginBottom: 24 }}>
                {completedRide ? "Trip finished successfully" : (activeRide ? "Navigation Active" : (isOnline ? "Scanning for nearby riders..." : "Ready to start earning?"))}
              </Text>

              {!completedRide && (
                <TouchableOpacity 
                  activeOpacity={0.8}
                  onPress={toggleOnlineStatus} 
                  disabled={!!activeRide}
                  style={[styles.bigToggleBtn, { backgroundColor: activeRide ? '#3b82f6' : (isOnline ? '#10b981' : '#334155') }]}
                >
                  {activeRide ? <CarFront size={40} color={colors.card} /> : <Power size={40} color={colors.card} />}
                </TouchableOpacity>
              )}
            </View>

            {/* Completed Ride View */}
            {completedRide && (
              <View style={styles.completedRideBox}>
                <View style={{ alignItems: 'center', marginBottom: 24 }}>
                  <View style={styles.successIconBox}><CheckCircle2 size={40} color={colors.card} /></View>
                  <Text style={styles.completedFareText}>₹{completedRide.fare_amount}</Text>
                  <Text style={styles.completedPaymentMethodText}>Paid via {completedRide.payment_method || 'Digital Wallet'}</Text>
                </View>
                
                <View style={styles.divider} />
                
                <View style={styles.routeSummaryRow}>
                  <Text style={styles.routeSummaryLabel}>From</Text>
                  <Text style={styles.routeSummaryValue}>{completedRide.pickup_name}</Text>
                </View>
                <View style={styles.routeSummaryRow}>
                  <Text style={styles.routeSummaryLabel}>To</Text>
                  <Text style={styles.routeSummaryValue}>{completedRide.dropoff_name}</Text>
                </View>

                <TouchableOpacity 
                  style={styles.primaryBtn} 
                  onPress={() => { setCompletedRide(null); setIsOnline(true); toggleOnlineStatus(); }}
                >
                  <Text style={styles.primaryBtnText}>Back to Home</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Active Ride View */}
            {activeRide && !isEmergencyState && (
              <View style={styles.activeRideBox}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View style={styles.navIconBox}><Navigation size={24} color={colors.success} /></View>
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text style={styles.activeRideTitle}>On Trip • ₹{activeRide.fare_amount}</Text>
                      <Text style={styles.activeRideDest} numberOfLines={1}>To: {activeRide.dropoff_name}</Text>
                      <Text style={[styles.activeRidePayment, { color: activeRide.payment_status === 'paid' ? '#16a34a' : '#ef4444' }]}>
                        {activeRide.payment_status === 'paid' ? 'Payment Received' : 'Waiting for Payment...'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.sosSmallBtn} onPress={() => setShowSOSModal(true)}>
                    <Text style={styles.sosSmallBtnText}>SOS</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity style={styles.cancelTripBtn} onPress={() => setShowCancelModal(true)}>
                    <XOctagon size={24} color={colors.danger} />
                  </TouchableOpacity>
                  
                  {activeRide.status === 'accepted' ? (
                    <TouchableOpacity 
                      style={[styles.completeTripBtn, { backgroundColor: '#3b82f6' }]} 
                      onPress={startTrip}
                    >
                      <Text style={styles.completeTripBtnText}>Arrived / Start Trip</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity 
                      style={[styles.completeTripBtn, { backgroundColor: activeRide.payment_status === 'paid' ? '#22c55e' : '#cbd5e1' }]} 
                      disabled={activeRide.payment_status !== 'paid'}
                      onPress={finishRide}
                    >
                      <Text style={styles.completeTripBtnText}>Complete Ride</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* Incoming Requests Panel */}
            {incomingRequests.length > 0 && (
              <View style={styles.incomingRequestsPanel}>
                <Text style={styles.incomingRequestsTitle}>Incoming Requests ({incomingRequests.length})</Text>
                {incomingRequests.map((req) => (
                  <RequestCard 
                    key={req.id} 
                    request={req} 
                    handleResponse={handleResponse} 
                    driverLocation={currentLocation}
                  />
                ))}
              </View>
            )}

            {/* Stats Grid */}
            {!activeRide && !completedRide && incomingRequests.length === 0 && (
              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Star size={20} color={colors.warning} style={{marginBottom: 8}} />
                  <Text style={styles.statBoxLabel}>{driverRating}</Text>
                  <Text style={styles.statBoxSub}>Rating</Text>
                </View>
                <View style={styles.statBox}>
                  <TrendingUp size={20} color="#10b981" style={{marginBottom: 8}} />
                  <Text style={styles.statBoxLabel}>₹{weeklyEarnings}</Text>
                  <Text style={styles.statBoxSub}>Week</Text>
                </View>
                <View style={styles.statBox}>
                  <Clock size={20} color="#3b82f6" style={{marginBottom: 8}} />
                  <Text style={styles.statBoxLabel}>{weeklyHours}h</Text>
                  <Text style={styles.statBoxSub}>Week</Text>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <View style={styles.cancelModalOverlay}>
          <View style={styles.cancelModalBox}>
            <View style={styles.cancelModalIconBox}><AlertCircle size={32} color={colors.danger} /></View>
            <Text style={styles.cancelModalTitle}>Cancel Ride?</Text>
            <Text style={styles.cancelModalSubtitle}>Are you sure you want to end this trip early? This will terminate the ride immediately for both you and the rider.</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
              <TouchableOpacity style={styles.cancelModalNoBtn} onPress={() => setShowCancelModal(false)}>
                <Text style={styles.cancelModalNoText}>No, Keep Driving</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelModalYesBtn} onPress={confirmCancelRideEarly}>
                <Text style={styles.cancelModalYesText}>Yes, Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* External Modals */}
      <SOSModal visible={showSOSModal} onClose={() => setShowSOSModal(false)} onConfirm={async () => {
        setShowSOSModal(false);
        if (activeRide) {
          await supabase.from('ride_dispatches').update({ status: 'emergency' }).eq('id', activeRide.id);
          setIsEmergencyState(true);
        }
      }} />

      <IncomingCallModal visible={showIncomingCall} onClose={(accepted) => {
        setShowIncomingCall(false);
        if (accepted) setHasAnsweredSOSCall(true);
      }} />

      <OutgoingCallModal visible={showOutgoingPoliceCall} onClose={() => setShowOutgoingPoliceCall(false)} />

    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  mapContainer: { flex: 1 },
  bottomSheet: Platform.select({
    web: {
      backgroundColor: colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28,
      boxShadow: '0 -10px 25px rgba(0,0,0,0.05)', padding: 24, paddingBottom: 24, maxHeight: '60%'
    } as any,
    default: {
      backgroundColor: colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28,
      shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 25, elevation: 20,
      padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, maxHeight: '60%'
    }
  }),
  bigToggleBtn: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  speedometer: { position: 'absolute', top: 16, right: 16, backgroundColor: colors.card, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 15, elevation: 10, borderWidth: 1, borderColor: colors.border, zIndex: 10 },
  speedText: { fontSize: 20, fontWeight: '900', color: colors.text, lineHeight: 22 },
  speedLabel: { fontSize: 10, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' },

  // Emergency Overlay
  emergencyOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(239, 68, 68, 0.95)', justifyContent: 'center', alignItems: 'center', padding: 24, zIndex: 3000 },
  emergencyIconWrapper: { width: 80, height: 80, backgroundColor: colors.card, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  emergencyTitle: { fontSize: 32, fontWeight: '800', color: colors.card, marginBottom: 16 },
  emergencySubtitle: { fontSize: 18, color: colors.card, opacity: 0.9, textAlign: 'center', marginBottom: 40 },
  emergencyCallBtn: { width: '100%', padding: 20, borderRadius: 16, backgroundColor: colors.card, alignItems: 'center', marginBottom: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 25, elevation: 10 },
  emergencyCallBtnText: { color: colors.danger, fontSize: 20, fontWeight: '800' },
  emergencyCancelBtn: { paddingHorizontal: 32, paddingVertical: 16, borderRadius: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  emergencyCancelBtnText: { color: colors.card, fontSize: 16, fontWeight: '600' },

  // Stats Grid
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  statBox: { flex: 1, backgroundColor: '#f1f5f9', padding: 16, borderRadius: 16, alignItems: 'center' },
  statBoxLabel: { fontSize: 16, fontWeight: '900', color: colors.text, marginBottom: 2 },
  statBoxSub: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },

  // Active Ride Box
  activeRideBox: { backgroundColor: colors.card, padding: 20, borderRadius: 20, borderWidth: 2, borderColor: '#22c55e', shadowColor: '#22c55e', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  navIconBox: { padding: 10, backgroundColor: '#dcfce7', borderRadius: 12 },
  activeRideTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  activeRideDest: { fontSize: 12, color: colors.textMuted, marginVertical: 2 },
  activeRidePayment: { fontSize: 12, fontWeight: 'bold' },
  sosSmallBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#fef2f2', borderRadius: 12, borderWidth: 1, borderColor: '#fecaca' },
  sosSmallBtnText: { color: colors.danger, fontWeight: '800', fontSize: 12 },
  cancelTripBtn: { padding: 16, backgroundColor: '#fee2e2', borderRadius: 14, justifyContent: 'center', alignItems: 'center', width: 64 },
  completeTripBtn: { flex: 1, padding: 16, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  completeTripBtnText: { color: colors.card, fontWeight: '800', fontSize: 16 },

  // Completed Ride Box
  completedRideBox: { backgroundColor: colors.background, padding: 24, borderRadius: 24, borderWidth: 1, borderColor: colors.border },
  successIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  completedFareText: { fontSize: 32, fontWeight: '900', color: colors.text },
  completedPaymentMethodText: { fontSize: 14, fontWeight: '700', color: '#10b981', marginTop: 4 },
  divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 20 },
  routeSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  routeSummaryLabel: { color: colors.textMuted, fontSize: 14 },
  routeSummaryValue: { fontWeight: '700', fontSize: 14, color: colors.text },
  primaryBtn: { backgroundColor: colors.primary, padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 12 },
  primaryBtnText: { color: colors.card, fontWeight: '800', fontSize: 16 },

  // Request Card
  incomingRequestsPanel: { marginTop: 16 },
  incomingRequestsTitle: { fontSize: 18, fontWeight: '900', color: colors.text, marginBottom: 12 },
  requestCard: { backgroundColor: colors.card, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, marginBottom: 12 },
  requestDetails: { backgroundColor: colors.background, padding: 16, borderRadius: 16, marginBottom: 16 },
  locationRow: { flexDirection: 'row', alignItems: 'center' },
  distanceRow: { flexDirection: 'row', alignItems: 'center', marginLeft: 8, paddingLeft: 12, borderLeftWidth: 2, borderStyle: 'dashed', borderColor: '#cbd5e1', marginVertical: 8 },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 12, marginTop: 12 },
  farePrice: { fontSize: 24, fontWeight: '900', color: '#10b981' },
  rejectBtn: { padding: 16, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 14, alignItems: 'center', justifyContent: 'center', width: 64 },
  acceptBtn: { flex: 1, padding: 16, backgroundColor: '#10b981', borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  acceptBtnText: { color: colors.card, fontWeight: '900', fontSize: 16 },

  // Cancel Modal Overlay
  cancelModalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24, zIndex: 4000 },
  cancelModalBox: { backgroundColor: colors.card, padding: 32, borderRadius: 24, width: '100%', alignItems: 'center' },
  cancelModalIconBox: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fee2e2', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  cancelModalTitle: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 12 },
  cancelModalSubtitle: { fontSize: 16, color: colors.textMuted, textAlign: 'center', lineHeight: 24 },
  cancelModalNoBtn: { flex: 1, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  cancelModalNoText: { color: colors.text, fontWeight: '700', fontSize: 16 },
  cancelModalYesBtn: { flex: 1, padding: 16, borderRadius: 14, backgroundColor: '#ef4444', alignItems: 'center' },
  cancelModalYesText: { color: colors.card, fontWeight: '700', fontSize: 16 }
});
