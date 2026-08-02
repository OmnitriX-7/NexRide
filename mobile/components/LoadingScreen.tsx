import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Car } from 'lucide-react-native';

export default function LoadingScreen() {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const carAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Progress bar animation
    Animated.timing(progressAnim, {
      toValue: 100,
      duration: 2000,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      useNativeDriver: false
    }).start();

    // Car drive animation
    Animated.timing(carAnim, {
      toValue: 248,
      duration: 2000,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      useNativeDriver: true
    }).start();

    // Car bounce animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: -4, duration: 200, useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.trackContainer}>
        {/* Progress Track */}
        <View style={styles.trackBackground}>
          <Animated.View 
            style={[
              styles.trackFill, 
              { 
                width: progressAnim.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%']
                }) 
              }
            ]} 
          />
        </View>

        {/* Driving Car */}
        <Animated.View style={[styles.carContainer, { transform: [{ translateX: carAnim }] }]}>
          <Animated.View style={{ transform: [{ translateY: bounceAnim }] }}>
            <Car size={36} color="#2563eb" fill="#2563eb" />
          </Animated.View>
        </Animated.View>
      </View>

      <Text style={styles.loadingText}>Preparing your ride...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackContainer: {
    width: 280,
    position: 'relative',
    height: 40,
    justifyContent: 'center'
  },
  trackBackground: {
    width: '100%',
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    overflow: 'hidden'
  },
  trackFill: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 20,
  },
  carContainer: {
    position: 'absolute',
    top: -20,
    left: 0
  },
  loadingText: {
    marginTop: 24,
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a'
  }
});
