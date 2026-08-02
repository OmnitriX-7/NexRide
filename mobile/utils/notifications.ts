// Temporarily commented out native modules to prevent APK crash
// import * as Device from 'expo-device';
// import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '../supabaseClient';

export async function registerForPushNotificationsAsync(userId: string) {
  console.log('Push notifications disabled temporarily to avoid APK crash.');
  return null;
}

export async function sendLocalPushNotification(title: string, body: string, data = {}) {
  console.log('Push notification simulation:', title, body);
}
