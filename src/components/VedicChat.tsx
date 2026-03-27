import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import Markdown from 'react-markdown';
import { MessageSquare, X, Send, RefreshCw, User, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getVedicWisdomAnswer } from '../services/aiService';

export const VedicChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([
    { role: 'model', text: "Namaste! I am Viniyogah Guru. How can I assist you with Vedic wisdom today?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      
      const response = await getVedicWisdomAnswer(userMessage, history);
      setMessages(prev => [...prev, { role: 'model', text: response || "I'm sorry, I couldn't find an answer in the stars." }]);
    } catch (err) {
      console.error("Chat error:", err);
      setMessages(prev => [...prev, { role: 'model', text: "The cosmic connection is weak. Please try again later." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-[2.5rem] shadow-2xl border border-black/5 w-[350px] sm:w-[400px] h-[500px] flex flex-col overflow-hidden mb-4"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-accent p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <HelpCircle size={24} />
                </div>
                <div>
                  <h3 className="font-display font-black tracking-tight leading-none">Vedic Wisdom</h3>
                  <p className="text-[10px] opacity-70 uppercase tracking-widest font-bold mt-1">Guru Assistant</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-stone-100">
              {messages.map((m, idx) => (
                <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-4 rounded-2xl text-sm ${
                    m.role === 'user' 
                      ? 'bg-primary text-white rounded-tr-none' 
                      : 'bg-stone-50 text-black/80 rounded-tl-none border border-stone-100'
                  }`}>
                    <div className="prose prose-sm prose-stone max-w-none prose-p:leading-relaxed prose-strong:text-accent">
                      <Markdown>{m.text}</Markdown>
                    </div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-stone-50 p-4 rounded-2xl rounded-tl-none border border-stone-100 flex gap-2">
                    <div className="w-1.5 h-1.5 bg-accent/40 rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-accent/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1.5 h-1.5 bg-accent/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-black/5 flex gap-2">
              <input 
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about Nakshatras, Tithis..."
                className="flex-1 bg-stone-50 border border-stone-100 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary/30 transition-all"
              />
              <button 
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="p-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Send size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-95 cursor-pointer ${
          isOpen ? 'bg-white text-primary border border-black/5' : 'bg-primary text-white'
        }`}
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>
    </div>
  );
};
