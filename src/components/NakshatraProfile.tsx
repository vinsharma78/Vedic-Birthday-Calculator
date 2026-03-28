import * as React from 'react';
import { useState, useEffect } from 'react';
import Markdown from 'react-markdown';
import { Sparkles, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getNakshatraProfile } from '../services/aiService';

interface NakshatraProfileProps {
  nakshatra: string;
}

export const NakshatraProfile: React.FC<NakshatraProfileProps> = ({ nakshatra }) => {
  const [reading, setReading] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const fetchReading = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getNakshatraProfile(nakshatra);
      setReading(result);
    } catch (err) {
      console.error("Failed to fetch Nakshatra profile:", err);
      setError("Failed to generate your profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setReading(null);
    setIsExpanded(false);
  }, [nakshatra]);

  return (
    <div className="bg-white border border-black/5 rounded-[2rem] p-6 shadow-xl shadow-black/5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent/10 rounded-xl text-accent">
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="text-[10px] uppercase tracking-widest font-display font-bold text-black/40">AI Reading</h3>
            <p className="text-xl font-display font-black text-accent tracking-tight">{nakshatra} Personality Profile</p>
          </div>
        </div>
        {!reading && !loading && (
          <button 
            onClick={fetchReading}
            className="px-4 py-2 bg-accent text-white text-[10px] font-bold uppercase tracking-widest rounded-full shadow-lg shadow-accent/30 flex items-center gap-2 hover:scale-105 transition-all cursor-pointer"
          >
            Generate Reading
          </button>
        )}
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <RefreshCw size={32} className="animate-spin text-accent/40" />
          <p className="text-sm font-medium text-black/40">Consulting the stars...</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm">
          {error}
        </div>
      )}

      {reading && (
        <div className="space-y-4">
          <div className={`relative overflow-hidden transition-all duration-500 ${isExpanded ? 'max-h-[2000px]' : 'max-h-[200px]'}`}>
            <div className="prose max-w-none">
              <Markdown>{reading}</Markdown>
            </div>
            {!isExpanded && (
              <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent pointer-events-none" />
            )}
          </div>
          
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full py-3 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-accent hover:bg-accent/5 rounded-xl transition-all cursor-pointer"
          >
            {isExpanded ? (
              <>Show Less <ChevronUp size={14} /></>
            ) : (
              <>Read Full Profile <ChevronDown size={14} /></>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
