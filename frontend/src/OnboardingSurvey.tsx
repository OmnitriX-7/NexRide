import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css'; 
import LoadingScreen from './LoadingScreen'; 
import { useUserStore } from './store'; 
import { supabase } from './supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { VEHICLE_MODELS } from './utils/vehicles';
import { ChevronDown, Search, X } from 'lucide-react';

export default function OnboardingSurvey() {
  const navigate = useNavigate();
  const { setProfile, setHasProfile } = useUserStore();

  // Unified Form State
  const [fullname, setFullname] = useState('');
  const [phoneNo, setPhoneNo] = useState<string | undefined>('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [stateName, setStateName] = useState('');
  const [district, setDistrict] = useState('');
  const [area, setArea] = useState('');
  const [role, setRole] = useState<'rider' | 'driver' | ''>('');
  
  // Driver specific
  const [vehicleModel, setVehicleModel] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const filteredVehicles = VEHICLE_MODELS.filter(v => v.name.toLowerCase().includes(vehicleSearch.toLowerCase()));
  
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');

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
          if (data.onboarded === true) {
            navigate('/home', { replace: true });
          } else {
            if (data.full_name) setFullname(data.full_name);
            if (data.phone_number) setPhoneNo(data.phone_number);
          }
        }
      }
    };
    checkResumeState();
  }, [navigate]);

  if (statusMessage === 'loading') {
    return <LoadingScreen />;
  }

  const validateForm = () => {
    if (!fullname.trim()) return "Please enter your name.";
    if (!/^[A-Z]/.test(fullname.trim())) return "Please capitalize the first letter of your name.";
    if (!phoneNo || !isValidPhoneNumber(phoneNo)) return "Please enter a valid phone number.";
    if (!age || isNaN(Number(age)) || Number(age) < 18) return "You must be at least 18 years old.";
    if (!gender) return "Please select a gender.";
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
      setStatusMessage('loading');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user session found");

      const { error: rpcError } = await supabase.rpc('complete_onboarding', {
        p_full_name: fullname.trim(),
        p_phone: phoneNo,
        p_age: parseInt(age),
        p_gender: gender,
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
      navigate('/home', { replace: true });

    } catch (err) {
      console.error(err);
      setStatusMessage('Error saving profile. Try again.');
      setError('Failed to complete onboarding. Please check your connection.');
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '14px 16px', borderRadius: '12px',
    border: '1px solid #e2e8f0', backgroundColor: '#f8fafc',
    fontSize: '16px', color: '#0f172a', transition: 'all 0.2s', outline: 'none'
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#334155'
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px', fontFamily: '"Inter", sans-serif' }}>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ width: '100%', maxWidth: '600px', backgroundColor: 'white', borderRadius: '24px', padding: '32px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>Welcome to NexRide</h1>
          <p style={{ color: '#64748b', fontSize: '16px', margin: 0 }}>Let's get your profile set up in one go.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Section: Basic Info */}
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>Basic Info</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Full Name</label>
                <input style={inputStyle} placeholder="John Doe" value={fullname} onChange={e => setFullname(e.target.value)} />
              </div>

              <div>
                <label style={labelStyle}>Phone Number</label>
                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px' }}>
                  <PhoneInput placeholder="Enter phone number" value={phoneNo} onChange={setPhoneNo} defaultCountry="US" className="custom-phone-input" />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Age</label>
                  <input style={inputStyle} type="number" placeholder="25" value={age} onChange={e => setAge(e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Gender</label>
                  <select style={inputStyle} value={gender} onChange={e => setGender(e.target.value)}>
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Location */}
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginTop: '8px' }}>Location</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>State / Province</label>
                  <input style={inputStyle} placeholder="e.g. California" value={stateName} onChange={e => setStateName(e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>District / City</label>
                  <input style={inputStyle} placeholder="e.g. San Francisco" value={district} onChange={e => setDistrict(e.target.value)} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Area / House No.</label>
                <input style={inputStyle} placeholder="e.g. Apt 4B, Silicon Ave" value={area} onChange={e => setArea(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Section: Role */}
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginTop: '8px' }}>I want to...</h3>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div 
                onClick={() => setRole('rider')}
                style={{ flex: 1, padding: '20px', borderRadius: '16px', border: `2px solid ${role === 'rider' ? '#2563eb' : '#e2e8f0'}`, backgroundColor: role === 'rider' ? '#eff6ff' : 'white', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}
              >
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>👋</div>
                <div style={{ fontWeight: '700', color: role === 'rider' ? '#1d4ed8' : '#334155' }}>Ride</div>
              </div>
              <div 
                onClick={() => setRole('driver')}
                style={{ flex: 1, padding: '20px', borderRadius: '16px', border: `2px solid ${role === 'driver' ? '#2563eb' : '#e2e8f0'}`, backgroundColor: role === 'driver' ? '#eff6ff' : 'white', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}
              >
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>🚗</div>
                <div style={{ fontWeight: '700', color: role === 'driver' ? '#1d4ed8' : '#334155' }}>Drive</div>
              </div>
            </div>
          </div>

          {/* Dynamic Section: Driver */}
          {role === 'driver' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ overflow: 'hidden' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginTop: '8px' }}>Vehicle Details</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ position: 'relative' }}>
                  <label style={labelStyle}>Vehicle Model</label>
                  <div 
                    onClick={() => setShowVehicleDropdown(!showVehicleDropdown)}
                    style={{ ...inputStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', backgroundColor: 'white' }}
                  >
                    {vehicleModel ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img src={VEHICLE_MODELS.find(v => v.id === vehicleModel)?.image} alt="car" style={{ width: '40px', height: '30px', objectFit: 'cover', borderRadius: '4px' }} />
                        <span style={{ fontWeight: '500' }}>{VEHICLE_MODELS.find(v => v.id === vehicleModel)?.name}</span>
                      </div>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>Select a Model</span>
                    )}
                    <ChevronDown size={20} color="#64748b" />
                  </div>
                  
                  <AnimatePresence>
                    {showVehicleDropdown && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: -10 }}
                        style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)', zIndex: 50, border: '1px solid #e2e8f0', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '300px' }}
                      >
                        <div style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f8fafc' }}>
                          <Search size={18} color="#64748b" />
                          <input 
                            autoFocus
                            placeholder="Search models..." 
                            value={vehicleSearch} 
                            onChange={e => setVehicleSearch(e.target.value)} 
                            style={{ flex: 1, border: 'none', outline: 'none', backgroundColor: 'transparent', fontSize: '15px' }} 
                          />
                          <X size={18} color="#94a3b8" style={{ cursor: 'pointer' }} onClick={() => setShowVehicleDropdown(false)} />
                        </div>
                        <div style={{ overflowY: 'auto' }}>
                          {filteredVehicles.map(model => (
                            <div 
                              key={model.id} 
                              onClick={() => { setVehicleModel(model.id); setShowVehicleDropdown(false); }}
                              style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', backgroundColor: vehicleModel === model.id ? '#eff6ff' : 'white' }}
                              onMouseEnter={(e) => { if (vehicleModel !== model.id) e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                              onMouseLeave={(e) => { if (vehicleModel !== model.id) e.currentTarget.style.backgroundColor = 'white'; }}
                            >
                              <img src={model.image} alt={model.name} style={{ width: '60px', height: '40px', objectFit: 'cover', borderRadius: '6px' }} />
                              <span style={{ fontSize: '15px', color: vehicleModel === model.id ? '#1d4ed8' : '#334155', fontWeight: vehicleModel === model.id ? '600' : '500' }}>{model.name}</span>
                            </div>
                          ))}
                          {filteredVehicles.length === 0 && (
                            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>No models found</div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div>
                  <label style={labelStyle}>License Plate Number</label>
                  <input style={inputStyle} placeholder="e.g. ABC 1234" value={plateNumber} onChange={e => setPlateNumber(e.target.value.toUpperCase())} />
                </div>
              </div>
            </motion.div>
          )}

          {error && (
            <div style={{ backgroundColor: '#fef2f2', color: '#ef4444', padding: '16px', borderRadius: '12px', fontSize: '14px', fontWeight: '500', textAlign: 'center' }}>
              {error}
            </div>
          )}

          <button 
            onClick={handleSubmit}
            style={{ width: '100%', padding: '18px', backgroundColor: '#0f172a', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', marginTop: '8px', transition: 'background 0.2s' }}
            onMouseOver={e => e.currentTarget.style.backgroundColor = '#1e293b'}
            onMouseOut={e => e.currentTarget.style.backgroundColor = '#0f172a'}
          >
            Complete Setup &rarr;
          </button>

        </div>
      </motion.div>

      <style>{`
        .custom-phone-input {
          display: flex;
          align-items: center;
        }
        .PhoneInputInput {
          border: none;
          background: transparent;
          font-size: 16px;
          color: #0f172a;
          outline: none;
          flex: 1;
          margin-left: 10px;
        }
      `}</style>
    </div>
  );
}
