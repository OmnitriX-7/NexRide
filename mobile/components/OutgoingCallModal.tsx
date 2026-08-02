import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated, Platform } from 'react-native';
import { PhoneOff, Phone } from 'lucide-react-native';
import { useTheme } from '../theme';

interface OutgoingCallModalProps {
  visible: boolean;
  onClose: () => void;
  calleeName?: string;
  calleeRole?: string;
}

export default function OutgoingCallModal({ 
  visible,
  onClose, 
  calleeName = "Police (911)", 
  calleeRole = "Emergency Services" 
}: OutgoingCallModalProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [callState, setCallState] = useState<'calling' | 'connected' | 'ended'>('calling');
  const [duration, setDuration] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible && callState === 'calling') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 750, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 750, useNativeDriver: true })
        ])
      ).start();
    }
  }, [visible, callState]);

  useEffect(() => {
    let timer: any;
    
    if (callState === 'calling') {
      timer = setTimeout(() => {
        setCallState('connected');
      }, 3000);
    } else if (callState === 'connected') {
      timer = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (callState === 'calling') clearTimeout(timer);
      else clearInterval(timer);
    };
  }, [callState]);

  const handleHangUp = () => {
    setCallState('ended');
    setTimeout(() => {
      onClose();
      setCallState('calling');
      setDuration(0);
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
        <Animated.View style={[styles.avatar, { transform: [{ scale: callState === 'calling' ? pulseAnim : 1 }] }, callState === 'ended' && styles.avatarEnded]}>
          <Phone size={60} color="white" />
        </Animated.View>

        <Text style={styles.name}>{calleeName}</Text>
        <Text style={styles.role}>{calleeRole}</Text>

        {callState === 'calling' && (
          <Text style={styles.statusText}>Ringing...</Text>
        )}

        {callState === 'connected' && (
          <Text style={styles.durationText}>{formatTime(duration)}</Text>
        )}

        {callState === 'ended' && (
          <Text style={styles.endedText}>Call Ended</Text>
        )}

        <View style={styles.actions}>
          {(callState === 'calling' || callState === 'connected') && (
            <TouchableOpacity style={[styles.btn, styles.declineBtn]} onPress={handleHangUp}>
              <PhoneOff size={32} color="white" />
            </TouchableOpacity>
          )}
        </View>
        
        {callState === 'calling' && (
          <Text style={styles.warningText}>
            Calling emergency services. Your location will be shared automatically.
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
      backgroundColor: colors.danger, justifyContent: 'center', alignItems: 'center',
      marginBottom: 32, boxShadow: '0 0 40px rgba(239, 68, 68, 0.5)'
    } as any,
    default: {
      width: 120, height: 120, borderRadius: 60,
      backgroundColor: colors.danger, justifyContent: 'center', alignItems: 'center',
      marginBottom: 32, shadowColor: colors.danger, shadowOpacity: 0.8, shadowRadius: 20, shadowOffset: { width: 0, height: 0 }
    }
  }),
  avatarEnded: { backgroundColor: '#475569', shadowOpacity: 0, elevation: 0 },
  name: { color: colors.card, fontSize: 28, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  role: { color: colors.textMuted, fontSize: 18, marginBottom: 48, textAlign: 'center' },
  statusText: { color: colors.card, fontSize: 20, marginBottom: 40, fontWeight: '500' },
  durationText: { color: '#22c55e', fontSize: 24, marginBottom: 40, fontWeight: 'bold' },
  endedText: { color: colors.danger, fontSize: 20, marginBottom: 40, fontWeight: '500' },
  actions: { flexDirection: 'row', gap: 40 },
  btn: Platform.select({
    web: {
      width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center',
      boxShadow: '0 10px 25px rgba(239, 68, 68, 0.4)'
    } as any,
    default: {
      width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center',
      shadowColor: colors.danger, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 15, elevation: 10
    }
  }),
  declineBtn: { backgroundColor: colors.danger },
  warningText: { color: colors.danger, fontSize: 14, marginTop: 40, textAlign: 'center' }
});
