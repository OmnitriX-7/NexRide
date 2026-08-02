import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, 
  Image, ActivityIndicator, SafeAreaView, Platform, KeyboardAvoidingView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../supabaseClient';
import { useUserStore } from '../store';
import * as ImagePicker from 'expo-image-picker';
import { 
  User, Phone, Mail, MapPin, Calendar, 
  Briefcase, Camera, Save, X, Edit3, 
  UserCircle, Car, Star, ArrowLeft as ArrowLeftIcon, Trophy,
  Clock, Award, Crown
} from 'lucide-react-native';
import { decode } from 'base64-arraybuffer';
import { useTheme } from '../theme';

export default function ProfileScreen() {
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);
  const { profile, setProfile, showToast } = useUserStore();
  const navigation = useNavigation<any>();

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'settings' | 'history'>('settings');

  const [stats, setStats] = useState({ totalRides: 0, memberSince: '' });
  const [driverStats, setDriverStats] = useState<any>(null);
  const [tripHistory, setTripHistory] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    phone_number: profile?.phone_number || '',
    age: profile?.age?.toString() || '',
    gender: profile?.gender || '',
    state: profile?.state || '',
    district: profile?.district || '',
    area: profile?.area || '',
    bio: profile?.bio || '',
    emergency_contact_phone: profile?.emergency_contact_phone || '',
  });

  useEffect(() => {
    if (profile && !isEditing) {
      setFormData({
        full_name: profile.full_name || '',
        phone_number: profile.phone_number || '',
        age: profile.age?.toString() || '',
        gender: profile.gender || '',
        state: profile.state || '',
        district: profile.district || '',
        area: profile.area || '',
        bio: profile.bio || '',
        emergency_contact_phone: profile.emergency_contact_phone || '',
      });
    }
  }, [profile, isEditing]);

  useEffect(() => {
    const fetchFullProfile = async () => {
      if (!profile?.id) return;

      if (!profile.email) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) setProfile({ email: user.email });
      }

      const { count } = await supabase
        .from('ride_dispatches')
        .select('*', { count: 'exact', head: true })
        .eq(profile.role === 'driver' ? 'driver_id' : 'rider_id', profile.id)
        .eq('status', 'completed');
      
      setStats({
        totalRides: count || 0,
        memberSince: new Date(profile.created_at || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      });

      if (profile.role === 'driver') {
        const { data } = await supabase
          .from('drivers')
          .select('vehicle_model, car_plate_number, rating')
          .eq('id', profile.id)
          .maybeSingle();
        if (data) setDriverStats(data);
      }
    };
    fetchFullProfile();
  }, [profile?.id]);

  useEffect(() => {
    const fetchTripHistory = async () => {
      if (!profile?.id || activeTab !== 'history') return;
      const roleColumn = profile.role === 'driver' ? 'driver_id' : 'rider_id';
      const { data, error } = await supabase
        .from('ride_dispatches')
        .select('*')
        .eq(roleColumn, profile.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });
        
      if (!error && data) setTripHistory(data);
    };
    fetchTripHistory();
  }, [profile?.id, activeTab, profile?.role]);

  const handleUpdateProfile = async () => {
    const ageValue = formData.age !== '' ? parseInt(formData.age) : null;
    if (ageValue !== null && ageValue < 0) {
      showToast("Age can't be negative");
      return;
    }

    setLoading(true);
    const updatedFields = {
      full_name: formData.full_name,
      phone_number: formData.phone_number,
      age: ageValue,
      gender: formData.gender,
      state: formData.state,
      district: formData.district,
      area: formData.area,
      bio: formData.bio,
      emergency_contact_phone: formData.emergency_contact_phone,
    };

    const { error } = await supabase.from('profiles').update(updatedFields).eq('id', profile?.id);

    if (!error) {
      setProfile(updatedFields);
      setIsEditing(false);
      showToast("Profile updated successfully!");
    } else {
      showToast("Update failed. Please try again.");
    }
    setLoading(false);
  };

  const handleAvatarUpload = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setUploading(true);
        const asset = result.assets[0];
        
        const fileExt = asset.uri.split('.').pop();
        const filePath = `${profile?.id}/avatar.${fileExt}`;
        const arrayBuffer = decode(asset.base64!);
        
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, arrayBuffer, { 
            upsert: true,
            contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: publicUrl })
          .eq('id', profile?.id);

        if (updateError) throw updateError;

        setProfile({ avatar_url: publicUrl });
        showToast("Photo updated!");
      }
    } catch (error: any) {
      showToast(error.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const themeColor = profile?.role === 'driver' ? '#10b981' : '#2563eb';

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Header Bar */}
          <View style={styles.headerBar}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <ArrowLeftIcon size={24} color="#0f172a" />
            </TouchableOpacity>
            
            <View style={styles.headerActions}>
              {!isEditing ? (
                <TouchableOpacity style={styles.editBtn} onPress={() => setIsEditing(true)}>
                  <Edit3 size={16} color="#0f172a" />
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
              ) : (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsEditing(false)}>
                    <X size={20} color="#64748b" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleUpdateProfile} disabled={loading}>
                    <Save size={16} color="white" />
                    <Text style={styles.saveBtnText}>{loading ? '...' : 'Save'}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* Profile Header */}
          <View style={styles.profileHeaderBox}>
            <View style={styles.avatarWrapper}>
              <View style={[styles.avatarContainer, profile?.is_premium && styles.avatarPremium]}>
                {profile?.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
                ) : (
                  <UserCircle size={64} color="#94a3b8" />
                )}
              </View>
              {profile?.is_premium && (
                <View style={styles.premiumCrown}>
                  <Crown size={20} color="#000" />
                </View>
              )}
              <TouchableOpacity style={styles.cameraBtn} onPress={handleAvatarUpload} disabled={uploading}>
                {uploading ? <ActivityIndicator size="small" color="#000" /> : <Camera size={16} color="#000" />}
              </TouchableOpacity>
            </View>

            <Text style={styles.fullNameText}>{profile?.full_name || 'NexRide User'}</Text>
            <View style={[styles.roleBadge, { backgroundColor: profile?.role === 'driver' ? '#10b981' : '#2563eb' }]}>
              {profile?.role === 'driver' ? <Car size={14} color="white" /> : <UserCircle size={14} color="white" />}
              <Text style={styles.roleBadgeText}>{profile?.role?.toUpperCase()}</Text>
            </View>

            {/* XP Bar */}
            <View style={styles.xpContainer}>
              <View style={[styles.xpFill, { width: `${profile?.exp ?? 0}%`, backgroundColor: themeColor }]} />
              <Text style={styles.xpText}>{profile?.exp ?? 0} / 100 XP</Text>
            </View>
          </View>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity 
              style={[styles.tabBtn, activeTab === 'settings' && styles.tabBtnActive]} 
              onPress={() => setActiveTab('settings')}
            >
              <Text style={[styles.tabBtnText, activeTab === 'settings' && styles.tabBtnTextActive]}>Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tabBtn, activeTab === 'history' && styles.tabBtnActive]} 
              onPress={() => setActiveTab('history')}
            >
              <Text style={[styles.tabBtnText, activeTab === 'history' && styles.tabBtnTextActive]}>Trip History</Text>
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          {activeTab === 'history' ? (
            <View style={styles.historyContainer}>
              {tripHistory.length === 0 ? (
                <View style={styles.emptyHistory}>
                  <Car size={48} color="#cbd5e1" style={{ marginBottom: 16 }} />
                  <Text style={styles.emptyHistoryText}>No completed trips yet.</Text>
                </View>
              ) : (
                tripHistory.map(trip => (
                  <View key={trip.id} style={styles.tripCard}>
                    <View style={styles.tripHeader}>
                      <Text style={styles.tripDate}>
                        {new Date(trip.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </Text>
                      <Text style={[styles.tripFare, { color: themeColor }]}>₹{trip.fare_amount}</Text>
                    </View>
                    
                    <View style={styles.tripRoute}>
                      <View style={styles.tripLine} />
                      <View style={styles.tripPoint}>
                        <View style={[styles.tripDot, { backgroundColor: '#2563eb' }]} />
                        <Text style={styles.tripPointText}>{trip.pickup_name}</Text>
                      </View>
                      <View style={[styles.tripPoint, { marginTop: 16 }]}>
                        <View style={[styles.tripDot, { backgroundColor: '#10b981' }]} />
                        <Text style={styles.tripPointText}>{trip.dropoff_name}</Text>
                      </View>
                    </View>

                    {trip.rider_rating && (
                      <View style={styles.tripRating}>
                        <Star size={14} color="#fbbf24" fill="#fbbf24" />
                        <Text style={styles.tripRatingText}>{trip.rider_rating} Stars</Text>
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>
          ) : (
            <View style={styles.settingsContainer}>
              {/* Stats Bar */}
              <View style={styles.statsBar}>
                <View style={styles.statBox}>
                  <Award size={20} color="#0f172a" />
                  <View>
                    <Text style={styles.statValue}>{stats.totalRides}</Text>
                    <Text style={styles.statLabel}>Total Rides</Text>
                  </View>
                </View>
                <View style={styles.statBox}>
                  {profile?.role === 'driver' ? <Star size={20} color="#0f172a" /> : <Trophy size={20} color="#0f172a" />}
                  <View>
                    <Text style={styles.statValue}>{profile?.role === 'driver' ? (driverStats?.rating || '5.0') : `Level ${profile?.level || 1}`}</Text>
                    <Text style={styles.statLabel}>{profile?.role === 'driver' ? 'Rating' : 'Level'}</Text>
                  </View>
                </View>
                <View style={styles.statBox}>
                  <Clock size={20} color="#0f172a" />
                  <View>
                    <Text style={styles.statValue}>{stats.memberSince.split(' ')[1]}</Text>
                    <Text style={styles.statLabel}>Since</Text>
                  </View>
                </View>
              </View>

              {/* Form Fields */}
              <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>General Information</Text>
                
                <InfoField icon={<User size={18} color="#64748b" />} label="Full Name" value={formData.full_name} isEditing={isEditing} onChange={(val) => setFormData({...formData, full_name: val})} />
                <InfoField icon={<Mail size={18} color="#64748b" />} label="Email" value={profile?.email || 'N/A'} isEditing={false} />
                <InfoField icon={<Phone size={18} color="#64748b" />} label="Phone" value={formData.phone_number} isEditing={isEditing} onChange={(val) => setFormData({...formData, phone_number: val})} />
                <InfoField icon={<Calendar size={18} color="#64748b" />} label="Age" value={formData.age} type="numeric" isEditing={isEditing} onChange={(val) => setFormData({...formData, age: val})} />
                
                {/* Simplified Gender as Text for mobile parity without complex pickers */}
                <InfoField icon={<UserCircle size={18} color="#64748b" />} label="Gender" value={formData.gender} isEditing={isEditing} onChange={(val) => setFormData({...formData, gender: val})} />
                
                <InfoField icon={<MapPin size={18} color="#64748b" />} label="State" value={formData.state} isEditing={isEditing} onChange={(val) => setFormData({...formData, state: val})} />
                <InfoField icon={<MapPin size={18} color="#64748b" />} label="District / City" value={formData.district} isEditing={isEditing} onChange={(val) => setFormData({...formData, district: val})} />
                <InfoField icon={<MapPin size={18} color="#64748b" />} label="Area / House No." value={formData.area} isEditing={isEditing} onChange={(val) => setFormData({...formData, area: val})} />
                <InfoField icon={<Phone size={18} color="#ef4444" />} label="Emergency Contact" value={formData.emergency_contact_phone} isEditing={isEditing} onChange={(val) => setFormData({...formData, emergency_contact_phone: val})} highlight />
                
                <View style={styles.bioField}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Edit3 size={16} color="#64748b" />
                    <Text style={styles.fieldLabel}>Bio</Text>
                  </View>
                  {isEditing ? (
                    <TextInput 
                      style={styles.bioInput} 
                      value={formData.bio} 
                      onChangeText={(val) => setFormData({...formData, bio: val})} 
                      placeholder="Tell us about yourself..." 
                      multiline
                    />
                  ) : (
                    <Text style={[styles.fieldValue, !formData.bio && styles.placeholder]}>{formData.bio || 'No bio provided yet.'}</Text>
                  )}
                </View>
              </View>

              {/* Driver Specific Info */}
              {profile?.role === 'driver' && driverStats && (
                <View style={[styles.infoSection, { borderColor: '#10b981' }]}>
                  <Text style={styles.sectionTitle}>Vehicle & Professional Info</Text>
                  <View style={styles.staticField}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Car size={16} color="#64748b" /><Text style={styles.fieldLabel}>Vehicle Model</Text></View>
                    <Text style={styles.fieldValue}>{driverStats.vehicle_model}</Text>
                  </View>
                  <View style={styles.staticField}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Briefcase size={16} color="#64748b" /><Text style={styles.fieldLabel}>License Plate</Text></View>
                    <Text style={styles.fieldValue}>{driverStats.car_plate_number}</Text>
                  </View>
                  <View style={styles.staticField}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Star size={16} color="#64748b" /><Text style={styles.fieldLabel}>Driver Rating</Text></View>
                    <Text style={styles.fieldValue}>{driverStats.rating} / 5.0</Text>
                  </View>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const InfoField = ({ icon, label, value, isEditing, onChange, type = "default", highlight = false }: { icon: any, label: string, value: string, isEditing?: boolean, onChange?: (val: string) => void, type?: string, highlight?: boolean }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <View style={styles.infoField}>
      <View style={styles.fieldLabelRow}>
        {icon}
        <Text style={[styles.fieldLabel, highlight && { color: '#ef4444' }]}>{label}</Text>
      </View>
      {isEditing && onChange ? (
        <TextInput 
          style={styles.textInput} 
          value={value} 
          onChangeText={onChange} 
          keyboardType={type === 'numeric' ? 'number-pad' : 'default'}
          placeholder="Enter..."
        />
      ) : (
        <Text style={[styles.fieldValue, !value && styles.placeholder, { flex: 1, textAlign: 'right' }]}>{value || 'Not set'}</Text>
      )}
    </View>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 20 },
  headerBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  backBtn: { padding: 8, backgroundColor: colors.card, borderRadius: 12, ...Platform.select({ default: { elevation: 2 }, web: { boxShadow: '0 2px 8px rgba(0,0,0,0.05)' } as any }) },
  headerActions: { flexDirection: 'row' },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.card, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, ...Platform.select({ default: { elevation: 2 }, web: { boxShadow: '0 2px 8px rgba(0,0,0,0.05)' } as any }) },
  editBtnText: { fontWeight: '700', fontSize: 14, color: colors.text },
  cancelBtn: { padding: 10, backgroundColor: colors.card, borderRadius: 12, ...Platform.select({ default: { elevation: 2 } }) },
  saveBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  saveBtnText: { fontWeight: '700', fontSize: 14, color: colors.card },
  
  profileHeaderBox: { alignItems: 'center', marginBottom: 24 },
  avatarWrapper: { position: 'relative', marginBottom: 16 },
  avatarContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarPremium: { borderWidth: 4, borderColor: '#fbbf24' },
  avatarImage: { width: '100%', height: '100%' },
  premiumCrown: { position: 'absolute', top: -5, right: -5, backgroundColor: '#fbbf24', borderRadius: 15, padding: 6, zIndex: 10 },
  cameraBtn: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#fbbf24', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', zIndex: 11, borderWidth: 2, borderColor: colors.card },
  fullNameText: { fontSize: 24, fontWeight: '900', color: colors.text, marginBottom: 8 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  roleBadgeText: { color: colors.card, fontWeight: '800', fontSize: 12 },
  
  xpContainer: { width: '100%', maxWidth: 300, height: 24, backgroundColor: colors.border, borderRadius: 12, overflow: 'hidden', marginTop: 16, position: 'relative', justifyContent: 'center' },
  xpFill: { position: 'absolute', top: 0, bottom: 0, left: 0 },
  xpText: { position: 'absolute', width: '100%', textAlign: 'center', fontSize: 12, fontWeight: '800', color: colors.card, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: {width: 0, height: 1}, textShadowRadius: 2 },
  
  tabsContainer: { flexDirection: 'row', backgroundColor: colors.border, padding: 4, borderRadius: 12, marginBottom: 24 },
  tabBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  tabBtnActive: { backgroundColor: colors.card, ...Platform.select({ default: { elevation: 2 }, web: { boxShadow: '0 2px 8px rgba(0,0,0,0.1)' } as any }) },
  tabBtnText: { fontSize: 15, fontWeight: '600', color: colors.textMuted },
  tabBtnTextActive: { color: colors.text, fontWeight: '800' },

  historyContainer: { gap: 16 },
  emptyHistory: { alignItems: 'center', paddingVertical: 40 },
  emptyHistoryText: { color: colors.textMuted, fontSize: 16, fontWeight: '500' },
  tripCard: { backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
  tripHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  tripDate: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  tripFare: { fontSize: 16, fontWeight: '800' },
  tripRoute: { paddingLeft: 8, position: 'relative' },
  tripLine: { position: 'absolute', left: 13, top: 12, bottom: 12, width: 2, backgroundColor: colors.border },
  tripPoint: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tripDot: { width: 12, height: 12, borderRadius: 6 },
  tripPointText: { fontSize: 14, fontWeight: '600', color: colors.text },
  tripRating: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border },
  tripRatingText: { fontSize: 14, fontWeight: '700', color: '#fbbf24' },

  settingsContainer: { gap: 24 },
  statsBar: { flexDirection: 'row', gap: 12 },
  statBox: { flex: 1, backgroundColor: colors.card, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.border, gap: 8 },
  statValue: { fontSize: 18, fontWeight: '900', color: colors.text },
  statLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  
  infoSection: { backgroundColor: colors.card, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.border },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 16 },
  infoField: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.background },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  fieldValue: { fontSize: 14, fontWeight: '700', color: colors.text },
  placeholder: { color: colors.textMuted, fontStyle: 'italic', fontWeight: '400' },
  textInput: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, fontSize: 14, fontWeight: '600', color: colors.text, textAlign: 'right' },
  
  bioField: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.background },
  bioInput: { backgroundColor: colors.background, padding: 12, borderRadius: 12, minHeight: 80, textAlignVertical: 'top', fontSize: 14 },
  
  staticField: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.background }
});
