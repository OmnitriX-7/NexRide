import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { supabase } from './supabaseClient';
import { useUserStore } from './store';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { StripeProvider } from '@stripe/stripe-react-native';
import { registerForPushNotificationsAsync } from './utils/notifications';

import AuthScreen from './screens/AuthScreen';
import HomeScreen from './screens/HomeScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import ProfileScreen from './screens/ProfileScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';
import PaymentsScreen from './screens/PaymentsScreen';
import PremiumScreen from './screens/PremiumScreen';
import RideHistoryScreen from './screens/RideHistoryScreen';
import NotificationToast from './components/NotificationToast';
import LoadingScreen from './components/LoadingScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { profile, setProfile, hasProfile, setHasProfile } = useUserStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setHasProfile(false);
        setLoading(false);
      }
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setHasProfile(false);
        setLoading(false);
      }
    });
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (data) {
        if (data.is_premium && data.premium_expires_at) {
          if (new Date(data.premium_expires_at) < new Date()) {
            data.is_premium = false;
            supabase.from('profiles').update({ is_premium: false }).eq('id', userId);
          }
        }
        setProfile(data);
        setHasProfile(data.onboarded);
        
        // Register for push notifications
        if (data.onboarded) {
          registerForPushNotificationsAsync(userId);
        }
      } else {
        setProfile(null);
        setHasProfile(false);
      }
    } catch (err) {
      setHasProfile(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
          {!session ? (
            <Stack.Screen name="Auth" component={AuthScreen} />
          ) : (
            <>
              {!hasProfile ? (
                <Stack.Screen name="Onboarding" component={OnboardingScreen} />
              ) : (
                <>
                  <Stack.Screen name="Home" component={HomeScreen} />
                  <Stack.Screen name="Profile" component={ProfileScreen} />
                  <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
                  <Stack.Screen name="Payments" component={PaymentsScreen} />
                  <Stack.Screen name="Premium" component={PremiumScreen} />
                  <Stack.Screen name="RideHistory" component={RideHistoryScreen} />
                </>
              )}
            </>
          )}
        </Stack.Navigator>
        <NotificationToast />
      </NavigationContainer>
    </StripeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
    fontWeight: '600'
  }
});
