import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Platform, KeyboardAvoidingView, ScrollView, ActivityIndicator } from 'react-native';
import { Bot, X, Send } from 'lucide-react-native';
import { useTheme } from '../theme';

interface HelpBotProps {
  visible: boolean;
  onClose: () => void;
}

interface Message {
  role: 'user' | 'model';
  text: string;
}

export default function HelpBot({ visible, onClose }: HelpBotProps) {
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: "Hi! I'm NexBot, your NexRide AI assistant. How can I help you today?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible) {
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages, visible]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      // In Expo, we use EXPO_PUBLIC_ variables
      const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) {
        setMessages(prev => [...prev, { role: 'model', text: "API Key is missing. Please add EXPO_PUBLIC_GEMINI_API_KEY to your .env file." }]);
        setIsLoading(false);
        return;
      }

      const chatHistory = messages.slice(1).map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      }));
      
      chatHistory.push({ role: 'user', parts: [{ text: userMessage }] });

      const systemPrompt = `You are NexBot, the official AI support assistant for the NexRide app. 
NexRide is a modern real-time ride-hailing app with features like:
- Live GPS tracking
- Supabase backend and realtime driver matching
- Stripe payments & a digital wallet system
- Emergency SOS features
- Premium "Elite" subscriptions (priority matching, badges)

Rules:
1. ONLY answer questions related to the NexRide app, ride-hailing, or its features.
2. If the user asks something completely unrelated to NexRide or ride-sharing, decline politely and say you don't know or can only help with NexRide-related topics.
3. Be concise, friendly, and helpful.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction: {
            role: "system",
            parts: [{ text: systemPrompt }]
          },
          contents: chatHistory,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 800,
          }
        })
      });

      const data = await response.json();
      
      if (data.error) {
        console.error("Gemini API Error:", data.error);
        setMessages(prev => [...prev, { role: 'model', text: "Sorry, I'm having trouble connecting right now." }]);
      } else {
        const botReply = data.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't process that.";
        setMessages(prev => [...prev, { role: 'model', text: botReply }]);
      }
    } catch (error) {
      console.error("Chat Error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "Network error. Please try again later." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.botIconContainer}>
                <Bot size={24} color="white" />
              </View>
              <View>
                <Text style={styles.headerTitle}>NexBot</Text>
                <Text style={styles.headerSubtitle}>AI Support Assistant</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Chat History */}
          <ScrollView 
            ref={scrollViewRef} 
            style={styles.chatArea} 
            contentContainerStyle={styles.chatContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((msg, idx) => (
              <View key={idx} style={[styles.messageRow, msg.role === 'user' ? styles.messageRowUser : styles.messageRowModel]}>
                {msg.role === 'model' && (
                  <View style={styles.messageAvatar}>
                    <Bot size={16} color="white" />
                  </View>
                )}
                <View style={[styles.messageBubble, msg.role === 'user' ? styles.bubbleUser : styles.bubbleModel]}>
                  <Text style={[styles.messageText, msg.role === 'user' ? styles.textUser : styles.textModel]}>
                    {msg.text}
                  </Text>
                </View>
              </View>
            ))}
            {isLoading && (
              <View style={[styles.messageRow, styles.messageRowModel]}>
                <View style={styles.messageAvatar}>
                  <Bot size={16} color="white" />
                </View>
                <View style={[styles.messageBubble, styles.bubbleModel]}>
                  <ActivityIndicator size="small" color="#64748b" />
                </View>
              </View>
            )}
          </ScrollView>

          {/* Input Area */}
          <View style={styles.inputArea}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Type your question..."
              placeholderTextColor="#94a3b8"
              onSubmitEditing={handleSend}
            />
            <TouchableOpacity 
              style={[styles.sendBtn, (!input.trim() || isLoading) && styles.sendBtnDisabled]} 
              onPress={handleSend}
              disabled={!input.trim() || isLoading}
            >
              <Send size={18} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 20
  },
  modalCard: Platform.select({
    web: {
      width: '100%', maxWidth: 450, height: '60vh', minHeight: 400,
      backgroundColor: colors.card, borderRadius: 24, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
      overflow: 'hidden', borderWidth: 1, borderColor: colors.border, display: 'flex', flexDirection: 'column'
    } as any,
    default: {
      width: '100%', maxWidth: 450, height: '70%',
      backgroundColor: colors.card, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 25 },
      shadowOpacity: 0.25, shadowRadius: 50, elevation: 20, overflow: 'hidden', borderWidth: 1, borderColor: colors.border
    }
  }),
  header: {
    padding: 16, paddingHorizontal: 20, backgroundColor: colors.primary, // fallback for gradient
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  botIconContainer: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center'
  },
  headerTitle: { color: colors.card, fontSize: 18, fontWeight: '800' },
  headerSubtitle: { color: colors.card, fontSize: 12, opacity: 0.8 },
  closeBtn: { padding: 8 },
  chatArea: { flex: 1, backgroundColor: colors.background },
  chatContent: { padding: 20, gap: 16 },
  messageRow: { flexDirection: 'row', gap: 8 },
  messageRowUser: { justifyContent: 'flex-end' },
  messageRowModel: { justifyContent: 'flex-start' },
  messageAvatar: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0
  },
  messageBubble: { maxWidth: '75%', padding: 12, paddingHorizontal: 16 },
  bubbleUser: { backgroundColor: colors.primary, borderTopLeftRadius: 18, borderBottomLeftRadius: 18, borderTopRightRadius: 18 },
  bubbleModel: { backgroundColor: colors.card, borderTopRightRadius: 18, borderBottomRightRadius: 18, borderBottomLeftRadius: 18, borderWidth: 1, borderColor: colors.border },
  messageText: { fontSize: 14, lineHeight: 21 },
  textUser: { color: colors.card },
  textModel: { color: colors.text },
  inputArea: {
    padding: 16, backgroundColor: colors.card, borderTopWidth: 1, borderColor: colors.border,
    flexDirection: 'row', gap: 12
  },
  input: {
    flex: 1, padding: 12, paddingHorizontal: 16, borderRadius: 24, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.background, color: '#1e293b', fontSize: 14
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center'
  },
  sendBtnDisabled: { backgroundColor: colors.border }
});
