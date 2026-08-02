// Temporarily commented out native modules to prevent APK crash
// import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { supabase } from '../supabaseClient';

const LOCATION_TASK_NAME = 'background-location-task';
let currentDriverId: string | null = null;

export const startBackgroundTracking = async (driverId: string) => {
  console.log('Background tracking disabled temporarily to avoid APK crash');
};

export const stopBackgroundTracking = async () => {
  console.log('Background tracking disabled temporarily to avoid APK crash');
};
