import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated, Easing, Platform, Dimensions } from 'react-native';
import { PhoneCall, PhoneOff, Phone } from 'lucide-react-native';
import { useTheme } from '../theme';

interface IncomingCallModalProps {
  visible: boolean;
  onClose: (accepted: boolean) => void;
  callerName?: string;
  callerRole?: string;
}

export default function IncomingCallModal({ 
  visible,
  onClose, 
  callerName = "Security Officer Davis", 
  callerRole = "NexRide Trust & Safety Team" 
}: IncomingCallModalProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  
  const [callState, setCallState] = useState<'incoming' | 'connected' | 'ended'>('incoming');
  const [duration, setDuration] = useState(0);
  const [wasAccepted, setWasAccepted] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible && callState === 'incoming') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true })
        ])
      ).start();
    }
  }, [visible, callState]);

  useEffect(() => {
    let timer: any;
    if (callState === 'connected') {
      timer = setInterval(() => setDuration(prev => prev + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [callState]);

  const handleAccept = () => {
    setCallState('connected');
    setWasAccepted(true);
  };

  const handleDecline = () => {
    setCallState('ended');
    setTimeout(() => {
      onClose(wasAccepted);
      setCallState('incoming');
      setDuration(0);
      setWasAccepted(false);
    }, 1500);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <Animated.View style={[styles.avatar, { transform: [{ scale: callState === 'incoming' ? pulseAnim : 1 }] }]}>
          <Phone size={60} color="white" />
        </Animated.View>

        <Text style={styles.name}>{callerName}</Text>
        <Text style={styles.role}>{callerRole}</Text>

        {callState === 'incoming' && (
          <Text style={styles.statusText}>Incoming Audio Call...</Text>
        )}

        {callState === 'connected' && (
          <Text style={styles.durationText}>{formatTime(duration)}</Text>
        )}

        {callState === 'ended' && (
          <Text style={styles.endedText}>Call Ended</Text>
        )}

        <View style={styles.actions}>
          {callState === 'incoming' && (
            <TouchableOpacity style={[styles.btn, styles.acceptBtn]} onPress={handleAccept}>
              <PhoneCall size={32} color="white" />
            </TouchableOpacity>
          )}
          
          {(callState === 'incoming' || callState === 'connected') && (
            <TouchableOpacity style={[styles.btn, styles.declineBtn]} onPress={handleDecline}>
              <PhoneOff size={32} color="white" />
            </TouchableOpacity>
          )}
        </View>

        {callState === 'incoming' && (
          <Text style={styles.warningText}>
            Warning: This ride has exceeded 12 hours. Trust & Safety is checking in on you.
          </Text>
        )}
      </View>
    </Modal>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.95)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  avatar: Platform.select({
    web: {
      width: 120, height: 120, borderRadius: 60,
      backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
      marginBottom: 32, boxShadow: '0 0 40px rgba(59, 130, 246, 0.5)'
    } as any,
    default: {
      width: 120, height: 120, borderRadius: 60,
      backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
      marginBottom: 32, shadowColor: colors.primary, shadowOpacity: 0.8, shadowRadius: 20, shadowOffset: { width: 0, height: 0 }
    }
  }),
  name: { color: colors.card, fontSize: 28, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  role: { color: colors.textMuted, fontSize: 18, marginBottom: 48, textAlign: 'center' },
  statusText: { color: colors.card, fontSize: 20, marginBottom: 40, fontWeight: '500' },
  durationText: { color: '#22c55e', fontSize: 24, marginBottom: 40, fontWeight: 'bold' },
  endedText: { color: colors.danger, fontSize: 20, marginBottom: 40, fontWeight: '500' },
  actions: { flexDirection: 'row', gap: 40 },
  btn: Platform.select({
    web: {
      width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center',
      boxShadow: '0 10px 25px rgba(0,0,0,0.4)'
    } as any,
    default: {
      width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center',
      shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 10
    }
  }),
  acceptBtn: { backgroundColor: '#22c55e' },
  declineBtn: { backgroundColor: colors.danger },
  warningText: { color: colors.danger, fontSize: 14, marginTop: 40, textAlign: 'center' }
});
