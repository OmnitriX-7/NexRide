import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Image, SafeAreaView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../supabaseClient';
import { useTheme } from '../theme';
import { useUserStore } from '../store';
import { Car, User, Crown, Trophy, CreditCard, Users, Star, ShieldAlert, Bot, LogOut, ChevronRight, Moon, Sun, History } from 'lucide-react-native';

import RateAppModal from './RateAppModal';
import ShareModal from './ShareModal';
import SOSModal from './SOSModal';
import HelpBot from './HelpBot';

export default function Navbar() {
  const { profile, setProfile, theme, toggleTheme } = useUserStore();
  const { colors, isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  const [showRateApp, setShowRateApp] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showSOS, setShowSOS] = useState(false);
  const [showHelpBot, setShowHelpBot] = useState(false);

  const navigation = useNavigation<any>();

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
    setIsOpen(false);
  };

  const confirmLogout = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setShowLogoutModal(false);
    // Routing is handled automatically by App.tsx when profile is null
  };

  const handleNav = (screen: string) => {
    setIsOpen(false);
    navigation.navigate(screen);
  };

  const styles = getStyles(colors);

  return (
    <>
      <SafeAreaView style={styles.headerSafeArea} pointerEvents="box-none">
        <View style={styles.headerContainer} pointerEvents="box-none">

          <TouchableOpacity 
            style={[styles.pfpButton, profile?.is_premium && styles.pfpButtonPremium]} 
            onPress={() => setIsOpen(true)}
          >
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.pfpImage} />
            ) : (
              <User size={20} color="white" />
            )}
            {profile?.is_premium && (
              <View style={styles.premiumBadge}>
                <Crown size={10} color="#000" />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Side Menu Modal */}
      <Modal visible={isOpen} transparent={true} animationType="fade">
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setIsOpen(false)}>
          <View style={styles.menuCard}>
            <TouchableOpacity style={styles.menuHeader} onPress={() => handleNav('Profile')}>
              <View style={[styles.largePfp, profile?.is_premium && styles.largePfpPremium]}>
                {profile?.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={styles.pfpImage} />
                ) : (
                  <User size={24} color="#2563eb" />
                )}
                {profile?.is_premium && (
                  <View style={styles.largePremiumBadge}>
                    <Crown size={12} color="#000" />
                  </View>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuHeaderName}>{profile?.full_name || 'User'}</Text>
                <Text style={styles.menuHeaderRole}>
                  {profile?.role === 'driver' ? 'Verified Driver' : 'NexRide Rider'}
                </Text>
              </View>
              <ChevronRight size={20} color="#cbd5e1" />
            </TouchableOpacity>

            <View style={styles.menuList}>
              <MenuBtn icon={<History size={20} color={colors.icon} />} label="Ride History" onPress={() => handleNav('RideHistory')} colors={colors} />
              <MenuBtn icon={<Trophy size={20} color={colors.icon} />} label="Leaderboard" onPress={() => handleNav('Leaderboard')} colors={colors} />
              <MenuBtn icon={<CreditCard size={20} color={colors.icon} />} label="Payments" onPress={() => handleNav('Payments')} colors={colors} />
              <MenuBtn icon={<Crown size={20} color={colors.warning} />} label="NexRide Elite" onPress={() => handleNav('Premium')} colors={colors} />
              <MenuBtn icon={<Users size={20} color={colors.primary} />} label="Refer a Friend" onPress={() => { setShowShare(true); setIsOpen(false); }} colors={colors} />
              <MenuBtn icon={<Star size={20} color={colors.icon} />} label="Rate App" onPress={() => { setShowRateApp(true); setIsOpen(false); }} colors={colors} />
              <MenuBtn icon={<ShieldAlert size={20} color={colors.danger} />} label="SOS / Safety" onPress={() => { setShowSOS(true); setIsOpen(false); }} colors={colors} />
              <MenuBtn icon={<Bot size={20} color={colors.primary} />} label="NexBot Support" onPress={() => { setShowHelpBot(true); setIsOpen(false); }} colors={colors} />
              
              <MenuBtn 
                icon={isDark ? <Sun size={20} color={colors.warning} /> : <Moon size={20} color={colors.icon} />} 
                label={isDark ? "Light Mode" : "Dark Mode"} 
                onPress={toggleTheme} 
                colors={colors} 
              />
              
              <MenuBtn icon={<LogOut size={20} color={colors.danger} />} label="Log Out" isDestructive onPress={handleLogoutClick} colors={colors} />
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Logout Modal */}
      <Modal visible={showLogoutModal} transparent={true} animationType="fade">
        <View style={styles.logoutModalOverlay}>
          <View style={styles.logoutModalBox}>
            <View style={styles.logoutIconBox}>
              <LogOut size={28} color="#ef4444" />
            </View>
            <Text style={styles.logoutTitle}>Sign Out</Text>
            <Text style={styles.logoutSubtitle}>Are you sure you want to log out of NexRide?</Text>
            
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
              <TouchableOpacity style={styles.cancelLogoutBtn} onPress={() => setShowLogoutModal(false)}>
                <Text style={styles.cancelLogoutText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmLogoutBtn} onPress={confirmLogout}>
                <Text style={styles.confirmLogoutText}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Feature Modals */}
      <RateAppModal visible={showRateApp} onClose={() => setShowRateApp(false)} userId={profile?.id || ''} />
      <ShareModal visible={showShare} onClose={() => setShowShare(false)} referralLink={`nexride.com/ref/${profile?.id}`} />
      <SOSModal visible={showSOS} onClose={() => setShowSOS(false)} onConfirm={() => setShowSOS(false)} />
      <HelpBot visible={showHelpBot} onClose={() => setShowHelpBot(false)} />
      
    </>
  );
}

