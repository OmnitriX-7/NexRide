import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  ActivityIndicator, SafeAreaView, Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../supabaseClient';
import { useUserStore } from '../store';
import { useTheme } from '../theme';
import { 
  CreditCard, Wallet, Receipt, Plus, 
  ArrowUpRight, ArrowDownLeft, Clock, ArrowLeft as ArrowLeftIcon 
} from 'lucide-react-native';

export default function PaymentsScreen() {
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);
  const { profile, showToast, setProfile } = useUserStore();
  const navigation = useNavigation();
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingFunds, setIsAddingFunds] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!profile?.id) return;
      const { data } = await supabase
        .from('ride_dispatches')
        .select('*')
        .or(`rider_id.eq.${profile.id},driver_id.eq.${profile.id}`)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(20);

      if (data) setHistory(data);
      setIsLoading(false);
    };

    fetchHistory();
  }, [profile?.id]);

  const handleAddFunds = async () => {
    if (!profile?.id) return;
    setIsAddingFunds(true);
    
    const newBalance = (profile.wallet_balance || 0) + 50.00;
    
    const { error } = await supabase
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', profile.id);

    if (!error) {
      setProfile({ ...profile, wallet_balance: newBalance });
      showToast("Added ₹50.00 to your NexRide Wallet!");
    } else {
      showToast("Failed to add funds.");
    }
    
    setIsAddingFunds(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeftIcon size={24} color="#0f172a" />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Payments</Text>
          <Text style={styles.subtitle}>Wallet & History</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Top Widgets */}
        <View style={styles.widgetsGrid}>
          
          {/* Wallet Card */}
          <View style={[styles.widgetCard, styles.walletCard]}>
            <View style={styles.walletHeader}>
              <View style={styles.walletIconBox}><Wallet size={20} color="white" /></View>
              <View style={styles.badge}><Text style={styles.badgeText}>NexRide Cash</Text></View>
            </View>
            
            <View style={styles.balanceSection}>
              <Text style={styles.balanceLabel}>Current Balance</Text>
              <Text style={styles.balanceAmount}>₹{(profile?.wallet_balance || 0).toFixed(2)}</Text>
            </View>

            <TouchableOpacity 
              style={styles.addFundsBtn} 
              onPress={handleAddFunds} 
              disabled={isAddingFunds}
            >
              {isAddingFunds ? <ActivityIndicator size="small" color="#0f172a" /> : <Plus size={18} color="#0f172a" />}
              <Text style={styles.addFundsBtnText}>{isAddingFunds ? "Adding..." : "Add ₹50.00"}</Text>
            </TouchableOpacity>
          </View>

          {/* Saved Cards Widget */}
          <View style={styles.widgetCard}>
            <Text style={styles.cardsHeader}>Saved Methods</Text>
            
            <View style={styles.mockCard}>
              <Text style={styles.cardLogo}>VISA</Text>
              <View style={styles.cardChip} />
              <Text style={styles.cardNumber}>**** **** **** 4242</Text>
              <Text style={styles.cardExpires}>Expires 12/30</Text>
            </View>

            <TouchableOpacity style={styles.addCardBtn}>
              <Plus size={18} color="#2563eb" />
              <Text style={styles.addCardBtnText}>Add New Method</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Transaction History */}
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Receipt size={20} color="#0f172a" />
            <Text style={styles.historyTitle}>Recent Transactions</Text>
          </View>

          <View style={styles.historyList}>
            {isLoading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={styles.emptyStateText}>Loading history...</Text>
              </View>
            ) : history.length === 0 ? (
              <View style={styles.emptyState}>
                <Receipt size={48} color="#cbd5e1" style={{ marginBottom: 16 }} />
                <Text style={styles.emptyStateText}>No transactions yet.</Text>
              </View>
            ) : (
              history.map((ride) => {
                const isRider = ride.rider_id === profile?.id;
                const formattedDate = new Date(ride.created_at).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                });

                return (
                  <View key={ride.id} style={styles.historyItem}>
                    <View style={[styles.historyIconBox, { backgroundColor: isRider ? '#fee2e2' : '#dcfce7' }]}>
                      {isRider ? <ArrowUpRight size={20} color="#ef4444" /> : <ArrowDownLeft size={20} color="#22c55e" />}
                    </View>
                    
                    <View style={styles.historyDetails}>
                      <Text style={styles.historyItemTitle} numberOfLines={1}>{ride.dropoff_name}</Text>
                      <View style={styles.historyMeta}>
                        <Text style={styles.historyMetaText}>{formattedDate}</Text>
                        <Text style={styles.dot}>•</Text>
                        <View style={styles.methodTag}>
                          {ride.payment_method === 'stripe' ? <CreditCard size={12} color="#64748b" /> : <Wallet size={12} color="#64748b" />}
                          <Text style={styles.methodTagText}>{ride.payment_method?.toUpperCase() || 'CASH'}</Text>
                        </View>
                      </View>
                    </View>

                    <Text style={[styles.historyAmount, { color: isRider ? '#0f172a' : '#16a34a' }]}>
                      {isRider ? '-' : '+'}₹{ride.fare_amount}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
  backBtn: { padding: 8, backgroundColor: colors.card, borderRadius: 12, ...Platform.select({ default: { elevation: 2 }, web: { boxShadow: '0 2px 8px rgba(0,0,0,0.05)' } as any }) },
  title: { fontSize: 22, fontWeight: '900', color: colors.text, textAlign: 'center' },
  subtitle: { textAlign: 'center', color: colors.textMuted, fontSize: 13 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  
  widgetsGrid: { gap: 16, marginBottom: 24 },
  
  widgetCard: { backgroundColor: colors.card, borderRadius: 24, padding: 20, ...Platform.select({ default: { elevation: 4 }, web: { boxShadow: '0 10px 30px rgba(0,0,0,0.05)' } as any }) },
  walletCard: { backgroundColor: colors.success },
  walletHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  walletIconBox: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 10, borderRadius: 12 },
  badge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeText: { color: colors.card, fontWeight: '800', fontSize: 12 },
  balanceSection: { marginBottom: 24 },
  balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  balanceAmount: { color: colors.card, fontSize: 36, fontWeight: '900' },
  addFundsBtn: { backgroundColor: colors.card, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, padding: 16, borderRadius: 16 },
  addFundsBtnText: { color: colors.text, fontWeight: '800', fontSize: 16 },

  cardsHeader: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 16 },
  mockCard: { backgroundColor: colors.text, borderRadius: 16, padding: 20, marginBottom: 16 },
  cardLogo: { color: colors.card, fontSize: 18, fontWeight: '900', fontStyle: 'italic', marginBottom: 16 },
  cardChip: { width: 36, height: 24, backgroundColor: '#fbbf24', borderRadius: 6, marginBottom: 16, opacity: 0.8 },
  cardNumber: { color: colors.card, fontSize: 16, letterSpacing: 2, marginBottom: 16, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  cardExpires: { color: colors.textMuted, fontSize: 12 },
  addCardBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, padding: 16, borderRadius: 16, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe' },
  addCardBtnText: { color: colors.primary, fontWeight: '700', fontSize: 15 },

  historySection: { backgroundColor: colors.card, borderRadius: 24, padding: 20, ...Platform.select({ default: { elevation: 2 }, web: { boxShadow: '0 4px 20px rgba(0,0,0,0.05)' } as any }) },
  historyHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  historyTitle: { fontSize: 18, fontWeight: '900', color: colors.text },
  historyList: { gap: 16 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyStateText: { color: colors.textMuted, fontSize: 15, fontWeight: '500' },
  
  historyItem: { flexDirection: 'row', alignItems: 'center', paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.background },
  historyIconBox: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  historyDetails: { flex: 1, marginRight: 12 },
  historyItemTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 },
  historyMeta: { flexDirection: 'row', alignItems: 'center' },
  historyMetaText: { fontSize: 12, color: colors.textMuted },
  dot: { color: colors.border, marginHorizontal: 6, fontSize: 12 },
  methodTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.background, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  methodTagText: { fontSize: 10, fontWeight: '700', color: colors.textMuted },
  historyAmount: { fontSize: 16, fontWeight: '900' }
});
