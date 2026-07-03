import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

interface SOSModalProps {
  onClose: () => void;
  onConfirm: () => void;
}

const SOSModal: React.FC<SOSModalProps> = ({ onClose, onConfirm }) => {
  // Prevent background scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 4000,
      padding: '20px'
    }}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        style={{
          backgroundColor: 'white',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '360px',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          position: 'relative',
          border: '2px solid #fecaca'
        }}
      >
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            color: '#64748b'
          }}
        >
          <X size={24} />
        </button>

        <div style={{ padding: '32px 24px 24px', textAlign: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#fef2f2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            color: '#ef4444'
          }}>
            <AlertTriangle size={32} />
          </div>

          <h2 style={{ margin: '0 0 12px', fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>
            Trigger SOS?
          </h2>
          
          <p style={{ margin: '0 0 24px', fontSize: '15px', color: '#64748b', lineHeight: '1.5' }}>
            This will immediately flag your ride as an emergency and provide options to contact the police or your emergency contact.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={onConfirm}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '14px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                fontSize: '16px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
              }}
            >
              Yes, trigger SOS
            </button>
            <button
              onClick={onClose}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '14px',
                backgroundColor: '#f1f5f9',
                color: '#475569',
                border: 'none',
                fontSize: '16px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SOSModal;
