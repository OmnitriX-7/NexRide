import { motion } from 'framer-motion';
import { X, Copy, CheckCircle2, MessageCircle, Mail, Send, Gift } from 'lucide-react';
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
    telegram: `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareText)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`,
    email: `mailto:?subject=${encodeURIComponent("Join NexRide!")}&body=${encodeURIComponent(shareText + "\n\n" + referralLink)}`
  };

  return (
    <div className="share-modal-overlay">
      <motion.div 
        className="share-modal"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
      >
        <button onClick={onClose} className="share-close-btn"><X size={20} /></button>
        
        <div className="share-header-banner">
          <div className="gift-icon-container">
            <Gift size={32} color="white" />
          </div>
          <h2>Invite & Earn ₹100</h2>
          <p>Share your link and earn a bonus when your friend completes their first ride!</p>
        </div>

        <div className="share-content">
          <h3 className="section-title">Share via</h3>
          <div className="share-grid">
            <a href={shareLinks.whatsapp} target="_blank" rel="noopener noreferrer" className="share-btn whatsapp">
              <MessageCircle size={22} />
              <span>WhatsApp</span>
            </a>
            <a href={shareLinks.twitter} target="_blank" rel="noopener noreferrer" className="share-btn twitter">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>
              <span>X (Twitter)</span>
            </a>
            <a href={shareLinks.facebook} target="_blank" rel="noopener noreferrer" className="share-btn facebook">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
              <span>Facebook</span>
            </a>
            <a href={shareLinks.telegram} target="_blank" rel="noopener noreferrer" className="share-btn telegram">
              <Send size={22} />
              <span>Telegram</span>
            </a>
            <a href={shareLinks.linkedin} target="_blank" rel="noopener noreferrer" className="share-btn linkedin">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
              <span>LinkedIn</span>
            </a>
            <a href={shareLinks.email} className="share-btn email">
              <Mail size={22} />
              <span>Email</span>
            </a>
          </div>

          <h3 className="section-title">Or copy link</h3>
          <div className="copy-section">
            <div className="link-container">
              <input type="text" value={referralLink} readOnly onClick={(e) => (e.target as HTMLInputElement).select()} />
              <button onClick={handleCopy} className={copied ? 'copied' : ''}>
                {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
