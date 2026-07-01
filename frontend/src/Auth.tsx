import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Car, Mail, Lock, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { validateEmail, validatePassword } from './utils/validation'; 

export default function Auth() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [referredBy, setReferredBy] = useState<string | null>(null);
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) setReferredBy(ref);
  }, [searchParams]);

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setMessage('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setMessage('');

    // Validation checks (These will now be RED)
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
          // This specific string triggers the GREEN color
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

  const handleOAuthLogin = async (provider: 'google' | 'facebook') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) setMessage('Error: ' + error.message);
    } catch (err) {
      setMessage('Error: Network connection failed.');
    }
  };

  return (
    <div className="force-light" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px', backgroundColor: '#f8fafc' }}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        style={{ 
          padding: '40px', borderRadius: '28px', width: '100%', maxWidth: '420px', 
          backgroundColor: '#ffffff', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)', 
          border: '1px solid #f1f5f9' 
        }}
      >
        <AnimatePresence>
          {referredBy && !isLogin && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                backgroundColor: '#eff6ff', color: '#2563eb', padding: '12px', borderRadius: '12px',
                fontSize: '13px', fontWeight: '700', textAlign: 'center', marginBottom: '24px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                border: '1px solid #dbeafe'
              }}
            >
              <Sparkles size={16} /> Referral activated!
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '16px', backgroundColor: '#eff6ff', color: '#2563eb', marginBottom: '16px' }}>
            <Car size={28} strokeWidth={2.5} />
          </div>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '800', color: '#0f172a' }}>
            {isLogin ? 'Welcome back' : 'Join NexRide'}
          </h2>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
            {isLogin ? 'Enter your credentials to continue' : 'Sign up to start saving on rides with NexRide'}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                style={{ 
                  width: '100%', padding: '12px 14px 12px 42px', borderRadius: '12px', 
                  border: '1.5px solid #e2e8f0', outline: 'none', 
                  color: '#1e293b', backgroundColor: '#ffffff' 
                }} 
              />
            </div>
          </div>

          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input 
                type={showPassword ? "text" : "password"} 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                style={{ 
                  width: '100%', padding: '12px 44px 12px 42px', borderRadius: '12px', 
                  border: '1.5px solid #e2e8f0', outline: 'none', 
                  color: '#1e293b', backgroundColor: '#ffffff' 
                }} 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {!isLogin && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                exit={{ opacity: 0, height: 0 }} 
                style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '8px', overflow: 'hidden' }}
              >
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input 
                    type={showConfirmPassword ? "text" : "password"} 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    required 
                    style={{ 
                      width: '100%', padding: '12px 44px 12px 42px', borderRadius: '12px', 
                      border: '1.5px solid #e2e8f0', outline: 'none', 
                      color: '#1e293b', backgroundColor: '#ffffff' 
                    }} 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)} 
                    style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            type="submit" 
            disabled={loading} 
            style={{ 
              padding: '14px', borderRadius: '12px', border: 'none', 
              backgroundColor: '#0f172a', color: 'white', fontWeight: '700', 
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '10px'
            }}
          >
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Or continue with</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
        </div>

        <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button 
            onClick={() => handleOAuthLogin('google')}
            style={{ 
              width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', 
              backgroundColor: 'white', color: '#334155', fontWeight: '600', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              cursor: 'pointer', transition: 'background-color 0.2s'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google
          </button>

          <button 
            onClick={() => handleOAuthLogin('facebook')}
            style={{ 
              width: '100%', padding: '12px', borderRadius: '12px', border: 'none', 
              backgroundColor: '#1877F2', color: 'white', fontWeight: '600', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              cursor: 'pointer', transition: 'background-color 0.2s'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Facebook
          </button>
        </div>

        {message && (
          <div style={{ 
            marginTop: '24px', 
            padding: '12px', 
            borderRadius: '12px', 
            fontSize: '13px', 
            textAlign: 'center', 
            fontWeight: '600',
            /* SUCCESS LOGIC: Only show green for account creation */
            backgroundColor: message.includes('Account created') ? '#f0fdf4' : '#fef2f2', 
            color: message.includes('Account created') ? '#15803d' : '#b91c1c',
            border: `1px solid ${message.includes('Account created') ? '#dcfce7' : '#fee2e2'}`
          }}>
            {message}
          </div>
        )}

        <div style={{ marginTop: '32px', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: '#64748b' }}>
            {isLogin ? "New to NexRide?" : "Already have an account?"}
            <button 
              onClick={toggleAuthMode} 
              style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: '700', marginLeft: '6px' }}
            >
              {isLogin ? 'Sign Up' : 'Log In'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}