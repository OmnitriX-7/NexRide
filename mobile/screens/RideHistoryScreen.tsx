import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, Platform, Image } from 'react-native';
import { ArrowLeft, Clock, MapPin, Receipt, Share, Car } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../supabaseClient';
import { useUserStore } from '../store';
import { useTheme } from '../theme';
import { generateAndShareReceipt } from '../utils/receiptGenerator';

export default function RideHistoryScreen() {
  const navigation = useNavigation();
  const { profile } = useUserStore();
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);
  
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingReceipt, setGeneratingReceipt] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!profile?.id) return;
      
      const roleFilter = profile.role === 'driver' ? 'driver_id' : 'rider_id';
      
      const { data, error } = await supabase
        .from('ride_dispatches')
        .select('*, driver:drivers(*)')
        .eq(roleFilter, profile.id)
        .in('status', ['completed', 'cancelled'])
        .order('created_at', { ascending: false });
        
      if (!error && data) {
        setRides(data);
      }
      setLoading(false);
    };
    
    fetchHistory();
  }, [profile?.id]);

  const handleReceipt = async (ride: any) => {
    setGeneratingReceipt(ride.id);
    await generateAndShareReceipt(ride, profile);
    setGeneratingReceipt(null);
  };

  const renderRide = ({ item }: { item: any }) => {
    const isCompleted = item.status === 'completed';
    
    return (
      <View style={styles.rideCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.dateText}>{new Date(item.created_at).toLocaleDateString()} • {new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
          <View style={[styles.statusBadge, { backgroundColor: isCompleted ? colors.success + '20' : colors.danger + '20' }]}>
            <Text style={[styles.statusText, { color: isCompleted ? colors.success : colors.danger }]}>
              {isCompleted ? 'Completed' : 'Cancelled'}
            </Text>
          </View>
        </View>

        <View style={styles.routeContainer}>
          <View style={styles.routeNode}>
            <View style={styles.dot} />
            <Text style={styles.routeText} numberOfLines={1}>{item.pickup_name}</Text>
          </View>
          <View style={styles.connector} />
          <View style={styles.routeNode}>
            <MapPin size={12} color={colors.danger} style={{ marginRight: 8 }} />
            <Text style={styles.routeText} numberOfLines={1}>{item.dropoff_name}</Text>
          </View>
        </View>

        <View style={styles.divider} />
        
        <View style={styles.cardFooter}>
          <View style={styles.driverInfo}>
            <View style={styles.avatarPlaceholder}>
              <Car size={16} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.driverName}>{item.driver?.full_name || 'Driver'}</Text>
              <Text style={styles.carInfo}>{item.driver?.vehicle_make} {item.driver?.vehicle_model}</Text>
            </View>
          </View>
          <Text style={styles.fareAmount}>₹{item.fare_amount.toFixed(2)}</Text>
        </View>

        {isCompleted && (
          <TouchableOpacity 
            style={styles.receiptBtn} 
            onPress={() => handleReceipt(item)}
            disabled={generatingReceipt === item.id}
          >
            {generatingReceipt === item.id ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Receipt size={16} color={colors.primary} />
                <Text style={styles.receiptText}>Get Receipt</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={colors.icon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ride History</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : rides.length === 0 ? (
        <View style={styles.centerBox}>
          <Clock size={48} color={colors.iconMuted} />
          <Text style={styles.emptyTitle}>No rides yet</Text>
          <Text style={styles.emptySubtitle}>Your completed and cancelled rides will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={rides}
          keyExtractor={(item) => item.id}
          renderItem={renderRide}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    paddingBottom: 20,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
  },
  listContainer: {
    padding: 16,
    gap: 16,
  },
  rideCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
      android: { elevation: 3 },
      web: { boxShadow: '0 4px 10px rgba(0,0,0,0.1)' } as any,
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  routeContainer: {
    paddingLeft: 4,
    marginBottom: 16,
  },
  routeNode: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginRight: 9,
    marginLeft: 1,
  },
  connector: {
    width: 2,
    height: 16,
    backgroundColor: colors.border,
    marginLeft: 5,
    marginVertical: 4,
  },
  routeText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  carInfo: {
    fontSize: 12,
    color: colors.textMuted,
  },
  fareAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  receiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  receiptText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  }
});
