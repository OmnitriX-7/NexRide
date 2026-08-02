import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Platform, KeyboardAvoidingView, ScrollView, Linking, Share } from 'react-native';
import { X, Copy, CheckCircle2, MessageCircle, Mail, Send, Gift, MessageSquare, Share2, Link } from 'lucide-react-native';
import { useTheme } from '../theme';

interface ShareModalProps {
  visible: boolean;
  referralLink: string;
  onClose: () => void;
}

export default function ShareModal({ visible, referralLink, onClose }: ShareModalProps) {
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await Share.share({ message: referralLink });
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to share", err);
    }
  };

  const shareText = "Use my link to join NexRide and we both get ride discounts!";

  const openLink = (url: string) => {
    Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <View style={styles.modalCard}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <X size={20} color="white" />
          </TouchableOpacity>
          
          <View style={styles.headerBanner}>
            <View style={styles.giftIconContainer}>
              <Gift size={32} color="white" />
            </View>
            <Text style={styles.headerTitle}>Invite & Earn ₹100</Text>
            <Text style={styles.headerSubtitle}>Share your link and earn a bonus when your friend completes their first ride!</Text>
          </View>

          <View style={styles.content}>
            <Text style={styles.sectionTitle}>SHARE VIA</Text>
            
            <View style={styles.shareGrid}>
              <TouchableOpacity style={styles.shareBtn} onPress={() => openLink(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + " " + referralLink)}`)}>
                <MessageCircle size={24} color="#25D366" />
                <Text style={styles.shareBtnText}>WhatsApp</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shareBtn} onPress={() => openLink(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(referralLink)}`)}>
                <MessageSquare size={24} color="#1DA1F2" />
                <Text style={styles.shareBtnText}>X (Twitter)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shareBtn} onPress={() => openLink(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`)}>
                <Share2 size={24} color="#1877F2" />
                <Text style={styles.shareBtnText}>Facebook</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shareBtn} onPress={() => openLink(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareText)}`)}>
                <Send size={24} color="#229ED9" />
                <Text style={styles.shareBtnText}>Telegram</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shareBtn} onPress={() => openLink(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`)}>
                <Link size={24} color="#0A66C2" />
                <Text style={styles.shareBtnText}>LinkedIn</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shareBtn} onPress={() => openLink(`mailto:?subject=${encodeURIComponent("Join NexRide!")}&body=${encodeURIComponent(shareText + "\n\n" + referralLink)}`)}>
                <Mail size={24} color="#ea4335" />
                <Text style={styles.shareBtnText}>Email</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>OR COPY LINK</Text>
            <View style={styles.linkContainer}>
              <TextInput style={styles.linkInput} value={referralLink} editable={false} />
              <TouchableOpacity style={[styles.copyBtn, copied && styles.copiedBtn]} onPress={handleCopy}>
                {copied ? <CheckCircle2 size={18} color="white" /> : <Copy size={18} color="white" />}
                <Text style={styles.copyBtnText}>{copied ? 'Copied!' : 'Copy'}</Text>
              </TouchableOpacity>
            </View>
          </View>
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
      backgroundColor: colors.card, borderRadius: 24, width: '100%', maxWidth: 420,
      boxShadow: '0 20px 40px rgba(0,0,0,0.2)', overflow: 'hidden'
    } as any,
    default: {
      backgroundColor: colors.card, borderRadius: 24, width: '100%', maxWidth: 420,
      shadowColor: '#000', shadowOffset: { width: 0, height: 20 },
      shadowOpacity: 0.2, shadowRadius: 40, elevation: 15, overflow: 'hidden'
    }
  }),
  closeBtn: {
    position: 'absolute', top: 16, right: 16, width: 32, height: 32,
    borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', zIndex: 10
  },
  headerBanner: {
    backgroundColor: colors.primary, // fallback for linear gradient
    paddingTop: 40, paddingHorizontal: 24, paddingBottom: 30, alignItems: 'center'
  },
  giftIconContainer: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16
  },
  headerTitle: { color: colors.card, fontSize: 24, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  headerSubtitle: { color: colors.card, fontSize: 15, opacity: 0.9, textAlign: 'center', lineHeight: 21 },
  content: { padding: 24 },
  sectionTitle: { color: colors.textMuted, fontSize: 13, fontWeight: '700', letterSpacing: 1, marginBottom: 16 },
  shareGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 },
  shareBtn: {
    width: '31%', backgroundColor: colors.background, borderRadius: 16, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12, gap: 8
  },
  shareBtnText: { color: '#334155', fontWeight: '600', fontSize: 13 },
  linkContainer: {
    flexDirection: 'row', backgroundColor: colors.background, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden'
  },
  linkInput: { flex: 1, paddingHorizontal: 16, paddingVertical: 12, color: '#475569', fontSize: 14, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  copyBtn: {
    backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 8
  },
  copiedBtn: { backgroundColor: colors.success },
  copyBtnText: { color: colors.card, fontWeight: '600', fontSize: 14 }
});
