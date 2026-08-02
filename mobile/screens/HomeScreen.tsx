import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useUserStore } from '../store';
import Navbar from '../components/Navbar';
import RiderScreen from './RiderScreen';
import DriverScreen from './DriverScreen';

export default function HomeScreen() {
  const { profile } = useUserStore();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {profile?.role === 'driver' ? <DriverScreen /> : <RiderScreen />}
      </View>
      {/* Absolute positioned Navbar floating on top */}
      <View style={styles.navbarContainer} pointerEvents="box-none">
        <Navbar />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
  },
  navbarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  }
});
