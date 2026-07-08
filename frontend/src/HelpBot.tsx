import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, Loader2 } from 'lucide-react';

interface HelpBotProps {
  onClose: () => void;
}

interface Message {
  role: 'user' | 'model';
  text: string;
}

const HelpBot: React.FC<HelpBotProps> = ({ onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: "Hi! I'm NexBot, your NexRide AI assistant. How can I help you today?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        setMessages(prev => [...prev, { role: 'model', text: "API Key is missing. Please add VITE_GEMINI_API_KEY to your .env file." }]);
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

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
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
    <AnimatePresence>
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px'
      }}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          style={{
            width: '100%',
            maxWidth: '450px',
            height: '60vh',
            minHeight: '400px',
            backgroundColor: 'var(--card-bg)',
            borderRadius: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid var(--border-subtle)'
          }}
        >
          {/* Header */}
          <div style={{ 
            padding: '16px 20px', 
            background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            color: 'white'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Bot size={24} color="white" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>NexBot</h3>
                <p style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}>AI Support Assistant</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '8px' }}
            >
              <X size={24} />
            </button>
          </div>

          {/* Chat History */}
          <div style={{ 
            flex: 1, 
            padding: '20px', 
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            backgroundColor: 'var(--bg-main)'
          }}>
            {messages.map((msg, idx) => (
              <div key={idx} style={{ 
                display: 'flex', 
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                gap: '8px'
              }}>
                {msg.role === 'model' && (
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#3b82f6', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                    <Bot size={16} color="white" />
                  </div>
                )}
                <div style={{
                  maxWidth: '75%',
                  padding: '12px 16px',
                  borderRadius: msg.role === 'user' ? '18px 18px 0 18px' : '18px 18px 18px 0',
                  backgroundColor: msg.role === 'user' ? '#3b82f6' : 'var(--surface)',
                  color: msg.role === 'user' ? 'white' : 'var(--text-main)',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                  fontSize: '14px',
                  lineHeight: '1.5'
                }}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#3b82f6', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                  <Bot size={16} color="white" />
                </div>
                <div style={{ padding: '12px 16px', borderRadius: '18px 18px 18px 0', backgroundColor: 'var(--surface)', display: 'flex', alignItems: 'center' }}>
                  <Loader2 size={16} color="var(--text-secondary)" className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div style={{ 
            padding: '16px', 
            backgroundColor: 'var(--card-bg)',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            gap: '12px'
          }}>
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your question..."
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: '24px',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text-main)',
                outline: 'none',
                fontSize: '14px'
              }}
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              style={{
                width: '44px', height: '44px',
                borderRadius: '50%',
                backgroundColor: input.trim() && !isLoading ? '#3b82f6' : 'var(--border-subtle)',
                color: 'white',
                border: 'none',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
                transition: 'background-color 0.2s'
              }}
            >
              <Send size={18} style={{ marginLeft: '2px' }} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default HelpBot;
