import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PhoneCall, PhoneOff, Phone } from 'lucide-react';

interface IncomingCallModalProps {
  onClose: (accepted: boolean) => void;
  callerName?: string;
  callerRole?: string;
}

const IncomingCallModal: React.FC<IncomingCallModalProps> = ({ 
  onClose, 
  callerName = "Security Officer Davis", 
  callerRole = "NexRide Trust & Safety Team" 
}) => {
  const [callState, setCallState] = useState<'incoming' | 'connected' | 'ended'>('incoming');
  const [duration, setDuration] = useState(0);
  const [wasAccepted, setWasAccepted] = useState(false);

  useEffect(() => {
    let timer: any;
    if (callState === 'connected') {
      timer = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [callState]);

  const handleAccept = () => {
    setCallState('connected');
    setWasAccepted(true);
  };

  const handleDecline = () => {
    setCallState('ended');
    setTimeout(() => onClose(wasAccepted), 1500);
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
          animate={callState === 'incoming' ? { y: [0, -10, 0] } : {}}
          transition={{ repeat: Infinity, duration: 2 }}
          style={{
            width: '120px', height: '120px', borderRadius: '50%',
            background: callState === 'incoming' ? 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)' : 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            marginBottom: '32px',
            boxShadow: callState === 'incoming' ? '0 0 40px rgba(59, 130, 246, 0.5)' : 'none'
          }}
        >
          <Phone size={60} color="white" />
        </motion.div>

        <h2 style={{ color: 'white', fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>
          {callerName}
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '18px', marginBottom: '48px' }}>
          {callerRole}
        </p>

        {callState === 'incoming' && (
          <p style={{ color: 'white', fontSize: '20px', marginBottom: '40px', fontWeight: '500' }}>
            Incoming Audio Call...
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
          {callState === 'incoming' && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleAccept}
              style={{
                width: '72px', height: '72px', borderRadius: '50%',
                backgroundColor: '#22c55e', border: 'none',
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                cursor: 'pointer', boxShadow: '0 10px 25px rgba(34, 197, 94, 0.4)'
              }}
            >
              <PhoneCall size={32} color="white" />
            </motion.button>
          )}
          
          {(callState === 'incoming' || callState === 'connected') && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleDecline}
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
        
        {callState === 'incoming' && (
          <p style={{ color: '#ef4444', fontSize: '14px', marginTop: '40px', maxWidth: '300px', textAlign: 'center' }}>
            Warning: This ride has exceeded 12 hours. Trust & Safety is checking in on you.
          </p>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default IncomingCallModal;
