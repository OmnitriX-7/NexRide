import { motion } from 'framer-motion';
import { X, Copy, CheckCircle2, MessageCircle, Mail } from 'lucide-react';
import { useState } from 'react';
import './ShareModal.css';

interface ShareModalProps {
  referralLink: string;
  onClose: () => void;
}

export const ShareModal = ({ referralLink, onClose }: ShareModalProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  const shareText = "Use my link to join NexRide and we both get ride discounts!";

  const shareLinks = {
    whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + " " + referralLink)}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(referralLink)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`,
    email: `mailto:?subject=${encodeURIComponent("Join NexRide!")}&body=${encodeURIComponent(shareText + "\n\n" + referralLink)}`
  };

  return (
    <div className="share-modal-overlay">
      <motion.div 
        className="share-modal"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
      >
        <div className="share-header">
          <h2>Refer a Friend</h2>
          <button onClick={onClose} className="close-btn"><X size={24} /></button>
        </div>
        
        <p className="share-desc">Share your link and earn ₹100 when your friend completes their first ride!</p>

        <div className="share-options">
          <a href={shareLinks.whatsapp} target="_blank" rel="noopener noreferrer" className="share-btn whatsapp">
            <MessageCircle size={24} />
            <span>WhatsApp</span>
          </a>
          <a href={shareLinks.twitter} target="_blank" rel="noopener noreferrer" className="share-btn twitter">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>
            <span>Twitter</span>
          </a>
          <a href={shareLinks.facebook} target="_blank" rel="noopener noreferrer" className="share-btn facebook">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
            <span>Facebook</span>
          </a>
          <a href={shareLinks.email} className="share-btn email">
            <Mail size={24} />
            <span>Email</span>
          </a>
        </div>

        <div className="copy-section">
          <div className="link-container">
            <input type="text" value={referralLink} readOnly />
            <button onClick={handleCopy} className={copied ? 'copied' : ''}>
              {copied ? <CheckCircle2 size={20} /> : <Copy size={20} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
