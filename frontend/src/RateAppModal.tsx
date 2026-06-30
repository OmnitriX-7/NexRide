import { motion, AnimatePresence } from 'framer-motion';
import { X, Star } from 'lucide-react';
import { useState } from 'react';
import { supabase } from './supabaseClient';
import './RateAppModal.css';

interface RateAppModalProps {
  userId: string;
  onClose: () => void;
}

export const RateAppModal = ({ userId, onClose }: RateAppModalProps) => {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
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
      }, 3000);
    } catch (err) {
      console.error("Failed to submit feedback", err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rate-modal-overlay">
      <motion.div 
        className="rate-modal"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
      >
        <button onClick={onClose} className="rate-close-btn"><X size={20} /></button>
        
        <AnimatePresence mode="wait">
          {!submitted ? (
            <motion.div 
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rate-content"
            >
              <h2>How are you enjoying NexRide?</h2>
              <p>Your feedback helps us improve the experience for everyone.</p>

              <div className="stars-container">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    className={`star-btn ${(hoverRating || rating) >= star ? 'active' : ''}`}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                  >
                    <Star size={36} fill={(hoverRating || rating) >= star ? 'currentColor' : 'none'} />
                  </button>
                ))}
              </div>

              {rating > 0 && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="feedback-section"
                >
                  <label htmlFor="feedback">
                    {rating >= 4 ? "Any improvements needed?" : "What can we do to improve?"}
                  </label>
                  <textarea
                    id="feedback"
                    placeholder="Tell us what you love or what could be better..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={4}
                  />
                  <button 
                    className="submit-btn" 
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                  </button>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rate-success"
            >
              <div className="success-icon-large">
                <Star size={48} fill="currentColor" />
              </div>
              <h2>Thank you!</h2>
              <p>Your feedback has been successfully submitted. We appreciate your support! 💙</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
