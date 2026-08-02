import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, 
  StyleSheet, SafeAreaView, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { Eye, EyeOff, Car, Mail, Lock, Sparkles } from 'lucide-react-native';
import { supabase } from '../supabaseClient';
import { validateEmail, validatePassword } from '../utils/validation';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Focus states to perfectly emulate the CSS :focus-within styling
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  // Hardcoded for now in mobile app since no URL search params exist initially without deep linking
  const referredBy = null;

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setMessage('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleSubmit = async () => {
    if (loading) return;
    setMessage('');

    if (!validateEmail(email)) {
      setMessage('Please enter a valid email address.');
      return;
    }

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.isValid) {
      setMessage(passwordCheck.message);
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setMessage('Error: ' + error.message);
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { referred_by: referredBy } }
        });

        if (error) {
          setMessage('Error: ' + error.message);
        } else {
          setMessage('Account created successfully!');
          setTimeout(() => toggleAuthMode(), 3000);
        }
      }
    } catch (err) {
      setMessage('Error: Network connection failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          <View style={styles.card}>
            {referredBy && !isLogin && (
              <View style={styles.referralBanner}>
                <Sparkles size={16} color="#2563eb" />
                <Text style={styles.referralText}>Referral activated!</Text>
              </View>
            )}

            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Car size={28} color="#2563eb" />
              </View>
              <Text style={styles.title}>{isLogin ? 'Welcome back' : 'Join NexRide'}</Text>
              <Text style={styles.subtitle}>
                {isLogin ? 'Enter your credentials to continue' : 'Sign up to start saving on rides with NexRide'}
              </Text>
            </View>
            
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <View style={[styles.inputContainer, focusedInput === 'email' && styles.inputContainerFocused]}>
                  <Mail size={18} color={focusedInput === 'email' ? "#2563eb" : "#94a3b8"} style={styles.inputIcon} />
                  <TextInput 
                    style={styles.input}
                    placeholder="you@example.com"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    onFocus={() => setFocusedInput('email')}
                    onBlur={() => setFocusedInput(null)}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={[styles.inputContainer, focusedInput === 'password' && styles.inputContainerFocused]}>
                  <Lock size={18} color={focusedInput === 'password' ? "#2563eb" : "#94a3b8"} style={styles.inputIcon} />
                  <TextInput 
                    style={styles.input}
                    placeholder="••••••••"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    onFocus={() => setFocusedInput('password')}
                    onBlur={() => setFocusedInput(null)}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                    {showPassword ? <EyeOff size={18} color="#94a3b8" /> : <Eye size={18} color="#94a3b8" />}
                  </TouchableOpacity>
                </View>
              </View>

              {!isLogin && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Confirm Password</Text>
                  <View style={[styles.inputContainer, focusedInput === 'confirm' && styles.inputContainerFocused]}>
                    <Lock size={18} color={focusedInput === 'confirm' ? "#2563eb" : "#94a3b8"} style={styles.inputIcon} />
                    <TextInput 
                      style={styles.input}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                      onFocus={() => setFocusedInput('confirm')}
                      onBlur={() => setFocusedInput(null)}
                    />
                    <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                      {showConfirmPassword ? <EyeOff size={18} color="#94a3b8" /> : <Eye size={18} color="#94a3b8" />}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {message ? (
                <View style={[styles.messageBox, message.includes('success') ? styles.messageSuccess : styles.messageError]}>
                  <Text style={[styles.messageText, message.includes('success') ? styles.messageTextSuccess : styles.messageTextError]}>
                    {message}
                  </Text>
                </View>
              ) : null}

              <TouchableOpacity 
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.submitButtonText}>{isLogin ? 'Sign In' : 'Create Account'}</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                {isLogin ? "Don't have an account? " : "Already have an account? "}
              </Text>
              <TouchableOpacity onPress={toggleAuthMode}>
                <Text style={styles.footerLink}>{isLogin ? 'Sign up' : 'Log in'}</Text>
              </TouchableOpacity>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: Platform.select({
    web: {
      backgroundColor: '#ffffff', 
      borderRadius: 28, 
      padding: 40, 
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
      borderWidth: 1,
      borderColor: '#f1f5f9'
    } as any,
    default: {
      backgroundColor: 'white', 
      borderRadius: 28, 
      padding: 32, 
      paddingBottom: 40,
      shadowColor: '#000', 
      shadowOffset: { width: 0, height: 10 }, 
      shadowOpacity: 0.05, 
      shadowRadius: 25, 
      elevation: 5,
      borderWidth: 1,
      borderColor: '#f1f5f9'
    }
  }),
  referralBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#eff6ff', padding: 12, borderRadius: 12, marginBottom: 24, borderColor: '#dbeafe', borderWidth: 1 },
  referralText: { color: '#2563eb', fontWeight: '700', fontSize: 13, marginLeft: 8 },
  header: { alignItems: 'center', marginBottom: 32 },
  iconContainer: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#64748b', textAlign: 'center' },
  form: { gap: 20 },
  inputGroup: { gap: 8 },
  label: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  inputContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#f8fafc', 
    borderWidth: 1, 
    borderColor: '#e2e8f0', 
    borderRadius: 14, 
    height: 46, 
    paddingHorizontal: 16 
  },
  inputContainerFocused: Platform.select({
    web: {
      borderColor: '#3b82f6',
      backgroundColor: '#ffffff',
      boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.1)'
    } as any,
    default: {
      borderColor: '#3b82f6',
      backgroundColor: '#ffffff',
    }
  }),
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 15, color: '#0f172a' },
  eyeIcon: { padding: 4 },
  submitButton: { backgroundColor: '#2563eb', height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  primaryBtnText: { color: 'white', fontWeight: '600', fontSize: 15 },
  messageBox: { padding: 12, borderRadius: 12, marginTop: 8 },
  messageError: { backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: 1 },
  messageSuccess: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', borderWidth: 1 },
  messageText: { fontSize: 14, fontWeight: '500', textAlign: 'center' },
  messageTextError: { color: '#ef4444' },
  messageTextSuccess: { color: '#16a34a' },
  toggleBtn: { marginTop: 24, alignItems: 'center' },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { color: 'white', fontWeight: '700', fontSize: 15 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24
  },
  footerText: { color: '#64748b', fontSize: 14 },
  footerLink: { color: '#3b82f6', fontWeight: '600', fontSize: 14 }
});
