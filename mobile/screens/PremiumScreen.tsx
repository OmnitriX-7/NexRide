import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  SafeAreaView, Platform, ActivityIndicator, Modal
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../supabaseClient';
import { useUserStore } from '../store';
import { Crown, Star, ShieldCheck, Zap, ArrowRight, CheckCircle2, Clock, ArrowLeft as ArrowLeftIcon, CreditCard, Wallet, X } from 'lucide-react-native';
import PaymentGateway from '../components/PaymentGateway';
import { useTheme } from '../theme';

export default function PremiumScreen() {
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);
  const { profile, setProfile, showToast } = useUserStore();
  const navigation = useNavigation();
  const [showPayment, setShowPayment] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);

  const handleSubscribe = async () => {
    if (!profile?.id) return;
    setIsLoading(true);
    setTimeout(() => {
      setShowPayment(true);
      setIsLoading(false);
    }, 1000);
  };

  const handlePaymentSuccess = async () => {
    setShowPayment(false);
    
    // Fake the premium upgrade via db
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);

    const { error } = await supabase
      .from('profiles')
      .update({ is_premium: true, premium_expires_at: expiry.toISOString() })
      .eq('id', profile?.id);

    if (!error) {
      setProfile({ ...profile!, is_premium: true, premium_expires_at: expiry.toISOString() });
      showToast('Welcome to NexRide Elite! 🎉');
    } else {
      showToast('Failed to update premium status.');
    }
  };

  const handleWalletPurchase = async () => {
    if (!profile?.id || (profile.wallet_balance || 0) < 499) return;
    setWalletLoading(true);
    try {
      const { error } = await supabase.rpc('subscribe_premium');
      
      if (error) throw error;
      const { data } = await supabase.from('profiles').select('*').eq('id', profile.id).single();
      if (data) {
        setProfile(data);
      }
      showToast('Welcome to NexRide Elite! 🎉');
    } catch (err) {
      showToast('Error processing wallet payment.');
    } finally {
      setWalletLoading(false);
    }
  };

  const getDaysRemaining = () => {
    if (!profile?.premium_expires_at) return 30;
    const expiry = new Date(profile.premium_expires_at);
    const today = new Date();
    const diffTime = Math.abs(expiry.getTime() - today.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (profile?.is_premium) {
    return (
      <SafeAreaView style={styles.containerDark}>
        <View style={styles.headerDark}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtnDark}>
            <ArrowLeftIcon size={24} color="white" />
          </TouchableOpacity>
        </View>

        <View style={styles.premiumActiveContainer}>
          <View style={styles.crownIconLarge}>
            <Crown size={64} color="#fbbf24" />
          </View>
          <Text style={styles.activeTitle}>You are an Elite Member!</Text>
          <Text style={styles.activeDesc}>Thank you for subscribing to NexRide Elite. Enjoy your 10% discounts on all rides, priority matching, and your exclusive profile badge.</Text>
          
          <View style={styles.expiryBadge}>
            <Clock size={20} color="#d97706" />
            <Text style={styles.expiryText}>Your Elite benefits expire in {getDaysRemaining()} days.</Text>
          </View>
          
          <View style={styles.perksGrid}>
            <View style={styles.perkActive}><CheckCircle2 color="#22c55e" size={20} /><Text style={styles.perkActiveText}>10% Off All Rides</Text></View>
            <View style={styles.perkActive}><CheckCircle2 color="#22c55e" size={20} /><Text style={styles.perkActiveText}>Priority Matching</Text></View>
            <View style={styles.perkActive}><CheckCircle2 color="#22c55e" size={20} /><Text style={styles.perkActiveText}>Elite Profile Badge</Text></View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeftIcon size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.premiumHeader}>
          <View style={styles.premiumBadge}>
            <Crown size={20} color="#fbbf24" />
            <Text style={styles.premiumBadgeText}>NEXRIDE ELITE</Text>
          </View>
          
          <Text style={styles.mainTitle}>Upgrade your daily commute.</Text>
          <Text style={styles.mainDesc}>Get exclusive perks, huge savings, and ride in style.</Text>
        </View>

        <View style={styles.featuresGrid}>
          <View style={styles.featureCard}>
            <View style={styles.featureIcon}><Zap size={24} color="#a855f7" /></View>
            <Text style={styles.featureTitle}>10% Off Every Ride</Text>
            <Text style={styles.featureDesc}>Save money instantly on every trip you take with NexRide.</Text>
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureIcon}><Star size={24} color="#fbbf24" /></View>
            <Text style={styles.featureTitle}>Priority Matching</Text>
            <Text style={styles.featureDesc}>Get matched with top-rated drivers faster during peak hours.</Text>
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureIcon}><ShieldCheck size={24} color="#22c55e" /></View>
            <Text style={styles.featureTitle}>Elite Profile Badge</Text>
            <Text style={styles.featureDesc}>Stand out with an exclusive golden crown around your avatar.</Text>
          </View>
        </View>

        <View style={styles.pricingCard}>
          <View style={styles.pricingInfo}>
            <Text style={styles.priceText}>₹499</Text>
            <Text style={styles.periodText}>/ 30 days</Text>
          </View>
          
          <TouchableOpacity style={styles.subscribeBtn} onPress={handleSubscribe} disabled={isLoading || walletLoading}>
            <Text style={styles.subscribeBtnText}>{isLoading ? "Processing..." : "Subscribe Now"}</Text>
            {!isLoading && <ArrowRight size={20} color="white" />}
          </TouchableOpacity>
          
          {profile && (profile.wallet_balance || 0) >= 499 && (
            <TouchableOpacity 
              style={styles.walletBtn}
              onPress={handleWalletPurchase}
              disabled={isLoading || walletLoading}
            >
              <Text style={styles.walletBtnText}>{walletLoading ? "Processing..." : `Pay with Wallet (Bal: ₹${profile.wallet_balance})`}</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.cancelText}>One-time payment for 30 days of Elite status.</Text>
        </View>
      </ScrollView>

      {showPayment && (
        <PaymentGateway
          visible={showPayment}
          amount={499}
          type="subscription"
          onSuccess={handlePaymentSuccess}
          onCancel={() => setShowPayment(false)}
        />
      )}
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  backBtn: { padding: 8, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  
  premiumHeader: { alignItems: 'center', marginVertical: 32 },
  premiumBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(251, 191, 36, 0.1)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.2)' },
  premiumBadgeText: { color: '#fbbf24', fontWeight: '800', fontSize: 14, letterSpacing: 1 },
  mainTitle: { fontSize: 32, fontWeight: '900', color: colors.text, textAlign: 'center', marginBottom: 12 },
  mainDesc: { fontSize: 16, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 20 },

  featuresGrid: { gap: 16, marginBottom: 32 },
  featureCard: { backgroundColor: colors.card, padding: 24, borderRadius: 24, borderWidth: 1, borderColor: colors.border },
  featureIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  featureTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 8 },
  featureDesc: { fontSize: 15, color: colors.textMuted, lineHeight: 22 },

  pricingCard: { backgroundColor: 'rgba(37, 99, 235, 0.1)', padding: 32, borderRadius: 32, borderWidth: 1, borderColor: 'rgba(37, 99, 235, 0.3)', alignItems: 'center' },
  pricingInfo: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 24 },
  priceText: { fontSize: 48, fontWeight: '900', color: colors.text },
  periodText: { fontSize: 16, color: colors.textMuted, fontWeight: '600' },
  
  subscribeBtn: { width: '100%', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: colors.primary, padding: 16, borderRadius: 100 },
  subscribeBtnText: { color: 'white', fontWeight: '800', fontSize: 16 },
  
  walletBtn: { width: '100%', padding: 16, borderRadius: 100, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', marginTop: 12 },
  walletBtnText: { color: colors.card, fontWeight: '700', fontSize: 16 },
  
  cancelText: { color: colors.textMuted, fontSize: 12, marginTop: 16, textAlign: 'center' },

  // Active State
  premiumActiveContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  crownIconLarge: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(251, 191, 36, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 2, borderColor: 'rgba(251, 191, 36, 0.2)' },
  activeTitle: { fontSize: 28, fontWeight: '900', color: colors.text, textAlign: 'center', marginBottom: 16 },
  activeDesc: { fontSize: 16, color: colors.textMuted, textAlign: 'center', lineHeight: 24, marginBottom: 24 },
  expiryBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fef3c7', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, marginBottom: 32 },
  expiryText: { color: '#d97706', fontWeight: 'bold', fontSize: 14 },
  perksGrid: { width: '100%', gap: 12 },
  perkActive: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  perkActiveText: { color: colors.text, fontWeight: '700', fontSize: 16 },

});
