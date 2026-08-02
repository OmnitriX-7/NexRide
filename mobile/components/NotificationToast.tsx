import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { Gift, Sparkles, Bell, Info } from 'lucide-react-native';
import { useUserStore } from '../store';

export default function NotificationToast() {
  const { notification } = useUserStore();
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const isReferral = notification.message?.toLowerCase().includes('referral') || notification.message?.toLowerCase().includes('reward');

  useEffect(() => {
    if (notification.visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: Platform.OS === 'android' ? 40 : 60,
          useNativeDriver: true,
          tension: 40,
          friction: 6
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true
        })
      ]).start();
    }
  }, [notification.visible]);

  if (!notification.visible && (slideAnim as any)._value === -100) return null;

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim
        }
      ]}
      pointerEvents="none"
    >
      <View style={styles.contentBox}>
        <View style={[styles.iconBox, { backgroundColor: isReferral ? '#2563eb' : '#334155' }]}>
          {isReferral ? (
            <Gift size={20} color="white" />
          ) : (
            <Bell size={20} color="white" />
          )}
        </View>

        <View style={styles.textBox}>
          <Text style={styles.title}>
            {isReferral ? 'Reward Unlocked!' : 'System Update'}
          </Text>
          <Text style={styles.message} numberOfLines={2}>
            {notification.message}
          </Text>
        </View>

        <View style={styles.accessoryBox}>
          {isReferral ? (
            <Sparkles size={18} color="#fbbf24" />
          ) : (
            <Info size={18} color="#64748b" />
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 99999,
  },
  contentBox: {
    backgroundColor: '#0f172a',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 15 },
      android: { elevation: 10 },
      web: { boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)' } as any
    })
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  textBox: {
    flex: 1,
    justifyContent: 'center'
  },
  title: {
    color: 'white',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2
  },
  message: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '500'
  },
  accessoryBox: {
    paddingLeft: 12,
    justifyContent: 'center',
    alignItems: 'center'
  }
});
