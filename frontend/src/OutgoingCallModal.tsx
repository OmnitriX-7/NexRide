import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PhoneOff, Phone } from 'lucide-react';

interface OutgoingCallModalProps {
  onClose: () => void;
  calleeName?: string;
  calleeRole?: string;
}

const OutgoingCallModal: React.FC<OutgoingCallModalProps> = ({ 
  onClose, 
  calleeName = "Police (911)", 
  calleeRole = "Emergency Services" 
}) => {
  const [callState, setCallState] = useState<'calling' | 'connected' | 'ended'>('calling');
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    let timer: any;
    
    // Simulate answering after 3 seconds
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
    setTimeout(onClose, 1500);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          zIndex: 9999, display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'center',
          backdropFilter: 'blur(20px)'
        }}
      >
        <motion.div
          animate={callState === 'calling' ? { scale: [1, 1.1, 1] } : {}}
          transition={{ repeat: Infinity, duration: 1.5 }}
          style={{
            width: '120px', height: '120px', borderRadius: '50%',
            background: callState === 'ended' ? 'linear-gradient(135deg, #475569 0%, #475569 100%)' : 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            marginBottom: '32px',
            boxShadow: callState === 'calling' ? '0 0 40px rgba(239, 68, 68, 0.5)' : 'none'
          }}
        >
          <Phone size={60} color="white" />
        </motion.div>

        <h2 style={{ color: 'white', fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>
          {calleeName}
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '18px', marginBottom: '48px' }}>
          {calleeRole}
        </p>

        {callState === 'calling' && (
          <p style={{ color: 'white', fontSize: '20px', marginBottom: '40px', fontWeight: '500' }}>
            Ringing...
          </p>
        )}

        {callState === 'connected' && (
          <p style={{ color: '#22c55e', fontSize: '24px', marginBottom: '40px', fontWeight: 'bold' }}>
            {formatTime(duration)}
          </p>
        )}

        {callState === 'ended' && (
          <p style={{ color: '#ef4444', fontSize: '20px', marginBottom: '40px', fontWeight: '500' }}>
            Call Ended
          </p>
        )}

        <div style={{ display: 'flex', gap: '40px' }}>
          {(callState === 'calling' || callState === 'connected') && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleHangUp}
              style={{
                width: '72px', height: '72px', borderRadius: '50%',
                backgroundColor: '#ef4444', border: 'none',
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                cursor: 'pointer', boxShadow: '0 10px 25px rgba(239, 68, 68, 0.4)'
              }}
            >
              <PhoneOff size={32} color="white" />
            </motion.button>
          )}
        </div>
        
        {callState === 'calling' && (
          <p style={{ color: '#ef4444', fontSize: '14px', marginTop: '40px', maxWidth: '300px', textAlign: 'center' }}>
            Calling emergency services. Your location will be shared automatically.
          </p>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default OutgoingCallModal;
