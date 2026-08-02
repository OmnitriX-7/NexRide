import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator, Alert } from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import { supabase } from '../supabaseClient';
import { useUserStore } from '../store';
import { useTheme } from '../theme';

// Set this to the local IP of the computer running the Node server 
// so the physical device can reach it over Wi-Fi
const API_URL = 'http://192.168.137.19:4242'; 

interface PaymentGatewayProps {
  visible: boolean;
  clientSecret?: string; // We can ignore this prop now as we will fetch a fresh one
  amount: number;
  stripeAmount?: number;
  walletUsed?: number;
  rideId?: string;
  type?: 'ride' | 'subscription';
  onSuccess: () => void;
  onCancel: () => void;
}

export default function PaymentGateway({ 
  visible, amount, stripeAmount, walletUsed = 0, rideId, type = 'ride', onSuccess, onCancel 
}: PaymentGatewayProps) {
  const { profile } = useUserStore();
  const { colors } = useTheme();
  const styles = getStyles(colors);
  
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      initializePaymentSheet();
    }
  }, [visible]);

  const fetchPaymentSheetParams = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      const response = await fetch(`${API_URL}/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          ride_id: rideId,
          wallet_used: walletUsed,
          currency: 'inr', // Hardcoded INR for test purposes
          type: type
        })
      });
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }
      return data;
    } catch (e: any) {
      console.error("Error fetching payment intent:", e);
      Alert.alert("Payment Error", e.message || "Could not connect to payment server.");
      onCancel();
      return null;
    }
  };

  const initializePaymentSheet = async () => {
    setLoading(true);
    const params = await fetchPaymentSheetParams();
    
    if (!params) {
      setLoading(false);
      return;
    }

    if (params.clientSecret === 'wallet_only') {
      // Free ride / covered by wallet completely
      setLoading(false);
      processSuccess();
      return;
    }

    const { error } = await initPaymentSheet({
      merchantDisplayName: "NexRide Inc.",
      paymentIntentClientSecret: params.clientSecret,
      allowsDelayedPaymentMethods: true,
      defaultBillingDetails: {
        name: profile?.full_name || 'NexRide User',
        email: profile?.email || '',
      },
      appearance: {
        colors: {
          primary: colors.primary,
          background: colors.card,
          componentBackground: colors.background,
          componentBorder: colors.border,
          componentDivider: colors.border,
          primaryText: colors.text,
          secondaryText: colors.textMuted,
          componentText: colors.text,
          placeholderText: colors.textMuted,
        },
        shapes: {
          borderRadius: 12,
          borderWidth: 1,
        }
      }
    });
    
    if (error) {
      Alert.alert("Initialization Error", error.message);
      onCancel();
    } else {
      setLoading(false);
      openPaymentSheet();
    }
  };

  const openPaymentSheet = async () => {
    const { error } = await presentPaymentSheet();

    if (error) {
      if (error.code !== 'Canceled') {
        Alert.alert(`Error code: ${error.code}`, error.message);
      }
      onCancel();
    } else {
      processSuccess();
    }
  };

  const processSuccess = async () => {
    if (type === 'subscription') {
      await supabase.rpc('subscribe_premium');
      onSuccess();
      return;
    }

    if (rideId) {
      const { error: rpcError } = await supabase.rpc('process_ride_payment', {
        p_ride_id: rideId,
        p_wallet_used: walletUsed,
        p_method: 'stripe'
      });
      
      if (rpcError) {
        Alert.alert("Database Error", "Payment succeeded but database update failed: " + rpcError.message);
      } else {
        onSuccess();
      }
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Initializing Secure Checkout...</Text>
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  loadingBox: {
    backgroundColor: colors.card,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  }
});
