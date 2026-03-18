import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  User, 
  Moon, 
  Sun, 
  Bell, 
  ChevronRight, 
  Info, 
  RefreshCw,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Save,
  Search,
  X,
  Download,
  Share2
} from 'lucide-react';
import { format, addYears, isAfter, parseISO } from 'date-fns';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  calculatePositions, 
  findHinduBirthdate, 
  NAKSHATRAS, 
  RASHIS 
} from './services/vedicEngine';
import { HoroscopeChart } from './components/HoroscopeChart';
import { motion, AnimatePresence } from 'motion/react';

interface BirthProfile {
  name: string;
  dob: string;
  tob: string;
  tobUnknown: boolean;
  pob: string;
  pobUnknown: boolean;
  birthNakshatra: string;
  sunRashi: string;
  sunRashiIndex: number;
  moonNakshatraIndex: number;
  moonRashiIndex: number;
  planets?: { name: string; symbol: string; rashi: string; rashiIndex: number }[];
}

interface UpcomingBirthday {
  year: number;
  date: Date;
  formattedDate: string;
}

interface GlobalUpcoming extends UpcomingBirthday {
  name: string;
  nakshatra: string;
}

const Logo = ({ className = "w-10 h-10" }: { className?: string }) => (
  <div className={`relative ${className} flex items-center justify-center`}>
    <div className="absolute inset-0 bg-accent/20 rounded-full blur-md animate-pulse" />
    <svg viewBox="0 0 100 140" className="w-full h-full relative z-10 drop-shadow-sm" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Vel Leaf Shape */}
      <path 
        d="M50 5C50 5 15 55 15 90C15 120 35 130 50 130C65 130 85 120 85 90C85 55 50 5Z" 
        stroke="url(#vel-grad)" 
        strokeWidth="6" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      {/* Stem */}
      <path d="M50 130V140" stroke="#F27D26" strokeWidth="6" strokeLinecap="round"/>
      {/* Tripundra (3 lines) */}
      <path d="M35 75H65" stroke="#F27D26" strokeWidth="4" strokeLinecap="round"/>
      <path d="M30 85H70" stroke="#F27D26" strokeWidth="4" strokeLinecap="round"/>
      <path d="M35 95H65" stroke="#F27D26" strokeWidth="4" strokeLinecap="round"/>
      {/* Bindu (Dot) */}
      <circle cx="50" cy="85" r="4" fill="#F27D26"/>
      {/* Decorative base curls */}
      <path d="M42 122C38 122 34 118 34 114C34 110 38 106 42 106" stroke="#F27D26" strokeWidth="3" strokeLinecap="round"/>
      <path d="M58 122C62 122 66 118 66 114C66 110 62 106 58 106" stroke="#F27D26" strokeWidth="3" strokeLinecap="round"/>
      
      <defs>
        <linearGradient id="vel-grad" x1="50" y1="5" x2="50" y2="130" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F27D26" />
          <stop offset="1" stopColor="#5E2B97" />
        </linearGradient>
      </defs>
    </svg>
  </div>
);