const MenuBtn = ({ icon, label, onPress, isDestructive, colors }: any) => {
  const styles = getStyles(colors);
  return (
  <TouchableOpacity style={styles.menuBtn} onPress={onPress}>
    <View style={styles.menuBtnContent}>
      {icon}
      <Text style={[styles.menuBtnText, isDestructive && { color: colors.danger }]}>{label}</Text>
    </View>
  </TouchableOpacity>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  headerSafeArea: {
    paddingTop: Platform.OS === 'android' ? 40 : 0,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'white',
    padding: 4,
    paddingRight: 10,
    borderRadius: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
      android: { elevation: 5 },
      web: { boxShadow: '0 4px 10px rgba(0,0,0,0.1)' } as any,
    })
  },
  logoIcon: {
    backgroundColor: '#2563eb',
    padding: 2,
    borderRadius: 8,
  },
  logoText: {
    fontWeight: '900',
    fontSize: 12,
    color: '#2563eb',
  },
  pfpButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10 },
      android: { elevation: 5 },
      web: { boxShadow: '0 4px 10px rgba(0,0,0,0.2)' } as any,
    })
  },
  pfpButtonPremium: {
    borderWidth: 2,
    borderColor: '#fbbf24'
  },
  pfpImage: {
    width: '100%',
    height: '100%',
    borderRadius: 100,
  },
  premiumBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#fbbf24',
    borderRadius: 10,
    padding: 3,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  menuCard: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 80 : 60,
    right: 20,
    width: 220,
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20 },
      android: { elevation: 15 },
      web: { boxShadow: '0 20px 40px rgba(0,0,0,0.15)' } as any,
    })
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    backgroundColor: colors.background,
    borderRadius: 14,
    marginBottom: 4,
  },
  largePfp: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center'
  },
  largePfpPremium: {
    borderWidth: 2,
    borderColor: '#fbbf24'
  },
  largePremiumBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#fbbf24',
    borderRadius: 10,
    padding: 4,
  },
  menuHeaderName: {
    fontWeight: '800',
    fontSize: 14,
    color: colors.text
  },
  menuHeaderRole: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2
  },
  menuList: {
    gap: 2
  },
  menuBtn: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  menuBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  menuBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 8
  },
  logoutModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  logoutModalBox: {
    backgroundColor: colors.card,
    borderRadius: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center'
  },
  logoutIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  logoutTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginTop: 16
  },
  logoutSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22
  },
  cancelLogoutBtn: {
    flex: 1,
    backgroundColor: colors.background,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center'
  },
  cancelLogoutText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 16
  },
  confirmLogoutBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#ef4444',
    alignItems: 'center'
  },
  confirmLogoutText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16
  }
});
