import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TextInput, 
  TouchableOpacity, ActivityIndicator, SafeAreaView, Platform, KeyboardAvoidingView,
  Modal, FlatList, Image
} from 'react-native';
import { supabase } from '../supabaseClient';
import { useUserStore } from '../store';
import { User, MapPin, Car, Info, Phone, ChevronDown, Search, X } from 'lucide-react-native';
import { VEHICLE_MODELS } from '../utils/vehicles';

export default function OnboardingScreen({ navigation }: any) {
  const { setProfile, setHasProfile } = useUserStore();

  const [fullname, setFullname] = useState('');
  const [phoneNo, setPhoneNo] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [stateName, setStateName] = useState('');
  const [district, setDistrict] = useState('');
  const [area, setArea] = useState('');
  const [role, setRole] = useState<'rider' | 'driver' | ''>('');
  
  const [vehicleModel, setVehicleModel] = useState('');
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const filteredVehicles = VEHICLE_MODELS.filter(v => v.name.toLowerCase().includes(vehicleSearch.toLowerCase()));

  useEffect(() => {
    const checkResumeState = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, phone_number, role, onboarded')
          .eq('id', user.id)
          .single();

        if (data) {
          if (data.onboarded) {
            setHasProfile(true);
          } else {
            if (data.full_name) setFullname(data.full_name);
            if (data.phone_number) setPhoneNo(data.phone_number);
          }
        }
      }
    };
    checkResumeState();
  }, []);

  const validateForm = () => {
    if (!fullname.trim()) return "Please enter your name.";
    if (!/^[A-Z]/.test(fullname.trim())) return "Please capitalize the first letter of your name.";
    if (!phoneNo.trim()) return "Please enter a valid phone number.";
    if (!age || isNaN(Number(age)) || Number(age) < 18) return "You must be at least 18 years old.";
    if (!gender) return "Please enter your gender.";
    if (!stateName.trim() || !district.trim() || !area.trim()) return "Please fill in your complete location details.";
    if (!role) return "Please select if you want to ride or drive.";
    
    if (role === 'driver') {
      if (!vehicleModel) return "Please select a vehicle model.";
      if (!plateNumber.trim()) return "Please enter your license plate number.";
    }
    
    return "";
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    
    try {
      setIsLoading(true);
      setError('');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user session found");

      const { error: rpcError } = await supabase.rpc('complete_onboarding', {
        p_full_name: fullname.trim(),
        p_phone: phoneNo.trim(),
        p_age: parseInt(age),
        p_gender: gender.trim(),
        p_state: stateName.trim(),
        p_district: district.trim(),
        p_area: area.trim(),
        p_role: role,
        p_vehicle_model: role === 'driver' ? vehicleModel : null,
        p_plate_number: role === 'driver' ? plateNumber.trim() : null
      });

      if (rpcError) throw rpcError;
      
      if (role === 'driver') {
        const { error: ratingError } = await supabase.from('drivers').update({ rating: 0, reviews_count: 0 }).eq('id', user.id);
        if (ratingError) console.error("Failed to reset rating:", ratingError);
      }

      setProfile({
        id: user.id,
        full_name: fullname.trim(),
        role: role as 'rider' | 'driver',
        onboarded: true
      });
      setHasProfile(true); 
      // Navigation is automatically handled by App.tsx since hasProfile changes
    } catch (err: any) {
      setError(err.message || 'Failed to complete onboarding. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={styles.headerBox}>
            <Text style={styles.title}>Welcome to NexRide</Text>
            <Text style={styles.subtitle}>Let's get your profile set up in one go.</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Info</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput style={styles.input} placeholder="John Doe" value={fullname} onChangeText={setFullname} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput style={styles.input} placeholder="+1 234 567 8900" value={phoneNo} onChangeText={setPhoneNo} keyboardType="phone-pad" />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Age</Text>
                <TextInput style={styles.input} placeholder="25" value={age} onChangeText={setAge} keyboardType="numeric" />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Gender</Text>
                <TextInput style={styles.input} placeholder="Male/Female" value={gender} onChangeText={setGender} />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>State / Province</Text>
                <TextInput style={styles.input} placeholder="e.g. California" value={stateName} onChangeText={setStateName} />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>District / City</Text>
                <TextInput style={styles.input} placeholder="e.g. SF" value={district} onChangeText={setDistrict} />
              </View>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Area / House No.</Text>
              <TextInput style={styles.input} placeholder="e.g. Apt 4B, Silicon Ave" value={area} onChangeText={setArea} />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>I want to...</Text>
            <View style={styles.roleGrid}>
              <TouchableOpacity 
                style={[styles.roleCard, role === 'rider' && styles.roleCardActive]} 
                onPress={() => setRole('rider')}
              >
                <Text style={styles.roleEmoji}>👋</Text>
                <Text style={[styles.roleText, role === 'rider' && styles.roleTextActive]}>Ride</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.roleCard, role === 'driver' && styles.roleCardActive]} 
                onPress={() => setRole('driver')}
              >
                <Text style={styles.roleEmoji}>🚗</Text>
                <Text style={[styles.roleText, role === 'driver' && styles.roleTextActive]}>Drive</Text>
              </TouchableOpacity>
            </View>
          </View>

          {role === 'driver' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Vehicle Details</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Vehicle Model</Text>
                <TouchableOpacity 
                  style={styles.dropdownTrigger} 
                  onPress={() => setShowVehicleModal(true)}
                >
                  {vehicleModel ? (
                    <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
                      <Image source={VEHICLE_MODELS.find(v => v.id === vehicleModel)?.image} style={styles.dropdownTriggerImg} />
                      <Text style={styles.dropdownTriggerText}>{VEHICLE_MODELS.find(v => v.id === vehicleModel)?.name}</Text>
                    </View>
                  ) : (
                    <Text style={styles.dropdownTriggerPlaceholder}>Select a vehicle model</Text>
                  )}
                  <ChevronDown size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>License Plate Number</Text>
                <TextInput style={styles.input} placeholder="e.g. ABC 1234" value={plateNumber} onChangeText={(val) => setPlateNumber(val.toUpperCase())} autoCapitalize="characters" />
              </View>
            </View>
          )}

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitBtnText}>Complete Setup →</Text>
            )}
          </TouchableOpacity>
          
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Vehicle Selection Modal */}
      <Modal visible={showVehicleModal} transparent animationType="slide" onRequestClose={() => setShowVehicleModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.vehicleModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Vehicle</Text>
              <TouchableOpacity onPress={() => setShowVehicleModal(false)} style={styles.closeBtn}>
                <X size={24} color="#0f172a" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.searchInputContainer}>
              <Search size={20} color="#64748b" style={{marginLeft: 12}} />
              <TextInput 
                style={styles.searchInput} 
                placeholder="Search models..." 
                value={vehicleSearch} 
                onChangeText={setVehicleSearch}
              />
            </View>

            <FlatList 
              data={filteredVehicles}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[styles.vehicleOption, vehicleModel === item.id && styles.vehicleOptionActive]} 
                  onPress={() => {
                    setVehicleModel(item.id);
                    setShowVehicleModal(false);
                  }}
                >
                  <Image source={item.image} style={styles.vehicleOptionImg} />
                  <Text style={[styles.vehicleOptionText, vehicleModel === item.id && styles.vehicleOptionTextActive]}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  scrollContent: { padding: 24, paddingBottom: 60 },
  headerBox: { alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 28, fontWeight: '900', color: '#0f172a', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#64748b', textAlign: 'center' },
  
  section: { backgroundColor: 'white', padding: 20, borderRadius: 24, marginBottom: 20, ...Platform.select({ default: { elevation: 2 }, web: { boxShadow: '0 4px 12px rgba(0,0,0,0.05)' } as any }) },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingBottom: 8 },
  
  row: { flexDirection: 'row', gap: 12 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '700', color: '#334155', marginBottom: 8 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#0f172a' },
  
  roleGrid: { flexDirection: 'row', gap: 12 },
  roleCard: { flex: 1, backgroundColor: 'white', borderWidth: 2, borderColor: '#e2e8f0', borderRadius: 16, padding: 20, alignItems: 'center' },
  roleCardActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  roleEmoji: { fontSize: 28, marginBottom: 8 },
  roleText: { fontSize: 16, fontWeight: '800', color: '#334155' },
  roleTextActive: { color: '#1d4ed8' },

  // Dropdown Styles
  dropdownTrigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  dropdownTriggerPlaceholder: { color: '#94a3b8', fontSize: 15 },
  dropdownTriggerText: { color: '#0f172a', fontSize: 15, fontWeight: '500', marginLeft: 12 },
  dropdownTriggerImg: { width: 32, height: 24, resizeMode: 'cover', borderRadius: 4 },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  vehicleModal: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '80%', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  closeBtn: { padding: 4 },
  searchInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 12, marginBottom: 16 },
  searchInput: { flex: 1, padding: 12, fontSize: 16, color: '#0f172a' },
  vehicleOption: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  vehicleOptionActive: { backgroundColor: '#eff6ff' },
  vehicleOptionImg: { width: 64, height: 48, resizeMode: 'cover', borderRadius: 8, marginRight: 16 },
  vehicleOptionText: { fontSize: 16, color: '#334155', fontWeight: '500', flex: 1 },
  vehicleOptionTextActive: { color: '#3b82f6', fontWeight: '700' },

  errorBox: { backgroundColor: '#fef2f2', padding: 16, borderRadius: 12, marginBottom: 20 },
  errorText: { color: '#ef4444', fontWeight: '600', textAlign: 'center' },

  submitBtn: { backgroundColor: '#0f172a', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 8 },
  submitBtnText: { color: 'white', fontSize: 16, fontWeight: '800' }
});