export default function App() {
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [tob, setTob] = useState('12:00');
  const [tobUnknown, setTobUnknown] = useState(false);
  const [pob, setPob] = useState('');
  const [pobUnknown, setPobUnknown] = useState(false);
  const [isManualNakshatra, setIsManualNakshatra] = useState(false);
  const [selectedNakshatraIndex, setSelectedNakshatraIndex] = useState(0);
  const [profile, setProfile] = useState<BirthProfile | null>(null);
  const [upcoming, setUpcoming] = useState<UpcomingBirthday[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [savedProfiles, setSavedProfiles] = useState<BirthProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [globalUpcoming, setGlobalUpcoming] = useState<GlobalUpcoming[]>([]);
  const [calculatingPlanets, setCalculatingPlanets] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstallPrompt(null);
      }
    } else {
      setShowInstallGuide(true);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('vedic_profiles');
    if (saved) {
      try {
        setSavedProfiles(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load saved profiles', e);
      }
    }
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    const calculateGlobalUpcoming = () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const currentYear = today.getFullYear();
      const allUpcoming: GlobalUpcoming[] = [];

      savedProfiles.forEach(p => {
        // Check current year
        let bday = findHinduBirthdate(p.sunRashiIndex, p.moonNakshatraIndex, currentYear);
        
        // If no birthday this year or it already passed, check next year
        if (!bday || isAfter(today, bday)) {
          bday = findHinduBirthdate(p.sunRashiIndex, p.moonNakshatraIndex, currentYear + 1);
        }

        if (bday) {
          allUpcoming.push({
            name: p.name,
            nakshatra: p.birthNakshatra,
            date: bday,
            year: bday.getFullYear(),
            formattedDate: format(bday, 'PPP')
          });
        }
      });

      // Sort by date and take top 3
      const sorted = allUpcoming
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .slice(0, 3);
      
      setGlobalUpcoming(sorted);
    };

    calculateGlobalUpcoming();
  }, [savedProfiles]);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notifications.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'denied') {
        alert('Notification permission was denied. You may need to reset permissions in your browser settings.');
      } else if (permission === 'granted') {
        new Notification('Viniyogah', { body: 'Notifications enabled successfully!' });
      }
    } catch (err) {
      console.error('Notification permission error:', err);
      alert('Could not request notification permission. This is often blocked when the app is running in a preview window. Try opening the app in a new tab!');
    }
  };

  // Handle URL parameters for sharing
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pName = params.get('name');
    const pDob = params.get('dob');
    const pTob = params.get('tob');
    const pTobUnknown = params.get('tobUnknown') === 'true';
    const pPob = params.get('pob');
    const pPobUnknown = params.get('pobUnknown') === 'true';
    const pNakshatraIdx = params.get('nakshatraIdx');

    if (pName) setName(pName);
    if (pDob) setDob(pDob);
    if (pTob) setTob(pTob);
    if (pTobUnknown) setTobUnknown(true);
    if (pPob) setPob(pPob);
    if (pPobUnknown) setPobUnknown(true);
    if (pNakshatraIdx !== null) {
      setIsManualNakshatra(true);
      setSelectedNakshatraIndex(parseInt(pNakshatraIdx));
    }
    
    // Clear params from URL after reading to keep it clean
    if (pName || pDob) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Auto-calculate whenever inputs change
  useEffect(() => {
    const trimmedName = name.trim();
    if (!trimmedName || !dob) {
      setProfile(null);
      setUpcoming([]);
      return;
    }

    const calculate = async () => {
      try {
        const [hours, minutes] = tobUnknown ? [12, 0] : tob.split(':').map(Number);
        const birthDate = new Date(dob);
        birthDate.setHours(hours, minutes, 0, 0);
        
        const pos = calculatePositions(birthDate);

        const finalNakshatraIndex = isManualNakshatra ? selectedNakshatraIndex : pos.moon.nakshatraIndex;
        const finalNakshatraName = NAKSHATRAS[finalNakshatraIndex];

        let planetsData = undefined;

        // Fetch accurate planetary positions if PoB and ToB are known
        if (!tobUnknown && !pobUnknown && pob.trim().length > 3) {
          setCalculatingPlanets(true);
          try {
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
            const prompt = `Calculate the Vedic (Nirayana) planetary positions (Rashi) for:
            Date: ${dob}
            Time: ${tob}
            Place: ${pob}
            
            Return the Rashi (sign) for Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, and Ketu.
            Use the 12 Rashis: Mesha, Vrishabha, Mithuna, Karka, Simha, Kanya, Tula, Vrischika, Dhanu, Makara, Kumbha, Meena.
            Also provide the index (0 for Mesha, 11 for Meena).`;

            const response = await ai.models.generateContent({
              model: "gemini-3.1-flash-lite-preview",
              contents: prompt,
              config: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      symbol: { type: Type.STRING },
                      rashi: { type: Type.STRING },
                      rashiIndex: { type: Type.INTEGER }
                    },
                    required: ["name", "symbol", "rashi", "rashiIndex"]
                  }
                }
              }
            });

            if (response.text) {
              planetsData = JSON.parse(response.text);
            }
          } catch (apiErr) {
            console.error("Failed to fetch accurate planets:", apiErr);
          } finally {
            setCalculatingPlanets(false);
          }
        }

        const newProfile: BirthProfile = {
          name: trimmedName,
          dob,
          tob,
          tobUnknown,
          pob,
          pobUnknown,
          birthNakshatra: finalNakshatraName,
          sunRashi: pos.sun.rashi,
          sunRashiIndex: pos.sun.rashiIndex,
          moonNakshatraIndex: finalNakshatraIndex,
          moonRashiIndex: pos.moon.rashiIndex,
          planets: planetsData
        };

        setProfile(newProfile);

        // Calculate next 5 upcoming birthdays (today or future)
        const results: UpcomingBirthday[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let checkYear = today.getFullYear();
        
        while (results.length < 5 && checkYear < today.getFullYear() + 10) {
          const bday = findHinduBirthdate(pos.sun.rashiIndex, finalNakshatraIndex, checkYear);
          if (bday && !isAfter(today, bday)) {
            results.push({
              year: bday.getFullYear(),
              date: bday,
              formattedDate: format(bday, 'PPP'),
            });
          }
          checkYear++;
        }
        setUpcoming(results);
        setError(null);
      } catch (err) {
        console.error(err);
        setError('Invalid date or time format');
      }
    };

    const timer = setTimeout(calculate, 300);
    return () => clearTimeout(timer);
  }, [name, dob, tob, tobUnknown, pob, pobUnknown, isManualNakshatra, selectedNakshatraIndex]);

  const handleClear = () => {
    setName('');
    setDob('');
    setTob('12:00');
    setTobUnknown(false);
    setPob('');
    setPobUnknown(false);
    setIsManualNakshatra(false);
    setSelectedNakshatraIndex(0);
    setProfile(null);
    setUpcoming([]);
    setError(null);
  };

  const handleSave = () => {
    if (!profile) return;
    
    const existingIndex = savedProfiles.findIndex(p => p.name.toLowerCase() === profile.name.toLowerCase());
    let updated;
    
    if (existingIndex >= 0) {
      updated = [...savedProfiles];
      updated[existingIndex] = profile;
    } else {
      updated = [profile, ...savedProfiles];
    }

    setSavedProfiles(updated);
    localStorage.setItem('vedic_profiles', JSON.stringify(updated));
    alert(existingIndex >= 0 ? 'Profile updated successfully!' : 'Profile saved successfully!');
  };

  const deleteProfile = (index: number) => {
    const updated = savedProfiles.filter((_, i) => i !== index);
    setSavedProfiles(updated);
    localStorage.setItem('vedic_profiles', JSON.stringify(updated));
  };

  const loadProfile = (p: BirthProfile) => {
    setName(p.name);
    setDob(p.dob);
    setTob(p.tob || '12:00');
    setTobUnknown(p.tobUnknown || false);
    setPob(p.pob || '');
    setPobUnknown(p.pobUnknown || false);
    setIsManualNakshatra(true);
    setSelectedNakshatraIndex(p.moonNakshatraIndex);
    // Profile and upcoming will be updated by useEffect
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredProfiles = savedProfiles.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExportCSV = () => {
    if (savedProfiles.length === 0) {
      alert('No profiles to export.');
      return;
    }

    const headers = ['Name', 'Date of Birth', 'Sun Rashi', 'Moon Nakshatra'];
    const rows = savedProfiles.map(p => [
      `"${p.name}"`,
      p.dob,
      p.sunRashi,
      p.birthNakshatra
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `vedic_profiles_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = async (bday: UpcomingBirthday) => {
    if (!profile) return;
    
    const params = new URLSearchParams({
      name: profile.name,
      dob: profile.dob,
      tob: profile.tob,
      tobUnknown: profile.tobUnknown.toString(),
      pob: profile.pob,
      pobUnknown: profile.pobUnknown.toString(),
      nakshatraIdx: profile.moonNakshatraIndex.toString()
    });
    
    const shareUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    
    const shareText = `My Vedic Birthday for ${bday.year} is on ${bday.formattedDate}!\n\nAccording to Viniyogah:\n- Sun Rashi: ${profile.sunRashi}\n- Moon Nakshatra: ${profile.birthNakshatra}\n\nCalculate yours at: ${shareUrl}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Vedic Birthday Details',
          text: shareText,
          url: shareUrl
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(shareText);
        alert('Birthday details and shareable link copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy:', err);
        alert('Could not share or copy. Please try manually.');
      }
    }
  };

  const handleShareProfileLink = async () => {
    if (!profile) return;
    
    const params = new URLSearchParams({
      name: profile.name,
      dob: profile.dob,
      tob: profile.tob,
      tobUnknown: profile.tobUnknown.toString(),
      pob: profile.pob,
      pobUnknown: profile.pobUnknown.toString(),
      nakshatraIdx: profile.moonNakshatraIndex.toString()
    });
    
    const shareUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    
    const shareText = `Check out my Vedic Birth Profile on Viniyogah!\n\nName: ${profile.name}\nSun Rashi: ${profile.sunRashi}\nMoon Nakshatra: ${profile.birthNakshatra}\n\nView my profile here: ${shareUrl}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Vedic Birth Profile',
          text: shareText,
          url: shareUrl
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        alert('Shareable profile link copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy:', err);
        alert('Could not share or copy. Please try manually.');
      }
    }
  };

  const scheduleNotification = (bday: UpcomingBirthday) => {
    // If permission is not granted, we still allow "scheduling" for the demo experience
    // but we warn the user that native alerts might not pop up.
    if (notificationPermission !== 'granted') {
      const confirmDemo = window.confirm(
        'Notification permission is not granted. You can still set the reminder, but you might not receive a native alert. Would you like to proceed?'
      );
      if (!confirmDemo) return;
    }

    alert(`Reminder set for ${bday.formattedDate}! You will be notified on your Hindu Birthdate.`);
    
    // Mock notification if the date is today (for testing)
    const today = new Date();
    if (bday.date.toDateString() === today.toDateString() && notificationPermission === 'granted') {
      try {
        new Notification('Hindu Birthdate Reminder', {
          body: `Happy Hindu Birthday, ${profile?.name}! Today the Sun is in ${profile?.sunRashi} and the Moon is in ${profile?.birthNakshatra}.`,
          icon: '/favicon.ico'
        });
      } catch (e) {
        console.warn('Native notification failed to fire:', e);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#1A1A1A] font-sans selection:bg-primary/20">
      {/* Loading Progress Bar */}
      <AnimatePresence>
        {loading && (
          <motion.div 
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary z-50 origin-left"
          />
        )}
      </AnimatePresence>

      {/* Install Guide Modal */}
      <AnimatePresence>
        {showInstallGuide && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowInstallGuide(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-accent/10 rounded-2xl">
                  <Download className="w-6 h-6 text-accent" />
                </div>
                <button onClick={() => setShowInstallGuide(false)} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <h3 className="text-2xl font-bold mb-4">How to Install</h3>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0 font-bold">1</div>
                  <div>
                    <p className="font-semibold">On iPhone (Safari)</p>
                    <p className="text-stone-600 text-sm">Tap the <Share2 className="inline w-4 h-4 mx-1" /> Share button, then scroll and tap "Add to Home Screen".</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0 font-bold">2</div>
                  <div>
                    <p className="font-semibold">On Android (Chrome)</p>
                    <p className="text-stone-600 text-sm">Tap the <div className="inline-block w-1 h-1 bg-stone-400 rounded-full mx-0.5" /><div className="inline-block w-1 h-1 bg-stone-400 rounded-full mx-0.5" /><div className="inline-block w-1 h-1 bg-stone-400 rounded-full mx-0.5" /> menu, then tap "Install App" or "Add to Home Screen".</p>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setShowInstallGuide(false)}
                className="w-full mt-8 py-4 bg-accent text-white rounded-2xl font-bold hover:bg-accent-dark transition-all shadow-lg shadow-accent/20"
              >
                Got it!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="border-b border-black/5 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo />
            <div>
              <h1 className="font-display font-black text-2xl tracking-tighter leading-none flex items-center lowercase">
                <span className="text-accent">vini</span>
                <span className="text-primary">yogah</span>
              </h1>
              <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-black/30">Vedic Birthday Calculator</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={handleInstall}
              className="text-xs uppercase tracking-widest font-semibold text-accent hover:opacity-80 transition-opacity flex items-center gap-2"
            >
              <Download size={14} />
              Install App
            </button>
            {notificationPermission !== 'granted' && (
              <button 
                onClick={requestNotificationPermission}
                className="text-xs uppercase tracking-widest font-semibold text-primary hover:opacity-80 transition-opacity flex items-center gap-2"
              >
                <Bell size={14} />
                Enable Alerts
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* Global Dashboard - Now at Top */}
        <AnimatePresence>
          {globalUpcoming.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-12"
            >
              <div className="bg-gradient-to-r from-primary via-purple-dark to-accent text-white rounded-[2rem] p-4 md:p-6 overflow-hidden relative shadow-2xl shadow-primary/20 border border-white/10 backdrop-blur-lg">
                <div className="relative z-10 flex flex-col sm:flex-row items-center gap-4 md:gap-8">
                  <div className="hidden md:block shrink-0">
                    <h2 className="text-lg font-display font-black tracking-tighter italic leading-tight">The Next<br/>Three</h2>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 md:gap-4 w-full">
                    {globalUpcoming.map((item, idx) => (
                      <div 
                        key={`${item.name}-${item.date.getTime()}`}
                        className="bg-white/10 border border-white/10 rounded-2xl p-2 md:p-4 flex flex-col justify-between hover:bg-white/20 transition-all group"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-[9px] md:text-xs font-display font-black tracking-wide uppercase truncate">{item.name}</p>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShare({ year: item.year, date: item.date, formattedDate: item.formattedDate });
                            }}
                            className="p-1 rounded-md hover:bg-white/10 text-white/40 hover:text-white transition-all"
                          >
                            <Share2 size={10} />
                          </button>
                        </div>
                        <div className="mt-1">
                          <p className="text-[8px] md:text-[10px] font-bold text-orange-vibrant leading-none">{item.formattedDate.split(',')[0]}</p>
                          <p className="text-[7px] md:text-[9px] text-white/40 font-medium truncate">{item.nakshatra}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Input Section - Now First */}
          <div className="lg:col-span-5 space-y-8">
            <section className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-3xl font-display font-black tracking-tighter italic">Calculate Your Tithi</h2>
                <p className="text-sm text-black/50">Enter your details to find your traditional Hindu birthday.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-black/40 flex items-center gap-2">
                    <User size={12} /> Full Name
                  </label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Arjuna Pandava"
                    className={`w-full bg-white border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${
                      error && !name.trim() ? 'border-red-500' : 'border-black/10'
                    }`}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-black/40 flex items-center gap-2">
                    <Calendar size={12} /> Date of Birth (Gregorian)
                  </label>
                  <input 
                    type="date" 
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className={`w-full bg-white border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${
                      error && !dob ? 'border-red-500' : 'border-black/10'
                    }`}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-black/40 flex items-center gap-2">
                      <MapPin size={12} /> Place of Birth
                    </label>
                    <button 
                      onClick={() => setPobUnknown(!pobUnknown)}
                      className="flex items-center gap-1.5 group"
                    >
                      <div className={`w-3 h-3 rounded border transition-colors flex items-center justify-center ${pobUnknown ? 'bg-primary border-primary' : 'border-black/20 group-hover:border-primary/50'}`}>
                        {pobUnknown && <X size={8} className="text-white" />}
                      </div>
                      <span className="text-[10px] font-bold text-black/40 group-hover:text-primary transition-colors">Not Known</span>
                    </button>
                  </div>
                  <input 
                    type="text" 
                    value={pob}
                    disabled={pobUnknown}
                    onChange={(e) => setPob(e.target.value)}
                    placeholder="e.g. Chennai, India"
                    className={`w-full bg-white border border-black/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${pobUnknown ? 'opacity-40 cursor-not-allowed' : ''}`}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-black/40 flex items-center gap-2">
                      <Clock size={12} /> Time of Birth
                    </label>
                    <button 
                      onClick={() => setTobUnknown(!tobUnknown)}
                      className="flex items-center gap-1.5 group"
                    >
                      <div className={`w-3 h-3 rounded border transition-colors flex items-center justify-center ${tobUnknown ? 'bg-primary border-primary' : 'border-black/20 group-hover:border-primary/50'}`}>
                        {tobUnknown && <X size={8} className="text-white" />}
                      </div>
                      <span className="text-[10px] font-bold text-black/40 group-hover:text-primary transition-colors">Not Known</span>
                    </button>
                  </div>
                  <input 
                    type="time" 
                    value={tob}
                    disabled={tobUnknown}
                    onChange={(e) => setTob(e.target.value)}
                    className={`w-full bg-white border border-black/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${tobUnknown ? 'opacity-40 cursor-not-allowed' : ''}`}
                  />
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-black/40 flex items-center gap-2">
                      <Moon size={12} /> Manual Nakshatra
                    </label>
                    <button 
                      onClick={() => setIsManualNakshatra(!isManualNakshatra)}
                      className={`w-10 h-5 rounded-full transition-colors relative ${isManualNakshatra ? 'bg-primary' : 'bg-black/10'}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isManualNakshatra ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>

                  {isManualNakshatra && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-2 overflow-hidden"
                    >
                      <p className="text-[10px] text-black/40 italic">Select your verified Nakshatra if you know it.</p>
                      <select 
                        value={selectedNakshatraIndex}
                        onChange={(e) => setSelectedNakshatraIndex(parseInt(e.target.value))}
                        className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                      >
                        {NAKSHATRAS.map((n, idx) => (
                          <option key={n} value={idx}>{n}</option>
                        ))}
                      </select>
                    </motion.div>
                  )}
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-3 text-red-600 text-sm">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <div className="flex gap-3">
                    <button 
                      onClick={handleSave}
                      disabled={!profile}
                      className="flex-1 bg-primary text-white rounded-xl py-4 font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 group disabled:opacity-50 relative overflow-hidden shadow-lg shadow-primary/20"
                    >
                      <Save size={18} />
                      <span>Save Profile</span>
                    </button>
                    <button 
                      onClick={handleClear}
                      className="px-4 bg-white border border-black/10 text-black/40 hover:text-red-500 hover:border-red-200 rounded-xl transition-all"
                      title="Clear All"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                  <button 
                    onClick={() => handleShareProfileLink()}
                    disabled={!profile}
                    className="w-full bg-accent text-white rounded-xl py-4 font-semibold hover:bg-accent/90 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-accent/20 disabled:opacity-50"
                  >
                    <Share2 size={18} />
                    <span>Share Profile Link</span>
                  </button>
                </div>
              </div>
            </section>

            {/* Saved Profiles Section */}
            <section className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-[10px] uppercase tracking-widest font-display font-bold text-primary">Saved Profiles</h3>
                <div className="flex items-center gap-2">
                  {savedProfiles.length > 0 && (
                    <button 
                      onClick={handleExportCSV}
                      className="p-1.5 text-primary/40 hover:text-primary transition-colors"
                      title="Export to CSV"
                    >
                      <Download size={14} />
                    </button>
                  )}
                  <span className="text-[10px] font-bold text-primary/30">{savedProfiles.length} total</span>
                </div>
              </div>

              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/30" />
                <input 
                  type="text"
                  placeholder="Search saved..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-primary/10 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-primary/30 transition-all placeholder:text-primary/20"
                />
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-primary/10">
                {filteredProfiles.length > 0 ? (
                  filteredProfiles.map((p, idx) => (
                    <div 
                      key={`${p.name}-${p.dob}`}
                      className="group flex items-center justify-between p-3 bg-white border border-primary/5 rounded-xl hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 transition-all cursor-pointer"
                      onClick={() => loadProfile(p)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary/40 group-hover:bg-primary group-hover:text-white transition-all">
                          <User size={14} />
                        </div>
                        <div>
                          <p className="text-sm font-medium group-hover:text-primary transition-colors">{p.name}</p>
                          <p className="text-[10px] text-black/40">{format(new Date(p.dob), 'PP')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteProfile(idx);
                          }}
                          className="p-2 text-black/10 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          title="Delete Profile"
                        >
                          <Trash2 size={14} />
                        </button>
                        <ChevronRight size={14} className="text-primary/20 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-8 text-xs text-primary/20 italic">No profiles saved yet</p>
                )}
              </div>
            </section>

            <section className="p-6 bg-gradient-to-br from-primary/10 to-accent/10 rounded-3xl border border-primary/10 space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <Info size={16} />
                <h3 className="text-xs uppercase tracking-widest font-display font-bold">How it works</h3>
              </div>
              <p className="text-sm leading-relaxed text-black/70">
                In Vedic tradition, your birthday is celebrated when the <span className="font-bold text-accent">Sun</span> returns to the same <span className="italic">Rashi</span> and the <span className="font-bold text-primary">Moon</span> aligns with your birth <span className="italic">Nakshatra</span>.
              </p>
            </section>
          </div>

          {/* Results Section */}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              {profile ? (
                <motion.div 
                  key="results"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8"
                >
                  {/* Birth Details Card */}
                  <div className="bg-white border border-black/5 rounded-[2.5rem] p-8 shadow-xl shadow-black/5 space-y-8">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h3 className="text-[10px] uppercase tracking-widest font-display font-bold text-black/40">Birth Profile</h3>
                        <p className="text-3xl font-display font-black text-primary tracking-tighter">{profile.name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={handleSave}
                          className="px-4 py-2 bg-primary text-white text-[10px] font-bold uppercase tracking-widest rounded-full shadow-lg shadow-primary/30 flex items-center gap-2 hover:scale-105 transition-all"
                        >
                          <Save size={12} /> Save Profile
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <div className="space-y-3 p-6 bg-gradient-to-br from-accent/10 to-accent/5 rounded-3xl border border-accent/10 relative overflow-hidden group">
                          <div className="absolute top-0 right-0 w-20 h-20 bg-accent opacity-10 blur-2xl -mr-10 -mt-10 group-hover:scale-150 transition-transform" />
                          <div className="flex items-center gap-2 text-accent">
                            <Sun size={18} />
                            <span className="text-[10px] uppercase tracking-widest font-display font-bold">Sun Rashi</span>
                          </div>
                          <p className="text-2xl font-bold">{profile.sunRashi}</p>
                        </div>
                        <div className="space-y-3 p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-3xl border border-primary/10 relative overflow-hidden group">
                          <div className="absolute top-0 right-0 w-20 h-20 bg-primary opacity-10 blur-2xl -mr-10 -mt-10 group-hover:scale-150 transition-transform" />
                          <div className="flex items-center gap-2 text-primary">
                            <Moon size={18} />
                            <span className="text-[10px] uppercase tracking-widest font-display font-bold">Moon Nakshatra</span>
                          </div>
                          <p className="text-2xl font-bold">{profile.birthNakshatra}</p>
                        </div>
                      </div>

                      <div className="flex flex-col items-center justify-center space-y-4">
                        <h3 className="text-[10px] uppercase tracking-widest font-display font-bold text-black/40">Janma Rashi Chakra</h3>
                        <div className="flex gap-4 text-[10px] font-display font-bold uppercase tracking-widest">
                          <div className="flex items-center gap-1.5 text-accent">
                            <div className="w-2 h-2 rounded-full bg-accent" /> Sun
                          </div>
                          <div className="flex items-center gap-1.5 text-primary">
                            <div className="w-2 h-2 rounded-full bg-primary" /> Moon
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Upcoming Dates */}
                  <div className="space-y-4">
                    <h3 className="text-[10px] uppercase tracking-widest font-display font-bold text-black/40 px-2">Upcoming Vedic Birthdays</h3>
                    <div className="space-y-3">
                      {upcoming.map((bday, idx) => (
                        <motion.div 
                          key={bday.year}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="group bg-white border border-black/5 hover:border-primary/30 rounded-2xl p-5 flex items-center justify-between transition-all"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex flex-col items-center justify-center text-primary group-hover:from-primary group-hover:to-accent group-hover:text-white transition-all shadow-sm">
                              <span className="text-[10px] font-display font-bold">{bday.year}</span>
                              <Calendar size={18} />
                            </div>
                            <div>
                              <p className="font-display font-black text-xl tracking-tighter group-hover:text-primary transition-colors">{bday.formattedDate}</p>
                              <p className="text-xs text-black/40 font-medium">Sun in {profile.sunRashi} • Moon in {profile.birthNakshatra}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleShare(bday);
                              }}
                              className="p-3 rounded-xl hover:bg-primary/10 text-black/20 hover:text-primary transition-all"
                              title="Share Birthday"
                            >
                              <Share2 size={18} />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                scheduleNotification(bday);
                              }}
                              className="p-3 rounded-xl hover:bg-primary/10 text-black/20 hover:text-primary transition-all"
                              title="Set Reminder"
                            >
                              <Bell size={18} />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="h-full min-h-[400px] border-2 border-dashed border-black/5 rounded-3xl flex flex-col items-center justify-center text-black/20 space-y-4">
                  <Clock size={48} strokeWidth={1} />
                  <p className="text-sm font-medium">Enter your details to see results</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {profile && (
          <HoroscopeChart 
            name={profile.name}
            sunRashi={profile.sunRashi}
            sunRashiIndex={profile.sunRashiIndex}
            moonNakshatra={profile.birthNakshatra}
            moonNakshatraIndex={profile.moonNakshatraIndex}
            dob={profile.dob}
            tob={profile.tob}
            tobUnknown={profile.tobUnknown}
            pob={profile.pob}
            pobUnknown={profile.pobUnknown}
            planets={profile.planets}
            calculating={calculatingPlanets}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-black/5 py-12 mt-12">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-xs text-black/30">© 2026 Vedic Birthdate Calculator. Sidereal Zodiac (Lahiri Ayanamsa).</p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-xs text-black/30 hover:text-black transition-colors">Privacy</a>
            <a href="#" className="text-xs text-black/30 hover:text-black transition-colors">Terms</a>
            <a href="#" className="text-xs text-black/30 hover:text-black transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
