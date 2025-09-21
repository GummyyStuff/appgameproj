import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TarkovButton } from './TarkovButton';
import { TarkovCard } from './TarkovCard';
import { useErrorTracking } from '@/utils/error-tracking';

interface FeedbackWidgetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FeedbackWidget({ isOpen, onClose }: FeedbackWidgetProps) {
  const [feedbackType, setFeedbackType] = useState<'bug' | 'feature' | 'improvement' | 'complaint' | 'praise'>('bug');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState<number>(5);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const { submitFeedback } = useErrorTracking();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);

    try {
      await submitFeedback({
        type: feedbackType,
        message: message.trim(),
        rating: feedbackType === 'praise' || feedbackType === 'complaint' ? rating : undefined,
        email: email.trim() || undefined,
      });

      setIsSubmitted(true);
      setTimeout(() => {
        onClose();
        setIsSubmitted(false);
        setMessage('');
        setEmail('');
        setRating(5);
      }, 2000);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const feedbackTypes = [
    { value: 'bug', label: 'Bug Report', icon: '🐛' },
    { value: 'feature', label: 'Feature Request', icon: '💡' },
    { value: 'improvement', label: 'Improvement', icon: '⚡' },
    { value: 'complaint', label: 'Complaint', icon: '😞' },
    { value: 'praise', label: 'Praise', icon: '👏' },
  ] as const;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md"
          >
            <TarkovCard className="p-6">
              {isSubmitted ? (
                <div className="text-center">
                  <div className="text-4xl mb-4">✅</div>
                  <h3 className="text-xl font-bold text-tarkov-text mb-2">
                    Thank you for your feedback!
                  </h3>
                  <p className="text-tarkov-text-secondary">
                    Your feedback helps us improve the game experience.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-tarkov-text">
                      Send Feedback
                    </h3>
                    <button
                      onClick={onClose}
                      className="text-tarkov-text-secondary hover:text-tarkov-text transition-colors"
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Feedback Type */}
                    <div>
                      <label className="block text-sm font-medium text-tarkov-text mb-2">
                        Feedback Type
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {feedbackTypes.map((type) => (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => setFeedbackType(type.value)}
                            className={`p-2 rounded border text-sm transition-colors ${
                              feedbackType === type.value
                                ? 'bg-tarkov-accent border-tarkov-accent text-white'
                                : 'bg-tarkov-surface border-tarkov-border text-tarkov-text hover:border-tarkov-accent'
                            }`}
                          >
                            <span className="mr-1">{type.icon}</span>
                            {type.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Rating (for praise/complaint) */}
                    {(feedbackType === 'praise' || feedbackType === 'complaint') && (
                      <div>
                        <label className="block text-sm font-medium text-tarkov-text mb-2">
                          Rating
                        </label>
                        <div className="flex space-x-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setRating(star)}
                              className={`text-2xl transition-colors ${
                                star <= rating ? 'text-yellow-400' : 'text-gray-400'
                              }`}
                            >
                              ⭐
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Message */}
                    <div>
                      <label className="block text-sm font-medium text-tarkov-text mb-2">
                        Message *
                      </label>
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={`Tell us about your ${feedbackType}...`}
                        className="w-full p-3 bg-tarkov-surface border border-tarkov-border rounded text-tarkov-text placeholder-tarkov-text-secondary focus:border-tarkov-accent focus:outline-none resize-none"
                        rows={4}
                        required
                      />
                    </div>

                    {/* Email (optional) */}
                    <div>
                      <label className="block text-sm font-medium text-tarkov-text mb-2">
                        Email (optional)
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full p-3 bg-tarkov-surface border border-tarkov-border rounded text-tarkov-text placeholder-tarkov-text-secondary focus:border-tarkov-accent focus:outline-none"
                      />
                      <p className="text-xs text-tarkov-text-secondary mt-1">
                        Leave your email if you'd like a response
                      </p>
                    </div>

                    {/* Submit Button */}
                    <div className="flex space-x-3 pt-4">
                      <TarkovButton
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                        className="flex-1"
                      >
                        Cancel
                      </TarkovButton>
                      <TarkovButton
                        type="submit"
                        disabled={!message.trim() || isSubmitting}
                        className="flex-1"
                      >
                        {isSubmitting ? 'Sending...' : 'Send Feedback'}
                      </TarkovButton>
                    </div>
                  </form>
                </>
              )}
            </TarkovCard>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Floating feedback button
 */
export function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-tarkov-accent hover:bg-tarkov-accent-dark text-white p-3 rounded-full shadow-lg z-40 transition-colors"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title="Send Feedback"
      >
        💬
      </motion.button>

      <FeedbackWidget isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}