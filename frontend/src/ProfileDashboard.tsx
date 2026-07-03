import React, { useState, useEffect, useRef } from 'react';
import { 
  User, Phone, Mail, MapPin, Calendar, 
  Briefcase, Camera, Save, X, Edit3, 
  UserCircle, Car, Star, ArrowLeft, Trophy,
  Clock, Award, Crown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { useUserStore } from './store';
import './ProfileDashboard.css';

interface ProfileFormData {
  full_name: string;
  phone_number: string;
  age: string | number;
  gender: string;
  state: string;
  district: string;
  area: string;
  bio: string;
  emergency_contact_phone: string;
}

const ProfileDashboard = () => {
  const { profile, setProfile, showToast } = useUserStore();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stats, setStats] = useState({ totalRides: 0, memberSince: '' });

  const [formData, setFormData] = useState<ProfileFormData>({
    full_name: profile?.full_name || '',
    phone_number: profile?.phone_number || '',
    age: profile?.age || '',
    gender: profile?.gender || '',
    state: profile?.state || '',
    district: profile?.district || '',
    area: profile?.area || '',
    bio: profile?.bio || '',
    emergency_contact_phone: profile?.emergency_contact_phone || '',
  });

  const [driverStats, setDriverStats] = useState<any>(null);

  // Sync local form state when profile data becomes available (e.g. after refresh/fetch)
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

  // Fetch Extra Infos: Email from Auth & Ride Stats
  useEffect(() => {
    const fetchFullProfile = async () => {
      if (!profile?.id) return;

      // 1. Fetch Email from Auth if missing from profile
      if (!profile.email) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) setProfile({ email: user.email });
      }

      // 2. Fetch Completed Rides Count
      const { count } = await supabase
        .from('ride_dispatches')
        .select('*', { count: 'exact', head: true })
        .eq(profile.role === 'driver' ? 'driver_id' : 'rider_id', profile.id)
        .eq('status', 'completed');
      
      setStats({
        totalRides: count || 0,
        memberSince: new Date(profile.created_at || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      });

      if (profile.role === 'driver') fetchDriverDetails();
    };

    fetchFullProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const fetchDriverDetails = async () => {
    const { data } = await supabase
      .from('drivers')
      .select('vehicle_model, car_plate_number, rating')
      .eq('id', profile?.id)
      .maybeSingle();
    if (data) setDriverStats(data);
  };

  const handleUpdateProfile = async () => {
    const ageValue = formData.age !== '' ? parseInt(formData.age.toString()) : null;
    if (ageValue !== null && ageValue < 0) {
      showToast("age cant be negative");
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

    const { error } = await supabase
      .from('profiles')
      .update(updatedFields)
      .eq('id', profile?.id);

    if (!error) {
      setProfile(updatedFields);
      setIsEditing(false);
      showToast("Profile updated successfully!");
    } else {
      showToast("Update failed. Please try again.");
      // Revert formData to original profile data if update fails
      setFormData({
        ...formData, // Keep current input values
        // Potentially revert specific fields from `profile` if error is field-specific
      });
    }
    setLoading(false);
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) return;
      
      const file = event.target.files[0];

      // Improvement: Validate file size (e.g., limit to 2MB)
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        throw new Error("File size must be less than 2MB");
      }

      // Improvement: Validate file type
      if (!file.type.startsWith('image/')) { // Only allow image files
        throw new Error("Only image files are allowed");
      }

      const fileExt = file.name.split('.').pop();
      const filePath = `${profile?.id}/avatar.${fileExt}`;

      // 1. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

      // 3. Update Profile Table
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile?.id);

      if (updateError) throw updateError;

      setProfile({ avatar_url: publicUrl });
      showToast("Photo updated!");
    } catch (error: any) {
      showToast(error.message);
    } finally {
      setUploading(false);
    }
  };

  const themeColor = profile?.role === 'driver' ? '#10b981' : '#2563eb';

  if (!profile) return null;

  return (
    <div className="profile-container" style={{ '--accent': themeColor } as any}>
      <div className="profile-card">
        {/* Navigation & Actions */}
        <button className="back-nav-btn" onClick={() => navigate('/home')}>
          <ArrowLeft size={18} /> Back to Home
        </button>

        <div className="header-actions">
          {!isEditing ? (
            <button className="header-edit-btn" onClick={() => setIsEditing(true)}>
              <Edit3 size={16} /> Edit
            </button>
          ) : (
            <div className="header-save-actions">
              <button className="header-cancel-btn" onClick={() => setIsEditing(false)}><X size={16} /></button>
              <button className="header-save-btn" onClick={handleUpdateProfile} disabled={loading}>
                <Save size={16} /> {loading ? '...' : 'Save'}
              </button>
            </div>
          )}
        </div>

        {/* Header Section */}
        <div className="profile-header">
          <div className="header-main">
            <div className="avatar-wrapper" style={{ border: profile?.is_premium ? '4px solid #fbbf24' : 'none', position: 'relative' }}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="avatar-img" />
              ) : (
                <div className="avatar-placeholder"><UserCircle size={60} /></div>
              )}
              {profile?.is_premium && (
                <div style={{ position: 'absolute', top: '-12px', right: '-12px', background: '#fbbf24', borderRadius: '50%', padding: '4px', zIndex: 10 }}>
                  <Crown size={24} color="#000" />
                </div>
              )}
              <button className="avatar-edit-btn" onClick={() => fileInputRef.current?.click()} style={{ zIndex: 11 }}>
                {uploading ? "..." : <Camera size={18} />}
              </button>
              <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} hidden accept="image/*" />
            </div>
            
            <div className="header-info">
              <h2>{profile?.full_name || 'NexRide User'}</h2>
              <span className={`role-badge ${profile?.role}`}>
                {profile?.role === 'driver' ? <Car size={14} /> : <UserCircle size={14} />}
                {profile?.role?.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Experience Bar - Now inside the header box */}
          <div className="exp-progress-container">
            <div 
              className="exp-progress-fill" 
              style={{ width: `${profile?.exp ?? 0}%` }}
            />
            <span className="exp-progress-text">
              {profile?.exp ?? 0} / 100 XP
            </span>
          </div>
        </div>

        {/* Content Sections */}
        <div className="profile-content">
          {/* Stats Bar */}
          <div className="stats-bar">
            <div className="stat-item">
              <Award size={20} className="stat-icon" />
              <div>
                <span className="stat-value">{stats.totalRides}</span>
                <span className="stat-label">Total Rides</span>
              </div>
            </div>
            <div className="stat-item">
              {profile?.role === 'driver' ? (
                <Star size={20} className="stat-icon" />
              ) : (
                <Trophy size={20} className="stat-icon" />
              )}
              <div>
                <span className="stat-value">
                  {profile?.role === 'driver' 
                    ? (driverStats?.rating || '5.0') 
                    : `Level ${profile?.level || 1}`}
                </span>
                <span className="stat-label">{profile?.role === 'driver' ? 'Rating' : 'Level'}</span>
              </div>
            </div>
            <div className="stat-item">
              <Clock size={20} className="stat-icon" />
              <div>
                <span className="stat-value">{stats.memberSince}</span>
                <span className="stat-label">Member Since</span>
              </div>
            </div>
          </div>

          {/* General Information */}
          <section className="info-section">
            <h3>General Information</h3>
            <div className="info-grid">
              <InfoField 
                icon={<User size={18} />} 
                label="Full Name" 
                value={formData.full_name} 
                isEditing={isEditing} 
                onChange={(val: string) => setFormData({...formData, full_name: val})} 
              />
              <InfoField 
                icon={<Mail size={18} />} 
                label="Email" 
                value={profile?.email || 'N/A'} 
                isEditing={false} // Email is usually immutable from profile dashboard
              />
              <InfoField 
                icon={<Phone size={18} />} 
                label="Phone" 
                value={formData.phone_number} 
                isEditing={isEditing} 
                onChange={(val: string) => setFormData({...formData, phone_number: val})} 
              />
              <InfoField 
                icon={<Calendar size={18} />} 
                label="Age" 
                value={formData.age} 
                type="number"
                isEditing={isEditing} 
                onChange={(val: string) => setFormData({...formData, age: val})} 
              />
              <InfoField 
                icon={<UserCircle size={18} />} 
                label="Gender" 
                value={formData.gender} 
                isEditing={isEditing} 
                onChange={(val: string) => setFormData({...formData, gender: val})} 
                isSelect
                options={['Male', 'Female', 'Other', 'Prefer not to say']}
              />
              <InfoField 
                icon={<MapPin size={18} />} 
                label="State" 
                value={formData.state} 
                isEditing={isEditing} 
                onChange={(val: string) => setFormData({...formData, state: val})} 
              />
              <InfoField 
                icon={<MapPin size={18} />} 
                label="District / City" 
                value={formData.district} 
                isEditing={isEditing} 
                onChange={(val: string) => setFormData({...formData, district: val})} 
              />
              <InfoField 
                icon={<MapPin size={18} />} 
                label="Area / House No." 
                value={formData.area} 
                isEditing={isEditing} 
                onChange={(val: string) => setFormData({...formData, area: val})} 
              />
              <InfoField 
                icon={<Phone size={18} color="#ef4444" />} 
                label="Emergency Contact" 
                value={formData.emergency_contact_phone} 
                isEditing={isEditing} 
                onChange={(val: string) => setFormData({...formData, emergency_contact_phone: val})} 
              />
            </div>
            
            <div className="bio-field">
              <label><Edit3 size={16} /> Bio</label>
              {isEditing ? (
                <textarea 
                  value={formData.bio} 
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  placeholder="Tell us about yourself..."
                />
              ) : (
                <p className={!formData.bio ? 'placeholder' : ''}>
                  {formData.bio || 'No bio provided yet.'}
                </p>
              )}
            </div>
          </section>

          {/* Role Specific Section */}
          {profile?.role === 'driver' && driverStats && (
            <section className="info-section role-specific">
              <h3>Vehicle & Professional Info</h3>
              <div className="info-grid">
                <div className="static-field">
                  <span className="field-label"><Car size={16} /> Vehicle Model</span>
                  <span className="field-value">{driverStats.vehicle_model}</span>
                </div>
                <div className="static-field">
                  <span className="field-label"><Briefcase size={16} /> License Plate</span>
                  <span className="field-value">{driverStats.car_plate_number}</span>
                </div>
                <div className="static-field">
                  <span className="field-label"><Star size={16} /> Driver Rating</span>
                  <span className="field-value">{driverStats.rating} / 5.0</span>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

interface InfoFieldProps {
  icon: React.ReactNode;
  label: string;
  value: string | number | undefined;
  isEditing: boolean;
  onChange?: (val: string) => void;
  type?: string;
  isSelect?: boolean;
  options?: string[];
}

const InfoField = ({ icon, label, value, isEditing, onChange, type = "text", isSelect = false, options = [] }: InfoFieldProps) => (
  <div className="info-field">
    <span className="field-label">{icon} {label}</span>
    {isEditing ? (
      isSelect && onChange ? (
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select...</option>
          {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      ) : onChange ? (
        <input 
          type={type} 
          value={value ?? ''} 
          onChange={(e) => onChange(e.target.value)} 
          min={type === "number" ? 0 : undefined}
        />
      ) : (
        <span className={`field-value ${!value ? 'placeholder' : ''}`}>{value || 'Not set'}</span>
      )
    ) : (
      <span className={`field-value ${!value ? 'placeholder' : ''}`}>{value || 'Not set'}</span>
    )}
  </div>
);

export default ProfileDashboard;