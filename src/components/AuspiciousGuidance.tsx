import * as React from 'react';
import { useState, useEffect } from 'react';
import Markdown from 'react-markdown';
import { Sparkles, RefreshCw, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getAuspiciousGuidance } from '../services/aiService';

interface AuspiciousGuidanceProps {
  name: string;
  nakshatra: string;
  sunRashi: string;
  birthdayDate: string;
  planetaryPositions?: any[];
}

export const AuspiciousGuidance: React.FC<AuspiciousGuidanceProps> = ({ 
  name, 
  nakshatra, 
  sunRashi, 
  birthdayDate, 
  planetaryPositions 
}) => {
  const [guidance, setGuidance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const fetchGuidance = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAuspiciousGuidance(name, nakshatra, sunRashi, birthdayDate, planetaryPositions);
      setGuidance(result);
    } catch (err) {
      console.error("Failed to fetch auspicious guidance:", err);
      setError("Failed to generate guidance. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setGuidance(null);
    setIsExpanded(false);
  }, [name, nakshatra, sunRashi, birthdayDate]);

  return (
    <div className="bg-white border border-black/5 rounded-[2rem] p-6 shadow-xl shadow-black/5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl text-primary">
            <Calendar size={20} />
          </div>
          <div>
            <h3 className="text-[10px] uppercase tracking-widest font-display font-bold text-black/40">AI Guidance</h3>
            <p className="text-xl font-display font-black text-primary tracking-tight">Auspicious Day Significance</p>
          </div>
        </div>
        {!guidance && !loading && (
          <button 
            onClick={fetchGuidance}
            className="px-4 py-2 bg-primary text-white text-[10px] font-bold uppercase tracking-widest rounded-full shadow-lg shadow-primary/30 flex items-center gap-2 hover:scale-105 transition-all cursor-pointer"
          >
            Explain Significance
          </button>
        )}
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <RefreshCw size={32} className="animate-spin text-primary/40" />
          <p className="text-sm font-medium text-black/40">Analyzing planetary alignments...</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm">
          {error}
        </div>
      )}

      {guidance && (
        <div className="space-y-4">
          <div className={`relative overflow-hidden transition-all duration-500 ${isExpanded ? 'max-h-[2000px]' : 'max-h-[200px]'}`}>
            <div className="prose prose-sm prose-stone max-w-none prose-headings:font-display prose-headings:tracking-tight prose-headings:font-black prose-p:text-black/70 prose-strong:text-primary">
              <Markdown>{guidance}</Markdown>
            </div>
            {!isExpanded && (
              <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent pointer-events-none" />
            )}
          </div>
          
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full py-3 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-primary/5 rounded-xl transition-all cursor-pointer"
          >
            {isExpanded ? (
              <>Show Less <ChevronUp size={14} /></>
            ) : (
              <>Read Full Guidance <ChevronDown size={14} /></>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
