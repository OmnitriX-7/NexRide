import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Platform } from 'react-native';
import { AlertTriangle, X } from 'lucide-react-native';
import { useTheme } from '../theme';

interface SOSModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function SOSModal({ visible, onClose, onConfirm }: SOSModalProps) {
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <X size={24} color="#64748b" />
          </TouchableOpacity>

          <View style={styles.iconContainer}>
            <AlertTriangle size={32} color="#ef4444" />
          </View>

          <Text style={styles.title}>Trigger SOS?</Text>
          <Text style={styles.subtitle}>
            This will immediately flag your ride as an emergency and provide options to contact the police or your emergency contact.
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm}>
              <Text style={styles.confirmBtnText}>Yes, Trigger SOS</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    width: '100%',
    maxWidth: 360,
    padding: 24,
    paddingTop: 32,
    alignItems: 'center',
    borderColor: '#fecaca',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22
  },
  buttonContainer: {
    width: '100%',
    gap: 12
  },
  confirmBtn: {
    width: '100%',
    padding: 16,
    borderRadius: 14,
    backgroundColor: colors.danger,
    alignItems: 'center'
  },
  confirmBtnText: {
    color: colors.card,
    fontSize: 16,
    fontWeight: '700'
  },
  cancelBtn: {
    width: '100%',
    padding: 16,
    borderRadius: 14,
    backgroundColor: colors.background,
    alignItems: 'center'
  },
  cancelBtnText: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: '700'
  }
});
