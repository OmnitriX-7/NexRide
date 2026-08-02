import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Image, ActivityIndicator, SafeAreaView, Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../supabaseClient';
import { useTheme } from '../theme';
import { 
  Trophy, Medal, MapPin, DollarSign, Star, 
  Car, User as UserIcon, Activity, ArrowLeft as ArrowLeftIcon
} from 'lucide-react-native';

type LeaderboardMode = 'drivers' | 'riders';
type DriverMetric = 'total_distance' | 'total_rides' | 'total_earned' | 'rating';
type RiderMetric = 'total_rides' | 'total_spent' | 'total_distance';

export default function LeaderboardScreen() {
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);
  const navigation = useNavigation();
  const [mode, setMode] = useState<LeaderboardMode>('drivers');
  const [driverMetric, setDriverMetric] = useState<DriverMetric>('total_earned');
  const [riderMetric, setRiderMetric] = useState<RiderMetric>('total_rides');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const table = mode === 'drivers' ? 'driver_leaderboard' : 'rider_leaderboard';
        const metric = mode === 'drivers' ? driverMetric : riderMetric;
        
        const { data: results, error } = await supabase
          .from(table)
          .select('*')
          .order(metric, { ascending: false })
          .limit(100);

        if (!error && results) {
          setData(results);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [mode, driverMetric, riderMetric]);

  const getMetricDisplay = (entry: any) => {
    if (mode === 'drivers') {
      switch (driverMetric) {
        case 'total_distance': return `${entry.total_distance?.toFixed(1) || 0} km`;
        case 'total_rides': return `${entry.total_rides || 0} Rides`;
        case 'total_earned': return `₹${entry.total_earned?.toFixed(2) || '0.00'}`;
        case 'rating': return `${entry.rating?.toFixed(2) || '5.00'} ★`;
      }
    } else {
      switch (riderMetric) {
        case 'total_distance': return `${entry.total_distance?.toFixed(1) || 0} km`;
        case 'total_rides': return `${entry.total_rides || 0} Rides`;
        case 'total_spent': return `₹${entry.total_spent?.toFixed(2) || '0.00'}`;
      }
    }
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy size={20} color="#eab308" />;
    if (index === 1) return <Medal size={20} color="#94a3b8" />;
    if (index === 2) return <Medal size={20} color="#b45309" />;
    return <Text style={styles.rankNumber}>#{index + 1}</Text>;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeftIcon size={24} color="#0f172a" />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Trophy size={24} color="#2563eb" />
          <Text style={styles.title}>Leaderboards</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <Text style={styles.subtitle}>Updated automatically every 24 hours</Text>

      {/* Mode Toggle */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity 
          style={[styles.toggleBtn, mode === 'drivers' && styles.toggleBtnActive]}
          onPress={() => setMode('drivers')}
        >
          <Car size={16} color={mode === 'drivers' ? '#0f172a' : '#64748b'} />
          <Text style={[styles.toggleText, mode === 'drivers' && styles.toggleTextActive]}>Top Drivers</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.toggleBtn, mode === 'riders' && styles.toggleBtnActive]}
          onPress={() => setMode('riders')}
        >
          <UserIcon size={16} color={mode === 'riders' ? '#0f172a' : '#64748b'} />
          <Text style={[styles.toggleText, mode === 'riders' && styles.toggleTextActive]}>Top Riders</Text>
        </TouchableOpacity>
      </View>

      {/* Metric Pills */}
      <View style={{ height: 50, marginBottom: 16 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsContainer}>
          {mode === 'drivers' ? (
            <>
              <MetricPill active={driverMetric === 'total_earned'} onClick={() => setDriverMetric('total_earned')} icon={<DollarSign size={14} color={driverMetric === 'total_earned' ? 'white' : '#64748b'}/>} label="Highest Earners" />
              <MetricPill active={driverMetric === 'total_rides'} onClick={() => setDriverMetric('total_rides')} icon={<Activity size={14} color={driverMetric === 'total_rides' ? 'white' : '#64748b'}/>} label="Most Rides" />
              <MetricPill active={driverMetric === 'total_distance'} onClick={() => setDriverMetric('total_distance')} icon={<MapPin size={14} color={driverMetric === 'total_distance' ? 'white' : '#64748b'}/>} label="Max Distance" />
              <MetricPill active={driverMetric === 'rating'} onClick={() => setDriverMetric('rating')} icon={<Star size={14} color={driverMetric === 'rating' ? 'white' : '#64748b'}/>} label="Top Rated" />
            </>
          ) : (
            <>
              <MetricPill active={riderMetric === 'total_rides'} onClick={() => setRiderMetric('total_rides')} icon={<Activity size={14} color={riderMetric === 'total_rides' ? 'white' : '#64748b'}/>} label="Most Rides" />
              <MetricPill active={riderMetric === 'total_spent'} onClick={() => setRiderMetric('total_spent')} icon={<DollarSign size={14} color={riderMetric === 'total_spent' ? 'white' : '#64748b'}/>} label="Highest Spenders" />
              <MetricPill active={riderMetric === 'total_distance'} onClick={() => setRiderMetric('total_distance')} icon={<MapPin size={14} color={riderMetric === 'total_distance' ? 'white' : '#64748b'}/>} label="Max Distance" />
            </>
          )}
        </ScrollView>
      </View>

      {/* List Section */}
      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingText}>Loading rankings...</Text>
          </View>
        ) : data.length === 0 ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>No data available yet.</Text>
          </View>
        ) : (
          data.map((entry, idx) => (
            <View 
              key={entry.id + mode} 
              style={[styles.card, idx < 3 && styles.topCard]}
            >
              <View style={styles.rankBox}>
                {getRankIcon(idx)}
              </View>
              
              <View style={styles.avatarBox}>
                {entry.avatar_url ? (
                  <Image source={{ uri: entry.avatar_url }} style={styles.avatarImage} />
                ) : (
                  <UserIcon size={20} color="#cbd5e1" />
                )}
              </View>

              <Text style={styles.nameText} numberOfLines={1}>
                {entry.full_name || 'Anonymous'}
              </Text>

              <Text style={styles.metricText}>
                {getMetricDisplay(entry)}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const MetricPill = ({ active, onClick, icon, label }: any) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <TouchableOpacity 
      style={[styles.pill, active && styles.pillActive]} 
      onPress={onClick}
    >
      {icon}
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  backBtn: { padding: 8, backgroundColor: colors.card, borderRadius: 12, ...Platform.select({ default: { elevation: 2 }, web: { boxShadow: '0 2px 8px rgba(0,0,0,0.05)' } as any }) },
  titleContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 24, fontWeight: '900', color: colors.text },
  subtitle: { textAlign: 'center', color: colors.textMuted, fontSize: 13, marginBottom: 16 },
  
  toggleContainer: { flexDirection: 'row', backgroundColor: colors.border, marginHorizontal: 20, padding: 4, borderRadius: 12, marginBottom: 16 },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, gap: 8 },
  toggleBtnActive: { backgroundColor: colors.card, ...Platform.select({ default: { elevation: 2 }, web: { boxShadow: '0 2px 8px rgba(0,0,0,0.1)' } as any }) },
  toggleText: { fontSize: 14, fontWeight: '700', color: colors.textMuted },
  toggleTextActive: { color: colors.text },

  pillsContainer: { paddingHorizontal: 20, gap: 8, alignItems: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.card, borderRadius: 20 },
  pillActive: { backgroundColor: colors.primary, ...Platform.select({ default: { elevation: 4 }, web: { boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)' } as any }) },
  pillText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  pillTextActive: { color: colors.card },

  listContent: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  loadingContainer: { alignItems: 'center', paddingVertical: 40, gap: 16 },
  loadingText: { color: colors.textMuted, fontSize: 15, fontWeight: '500' },

  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.border, gap: 12 },
  topCard: { borderColor: 'rgba(37, 99, 235, 0.3)', backgroundColor: colors.background },
  rankBox: { width: 30, alignItems: 'center' },
  rankNumber: { fontWeight: '800', color: colors.textMuted },
  avatarBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  nameText: { flex: 1, fontSize: 16, fontWeight: '800', color: colors.text },
  metricText: { fontSize: 15, fontWeight: '900', color: colors.primary }
});
