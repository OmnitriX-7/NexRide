import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { X, Star } from 'lucide-react-native';
import { supabase } from '../supabaseClient';
import { useTheme } from '../theme';

interface RateAppModalProps {
  visible: boolean;
  userId: string;
  onClose: () => void;
}

export default function RateAppModal({ visible, userId, onClose }: RateAppModalProps) {
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);
  const [rating, setRating] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('app_feedback')
        .insert({
          user_id: userId,
          rating,
          feedback_text: feedback.trim() || null
        });

      if (error) throw error;
      setSubmitted(true);
      setTimeout(() => {
        onClose();
        setRating(0);
        setFeedback('');
        setSubmitted(false);
      }, 3000);
    } catch (err) {
      console.error("Failed to submit feedback", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <View style={styles.modalCard}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <X size={20} color="#64748b" />
          </TouchableOpacity>
          
          {!submitted ? (
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
              <Text style={styles.title}>How are you enjoying NexRide?</Text>
              <Text style={styles.subtitle}>Your feedback helps us improve the experience for everyone.</Text>

              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity key={star} style={styles.starBtn} onPress={() => setRating(star)}>
                    <Star size={36} color={rating >= star ? '#fbbf24' : '#cbd5e1'} fill={rating >= star ? '#fbbf24' : 'none'} />
                  </TouchableOpacity>
                ))}
              </View>

              {rating > 0 && (
                <View style={styles.feedbackSection}>
                  <Text style={styles.label}>{rating >= 4 ? "Any improvements needed?" : "What can we do to improve?"}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Tell us what you love or what could be better..."
                    value={feedback}
                    onChangeText={setFeedback}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    placeholderTextColor="#94a3b8"
                  />
                  <TouchableOpacity style={[styles.submitBtn, isSubmitting && {opacity: 0.7}]} onPress={handleSubmit} disabled={isSubmitting}>
                    <Text style={styles.submitBtnText}>{isSubmitting ? 'Submitting...' : 'Submit Feedback'}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          ) : (
            <View style={styles.successContent}>
              <Star size={48} color="#fbbf24" fill="#fbbf24" style={{marginBottom: 16}} />
              <Text style={styles.title}>Thank you!</Text>
              <Text style={styles.subtitle}>Your feedback has been successfully submitted. We appreciate your support! 💙</Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center', padding: 16,
  },
  modalCard: Platform.select({
    web: {
      backgroundColor: colors.card, borderRadius: 24, width: '100%', maxWidth: 400,
      padding: 32, paddingHorizontal: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
      position: 'relative', maxHeight: '90%'
    } as any,
    default: {
      backgroundColor: colors.card, borderRadius: 24, width: '100%', maxWidth: 400,
      padding: 32, paddingHorizontal: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 20 },
      shadowOpacity: 0.2, shadowRadius: 40, elevation: 15, position: 'relative', maxHeight: '90%'
    }
  }),
  closeBtn: {
    position: 'absolute', top: 16, right: 16, width: 32, height: 32,
    borderRadius: 16, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', zIndex: 10
  },
  content: { alignItems: 'center', paddingBottom: 20 },
  successContent: { alignItems: 'center', paddingVertical: 20 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 15, color: colors.textMuted, textAlign: 'center', marginBottom: 24, lineHeight: 21 },
  starsContainer: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 },
  starBtn: { padding: 4 },
  feedbackSection: { width: '100%', gap: 12 },
  label: { fontWeight: '700', fontSize: 14, color: '#334155', marginBottom: 8 },
  input: {
    width: '100%', padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.background, fontSize: 15, color: '#1e293b', minHeight: 100, marginBottom: 12
  },
  submitBtn: {
    width: '100%', padding: 14, borderRadius: 12, backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center', marginTop: 8
  },
  submitBtnText: { color: colors.card, fontWeight: '700', fontSize: 16 }
});
