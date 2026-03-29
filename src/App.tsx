import * as React from 'react';
import { useState, useEffect } from 'react';
import { 
  Calendar, 
  User, 
  Moon, 
  Sun, 
  Bell, 
  BellOff,
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
  Share2,
  LogIn,
  LogOut,
  Zap,
  Globe,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { format, addYears, isAfter, parseISO } from 'date-fns';
import { 
  calculatePositions, 
  findHinduBirthdate, 
  getNakshatra,
  getYoga,
  getTithi,
  getKarana,
  getSamvatsara,
  getAayana,
  getRitu,
  getMaasa,
  NAKSHATRAS, 
  RASHIS,
  VASARAS,
  Coordinates
} from './services/vedicEngine';
import { HoroscopeChart } from './components/HoroscopeChart';
import { NakshatraProfile } from './components/NakshatraProfile';
import { AuspiciousGuidance } from './components/AuspiciousGuidance';
import { VedicChat } from './components/VedicChat';
import { PlaceSearch, PlaceResult } from './components/PlaceSearch';
import { motion, AnimatePresence } from 'motion/react';
import { 
  auth, 
  db, 
  signInWithGoogle, 
  logout, 
  handleFirestoreError, 
  OperationType,
  setupRecaptcha,
  sendOtp,
  ConfirmationResult
} from './firebase';
import { 
  onAuthStateChanged, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  setDoc, 
  doc, 
  deleteDoc, 
  serverTimestamp, 
  updateDoc 
} from 'firebase/firestore';

// Error Boundary Component
class ErrorBoundary extends React.Component<any, any> {
  state: any;
  props: any;
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong.";
      try {
        const parsedError = JSON.parse(this.state.error.message);
        if (parsedError.error) {
          errorMessage = `Firestore Error: ${parsedError.error} (Op: ${parsedError.operationType})`;
        }
      } catch (e) {
        errorMessage = this.state.error.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-stone-50 p-6">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Oops!</h2>
            <p className="text-stone-600 mb-6">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-accent text-white rounded-xl font-bold hover:bg-accent-dark transition-all"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

interface VedicAlert {
  id: string;
  uid: string;
  name: string;
  type: 'birthday' | 'tithi' | 'nakshatra';
  targetDate?: string;
  targetTithi?: string;
  targetNakshatra?: string;
  enabled: boolean;
  createdAt: number;
}

interface BirthProfile {
  name: string;
  dob: string;
  tob: string;
  tobUnknown: boolean;
  pob: string;
  pobUnknown: boolean;
  pobCoords?: { lat: number; lng: number };
  birthNakshatra: string;
  sunRashi: string;
  sunRashiIndex: number;
  moonRashi: string;
  moonNakshatraIndex: number;
  moonRashiIndex: number;
  rahu?: { longitude: number; rashi: string; rashiIndex: number; navamsha: string; navamshaIndex: number; dashamsha: string; dashamshaIndex: number };
  ketu?: { longitude: number; rashi: string; rashiIndex: number; navamsha: string; navamshaIndex: number; dashamsha: string; dashamshaIndex: number };
  lagna?: { longitude: number; rashi: string; rashiIndex: number; navamsha: string; navamshaIndex: number; dashamsha: string; dashamshaIndex: number };
  planets: { name: string; symbol: string; rashi: string; rashiIndex: number; longitude: number; navamsha: string; navamshaIndex: number; dashamsha: string; dashamshaIndex: number }[];
  upcomingPlanets?: { name: string; rashi: string; rashiIndex: number; longitude: number }[];
  ayanamsa?: number;
}

const RASHI_SHORT = [
  'Mes', 'Vri', 'Mit', 'Kar', 'Sim', 'Kan',
  'Tul', 'Vri', 'Dha', 'Mak', 'Kum', 'Mee'
];

const NAKSHATRA_SHORT = [
  'Ashw', 'Bhar', 'Krit', 'Rohi', 'Mrig', 'Ardr',
  'Puna', 'Push', 'Ashl', 'Magh', 'P.Phal', 'U.Phal',
  'Hast', 'Chit', 'Swat', 'Vish', 'Anur', 'Jyes',
  'Mula', 'P.Asad', 'U.Asad', 'Shra', 'Dhan', 'Shat',
  'P.Bhad', 'U.Bhad', 'Reva'
];

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
        d="M50 5 C35 35 15 60 15 90 C15 120 35 130 50 130 C65 130 85 120 85 90 C85 60 65 35 50 5 Z" 
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

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

async function fetchTimezoneOffset(lat: number, lng: number, date: Date): Promise<number | null> {
  if (!hasValidKey) return null;

  const timestamp = Math.floor(date.getTime() / 1000);
  const url = `https://maps.googleapis.com/maps/api/timezone/json?location=${lat},${lng}&timestamp=${timestamp}&key=${API_KEY}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (data.status === 'OK') {
      const totalOffsetSeconds = data.rawOffset + data.dstOffset;
      return totalOffsetSeconds / 3600;
    }
    if (data.status === 'REQUEST_DENIED') {
      console.error('Google Maps API Key error:', data.errorMessage);
      return null;
    }
    console.error('Timezone API error:', data.status, data.errorMessage);
    return null;
  } catch (error) {
    console.error('Failed to fetch timezone offset:', error);
    return null;
  }
}

export default function AppWrapper() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [tob, setTob] = useState('12:00');
  const [tobUnknown, setTobUnknown] = useState(false);
  const [pob, setPob] = useState('');
  const [pobCoords, setPobCoords] = useState<Coordinates | null>(null);
  const [timezone, setTimezone] = useState('5.5');
  const [pobUnknown, setPobUnknown] = useState(false);
  const [isManualNakshatra, setIsManualNakshatra] = useState(false);
  const [selectedNakshatraIndex, setSelectedNakshatraIndex] = useState(0);
  const [profile, setProfile] = useState<BirthProfile | null>(null);
  const [upcoming, setUpcoming] = useState<UpcomingBirthday[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Safety check for loading state
  useEffect(() => {
    console.log("Loading state:", loading);
    if (loading) {
      const timer = setTimeout(() => {
        console.warn("Loading timed out after 10s");
        setLoading(false);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [savedProfiles, setSavedProfiles] = useState<BirthProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [globalUpcoming, setGlobalUpcoming] = useState<GlobalUpcoming[]>([]);
  const [loggingIn, setLoggingIn] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showSavedAlerts, setShowSavedAlerts] = useState(false);
  const [alerts, setAlerts] = useState<VedicAlert[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [rahuKaal, setRahuKaal] = useState<{ 
    today: { start: Date; end: Date; isOngoing: boolean };
    tomorrow: { start: Date; end: Date };
    nextEvent: { type: 'starts' | 'ends'; timeLeft: string };
  } | null>(null);
  const [panchangam, setPanchangam] = useState<{
    samvatsara: string;
    aayana: string;
    ritu: string;
    maasa: string;
    paksha: string;
    tithi: string;
    vasara: string;
    nakshatra: string;
    yoga: string;
    karana: string;
    tithiIndex: number;
  } | null>(null);

  // Current Time Update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Rahu Kaal Calculation
  useEffect(() => {
    const calculateForDate = (date: Date) => {
      const dayOfWeek = date.getDay(); // 0 = Sun, 1 = Mon, ...
      const rahuKaalParts = [8, 2, 7, 5, 6, 4, 3];
      const partIndex = rahuKaalParts[dayOfWeek];
      
      const start = new Date(date);
      start.setHours(6, 0, 0, 0);
      const partDurationMs = 1.5 * 60 * 60 * 1000;
      const startMs = start.getTime() + (partIndex - 1) * partDurationMs;
      const endMs = startMs + partDurationMs;
      
      return { start: new Date(startMs), end: new Date(endMs) };
    };

    const updateRahuKaal = () => {
      const now = new Date();
      const todayData = calculateForDate(now);
      
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowData = calculateForDate(tomorrow);
      
      const isOngoing = now >= todayData.start && now <= todayData.end;
      
      let nextType: 'starts' | 'ends' = 'starts';
      let targetDate = todayData.start;

      if (isOngoing) {
        nextType = 'ends';
        targetDate = todayData.end;
      } else if (now > todayData.end) {
        nextType = 'starts';
        targetDate = tomorrowData.start;
      } else {
        nextType = 'starts';
        targetDate = todayData.start;
      }

      const diffMs = targetDate.getTime() - now.getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const timeLeft = `${hours}h ${minutes}m`;

      setRahuKaal({ 
        today: { ...todayData, isOngoing },
        tomorrow: tomorrowData,
        nextEvent: { type: nextType, timeLeft }
      });
    };

    updateRahuKaal();
    const timer = setInterval(updateRahuKaal, 60000);
    return () => clearInterval(timer);
  }, []);

  // Panchangam Calculation
  useEffect(() => {
    const updatePanchangam = () => {
      const now = new Date();
      const pos = calculatePositions(now);
      if (!pos) return;

      const sunLong = pos.sun.longitude;
      const moonLong = pos.moon.longitude;

      const tithiData = getTithi(sunLong, moonLong);
      const nakData = getNakshatra(moonLong);
      const yogaData = getYoga(sunLong, moonLong);
      const karanaData = getKarana(sunLong, moonLong);

      setPanchangam({
        samvatsara: getSamvatsara(now.getUTCFullYear()),
        aayana: getAayana(sunLong),
        ritu: getRitu(sunLong),
        maasa: getMaasa(sunLong),
        paksha: tithiData.paksha,
        tithi: tithiData.name,
        vasara: VASARAS[now.getDay()],
        nakshatra: nakData.name,
        yoga: yogaData.name,
        karana: karanaData.name,
        tithiIndex: tithiData.index
      });
    };

    updatePanchangam();
    const timer = setInterval(updatePanchangam, 3600000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsInstalled(isStandalone);
  }, []);

  if (!hasValidKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-6 font-sans">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Google Maps API Key Required</h2>
            <p className="text-stone-500 text-sm">To enable accurate location search and planetary calculations, please add your Google Maps API key.</p>
          </div>
          
          <div className="text-left space-y-4 bg-stone-50 p-6 rounded-2xl border border-stone-100">
            <p className="text-sm font-bold text-stone-800">Setup Instructions</p>
            <ul className="text-sm space-y-3 text-stone-600 list-disc pl-5">
              <li>Get an API key: <a href="https://console.cloud.google.com/google/maps-apis/credentials" target="_blank" rel="noopener" className="text-primary hover:underline">Google Cloud Console</a></li>
              <li>Open <strong>Settings</strong> (⚙️ gear icon, top-right)</li>
              <li>Select <strong>Secrets</strong></li>
              <li>Add <strong>GOOGLE_MAPS_PLATFORM_KEY</strong> as the secret name</li>
              <li>Paste your API key as the value and press <strong>Enter</strong></li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      console.log("beforeinstallprompt event fired");
      e.preventDefault();
      setInstallPrompt(e);
    };
    const handleAppInstalled = () => {
      console.log("appinstalled event fired");
      setIsInstalled(true);
      setInstallPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    console.log("handleInstall triggered, installPrompt available:", !!installPrompt);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isChromeIOS = /CriOS/.test(navigator.userAgent);

    if (isChromeIOS || isIOS) {
      console.log("iOS detected, showing guide");
      setShowInstallGuide(true);
      return;
    }

    if (installPrompt) {
      console.log("Showing native install prompt");
      try {
        installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        console.log("Install prompt outcome:", outcome);
        if (outcome === 'accepted') {
          setIsInstalled(true);
          setInstallPrompt(null);
        }
      } catch (err) {
        console.error("Error during native install prompt:", err);
        setShowInstallGuide(true);
      }
    } else {
      console.log("No native prompt available, showing guide");
      setShowInstallGuide(true);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
      if (u) {
        // Sync user to Firestore
        const userRef = doc(db, 'users', u.uid);
        setDoc(userRef, {
          uid: u.uid,
          displayName: u.displayName,
          email: u.email,
          role: 'user',
          createdAt: serverTimestamp()
        }, { merge: true }).catch(err => {
          console.error("Error syncing user profile:", err);
        });
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !isAuthReady) {
      setSavedProfiles([]);
      return;
    }

    const q = query(collection(db, 'profiles'), where('uid', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const profiles: BirthProfile[] = [];
      snapshot.forEach((doc) => {
        profiles.push(doc.data() as BirthProfile);
      });
      console.log(`Loaded ${profiles.length} saved profiles for user ${user.uid}`);
      setSavedProfiles(profiles);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'profiles');
    });

    return () => unsubscribe();
  }, [user, isAuthReady]);

  useEffect(() => {
    if (!isAuthReady) return;

    if (!user) {
      // Load from localStorage if not logged in
      const reminders = JSON.parse(localStorage.getItem('viniyogah_reminders') || '[]');
      const localAlerts: VedicAlert[] = reminders.map((r: any, idx: number) => ({
        id: `local-${idx}`,
        uid: 'local',
        name: `Vedic Birthday: ${r.name}`,
        targetDate: r.formattedDate,
        type: 'birthday',
        enabled: true,
        createdAt: new Date(r.date).getTime()
      }));
      setAlerts(localAlerts);
      return;
    }

    const q = query(collection(db, 'alerts'), where('uid', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedAlerts: VedicAlert[] = [];
      snapshot.forEach((doc) => {
        loadedAlerts.push({ id: doc.id, ...doc.data() } as VedicAlert);
      });
      setAlerts(loadedAlerts);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'alerts');
    });

    return () => unsubscribe();
  }, [user, isAuthReady]);

  useEffect(() => {
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
        try {
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
        } catch (e) {
          console.error("Error calculating global upcoming:", e);
        }
      });

      // Sort by date and take top 3
      const sorted = allUpcoming
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .slice(0, 3);
      
      console.log(`Calculated ${sorted.length} global upcoming birthdays`);
      setGlobalUpcoming(sorted);
    };

    calculateGlobalUpcoming();
  }, [savedProfiles]);

  const requestNotificationPermission = async () => {
    console.log("requestNotificationPermission triggered");
    if (!('Notification' in window)) {
      console.warn("Notifications not supported");
      alert('This browser does not support desktop notifications.');
      return;
    }

    // Check for iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;

    if (isIOS && !isStandalone) {
      console.log("iOS non-standalone detected, showing guide");
      setShowInstallGuide(true);
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'denied') {
        console.warn("Notification permission denied");
      } else if (permission === 'granted') {
        console.log("Notification permission granted");
        new Notification('Viniyogah', { body: 'Notifications enabled successfully!' });
      }
    } catch (err) {
      console.error('Notification permission error:', err);
    }
  };

  const toggleAlert = async (alert: VedicAlert) => {
    if (!user) {
      // Handle local storage toggle
      const reminders = JSON.parse(localStorage.getItem('viniyogah_reminders') || '[]');
      const updatedReminders = reminders.map((r: any) => {
        if (r.formattedDate === alert.targetDate && `Vedic Birthday: ${r.name}` === alert.name) {
          return { ...r, enabled: !alert.enabled };
        }
        return r;
      });
      localStorage.setItem('viniyogah_reminders', JSON.stringify(updatedReminders));
      
      // Update local alerts state
      const localAlerts: VedicAlert[] = updatedReminders.map((r: any, idx: number) => ({
        id: `local-${idx}`,
        uid: 'local',
        name: `Vedic Birthday: ${r.name}`,
        targetDate: r.formattedDate,
        type: 'birthday',
        enabled: r.enabled !== false,
        createdAt: r.createdAt || new Date(r.date).getTime()
      }));
      setAlerts(localAlerts);
      return;
    }
    try {
      await updateDoc(doc(db, 'alerts', alert.id), {
        enabled: !alert.enabled
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `alerts/${alert.id}`);
    }
  };

  const deleteAlert = async (alertId: string) => {
    if (!user) {
      // Handle local storage delete
      const reminders = JSON.parse(localStorage.getItem('viniyogah_reminders') || '[]');
      // Extract index from local-idx
      const idx = parseInt(alertId.split('-')[1]);
      if (!isNaN(idx)) {
        reminders.splice(idx, 1);
        localStorage.setItem('viniyogah_reminders', JSON.stringify(reminders));
        
        // Update local alerts state
        const localAlerts: VedicAlert[] = reminders.map((r: any, idx: number) => ({
          id: `local-${idx}`,
          uid: 'local',
          name: `Vedic Birthday: ${r.name}`,
          targetDate: r.formattedDate,
          type: 'birthday',
          enabled: r.enabled !== false,
          createdAt: r.createdAt || new Date(r.date).getTime()
        }));
        setAlerts(localAlerts);
      }
      return;
    }
    try {
      await deleteDoc(doc(db, 'alerts', alertId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `alerts/${alertId}`);
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
    const pLat = params.get('lat');
    const pLng = params.get('lng');
    const pNakshatraIdx = params.get('nakshatraIdx');

    if (pName) setName(pName);
    if (pDob) setDob(pDob);
    if (pTob) setTob(pTob);
    if (pTobUnknown) setTobUnknown(true);
    if (pPob) setPob(pPob);
    if (pPobUnknown) setPobUnknown(true);
    if (pLat && pLng) {
      setPobCoords({ lat: parseFloat(pLat), lng: parseFloat(pLng) });
    }
    if (pNakshatraIdx !== null) {
      setIsManualNakshatra(true);
      setSelectedNakshatraIndex(parseInt(pNakshatraIdx));
    }
    
    // Clear params from URL after reading to keep it clean
    if (pName || pDob) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Reset manual nakshatra when birth details change
  useEffect(() => {
    setIsManualNakshatra(false);
  }, [dob, tob, tobUnknown, pob, pobUnknown]);

  // Clear coords if PoB is unknown
  useEffect(() => {
    if (pobUnknown) {
      setPobCoords(null);
    }
  }, [pobUnknown]);

  // Auto-fetch timezone offset when place or time changes
  useEffect(() => {
    if (!pobCoords || !dob) return;

    const fetchTz = async () => {
      const parts = dob.split(/[-/.]/);
      if (parts.length !== 3) return;
      
      let y, m, d;
      if (parts[0].length === 4) {
        y = parseInt(parts[0]);
        m = parseInt(parts[1]);
        d = parseInt(parts[2]);
      } else {
        d = parseInt(parts[0]);
        m = parseInt(parts[1]);
        y = parseInt(parts[2]);
      }
      
      if (isNaN(y) || isNaN(m) || isNaN(d)) return;
      
      const timeParts = tob.split(':');
      const [hours, minutes] = tobUnknown ? [12, 0] : timeParts.map(Number);
      
      const birthDate = new Date(y, m - 1, d, hours, minutes);
      if (isNaN(birthDate.getTime())) return;

      const offset = await fetchTimezoneOffset(pobCoords.lat, pobCoords.lng, birthDate);
      if (offset !== null) {
        setTimezone(offset.toString());
      }
    };

    const timer = setTimeout(fetchTz, 500);
    return () => clearTimeout(timer);
  }, [pobCoords, dob, tob, tobUnknown]);

  // Auto-calculate whenever inputs change
  useEffect(() => {
    const trimmedName = name.trim() || "You";
    if (!dob || dob.length < 8) {
      setProfile(null);
      setUpcoming([]);
      setError(null);
      return;
    }

    const calculate = async () => {
      try {
        // Robust date parsing for YYYY-MM-DD or DD-MM-YYYY
        if (!dob) return;
        
        const parts = dob.split(/[-/.]/);
        if (parts.length !== 3) return;

        let y, m, d;
        if (parts[0].length === 4) {
          // YYYY-MM-DD
          y = parseInt(parts[0]);
          m = parseInt(parts[1]);
          d = parseInt(parts[2]);
        } else if (parts[2].length === 4) {
          // DD-MM-YYYY or MM-DD-YYYY
          const p1 = parseInt(parts[0]);
          const p2 = parseInt(parts[1]);
          const p3 = parseInt(parts[2]);
          
          if (p1 > 12 && p2 <= 12) {
            // Definitely DD-MM-YYYY
            d = p1;
            m = p2;
          } else if (p2 > 12 && p1 <= 12) {
            // Definitely MM-DD-YYYY
            m = p1;
            d = p2;
          } else {
            // Ambiguous, assume DD-MM-YYYY
            d = p1;
            m = p2;
          }
          y = p3;
        } else {
          return;
        }
        
        if (isNaN(y) || isNaN(m) || isNaN(d)) return;
        
        const birthDate = new Date(y, m - 1, d);
        if (isNaN(birthDate.getTime())) return;

        const year = birthDate.getFullYear();
        if (year < -3000 || year > 3000) {
          setError('Date must be between 3000 BCE and 3000 CE');
          return;
        }

        const timeParts = tob.split(':');
        if (!tobUnknown && timeParts.length < 2) {
          return; // Still typing time
        }

        const [hours, minutes] = tobUnknown ? [12, 0] : timeParts.map(Number);
        if (!tobUnknown && (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59)) {
          return;
        }

        // Use the manual timezone offset or default to India (5.5)
        const tzOffsetNum = parseFloat(timezone) || 5.5;
        
        // Use the parsed date and time to create UTC date
        const utcBirthDate = new Date(Date.UTC(y, m - 1, d, hours, minutes) - (tzOffsetNum * 3600000));
        
        console.log("Calculating positions for (UTC):", utcBirthDate.toISOString(), "Offset used:", tzOffsetNum);
        
        // Ensure we have coords if not unknown
        if (!pobUnknown && !pobCoords) {
          setError('Please select a birth place from the dropdown to calculate Lagna.');
          return;
        }

        const pos = calculatePositions(utcBirthDate, pobCoords || undefined);
        if (!pos) {
          setError('Could not calculate planetary positions. This might be due to an extreme date or internal error.');
          return;
        }

        const finalNakshatraIndex = isManualNakshatra ? selectedNakshatraIndex : pos.moon.nakshatraIndex;
        const finalNakshatraName = NAKSHATRAS[finalNakshatraIndex];

        const dobString = `${y}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
        const tobString = tobUnknown ? '12:00' : tob.split(':').map(p => p.padStart(2, '0')).join(':');

    const planetsData = [
          { name: 'Sun', symbol: 'Su', rashi: pos.sun.rashi, rashiIndex: pos.sun.rashiIndex, longitude: pos.sun.longitude, navamsha: pos.sun.navamsha, navamshaIndex: pos.sun.navamshaIndex, dashamsha: pos.sun.dashamsha, dashamshaIndex: pos.sun.dashamshaIndex },
          { name: 'Moon', symbol: 'Mo', rashi: pos.moon.rashi, rashiIndex: pos.moon.rashiIndex, longitude: pos.moon.longitude, navamsha: pos.moon.navamsha, navamshaIndex: pos.moon.navamshaIndex, dashamsha: pos.moon.dashamsha, dashamshaIndex: pos.moon.dashamshaIndex },
          { name: 'Mars', symbol: 'Ma', rashi: pos.mars.rashi, rashiIndex: pos.mars.rashiIndex, longitude: pos.mars.longitude, navamsha: pos.mars.navamsha, navamshaIndex: pos.mars.navamshaIndex, dashamsha: pos.mars.dashamsha, dashamshaIndex: pos.mars.dashamshaIndex },
          { name: 'Mercury', symbol: 'Me', rashi: pos.mercury.rashi, rashiIndex: pos.mercury.rashiIndex, longitude: pos.mercury.longitude, navamsha: pos.mercury.navamsha, navamshaIndex: pos.mercury.navamshaIndex, dashamsha: pos.mercury.dashamsha, dashamshaIndex: pos.mercury.dashamshaIndex },
          { name: 'Jupiter', symbol: 'Ju', rashi: pos.jupiter.rashi, rashiIndex: pos.jupiter.rashiIndex, longitude: pos.jupiter.longitude, navamsha: pos.jupiter.navamsha, navamshaIndex: pos.jupiter.navamshaIndex, dashamsha: pos.jupiter.dashamsha, dashamshaIndex: pos.jupiter.dashamshaIndex },
          { name: 'Venus', symbol: 'Ve', rashi: pos.venus.rashi, rashiIndex: pos.venus.rashiIndex, longitude: pos.venus.longitude, navamsha: pos.venus.navamsha, navamshaIndex: pos.venus.navamshaIndex, dashamsha: pos.venus.dashamsha, dashamshaIndex: pos.venus.dashamshaIndex },
          { name: 'Saturn', symbol: 'Sa', rashi: pos.saturn.rashi, rashiIndex: pos.saturn.rashiIndex, longitude: pos.saturn.longitude, navamsha: pos.saturn.navamsha, navamshaIndex: pos.saturn.navamshaIndex, dashamsha: pos.saturn.dashamsha, dashamshaIndex: pos.saturn.dashamshaIndex },
          { name: 'Rahu', symbol: 'Ra', rashi: pos.rahu.rashi, rashiIndex: pos.rahu.rashiIndex, longitude: pos.rahu.longitude, navamsha: pos.rahu.navamsha, navamshaIndex: pos.rahu.navamshaIndex, dashamsha: pos.rahu.dashamsha, dashamshaIndex: pos.rahu.dashamshaIndex },
          { name: 'Ketu', symbol: 'Ke', rashi: pos.ketu.rashi, rashiIndex: pos.ketu.rashiIndex, longitude: pos.ketu.longitude, navamsha: pos.ketu.navamsha, navamshaIndex: pos.ketu.navamshaIndex, dashamsha: pos.ketu.dashamsha, dashamshaIndex: pos.ketu.dashamshaIndex }
        ];

        const results: UpcomingBirthday[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let checkYear = today.getFullYear();
        
        while (results.length < 5 && checkYear < today.getFullYear() + 10) {
          const bday = findHinduBirthdate(pos.sun.rashiIndex, finalNakshatraIndex, checkYear, pobCoords || undefined);
          if (bday && !isAfter(today, bday)) {
            results.push({
              year: bday.getFullYear(),
              date: bday,
              formattedDate: format(bday, 'MMM dd, yyyy'),
            });
          }
          checkYear++;
        }

        // Calculate planetary positions for the first upcoming birthday for AI guidance
        let upcomingPlanetsData = undefined;
        if (results.length > 0) {
          const upcomingPos = calculatePositions(results[0].date, pobCoords || undefined);
          if (upcomingPos) {
            upcomingPlanetsData = [
              { name: 'Sun', rashi: upcomingPos.sun.rashi, rashiIndex: upcomingPos.sun.rashiIndex, longitude: upcomingPos.sun.longitude },
              { name: 'Moon', rashi: upcomingPos.moon.rashi, rashiIndex: upcomingPos.moon.rashiIndex, longitude: upcomingPos.moon.longitude },
              { name: 'Mars', rashi: upcomingPos.mars.rashi, rashiIndex: upcomingPos.mars.rashiIndex, longitude: upcomingPos.mars.longitude },
              { name: 'Mercury', rashi: upcomingPos.mercury.rashi, rashiIndex: upcomingPos.mercury.rashiIndex, longitude: upcomingPos.mercury.longitude },
              { name: 'Jupiter', rashi: upcomingPos.jupiter.rashi, rashiIndex: upcomingPos.jupiter.rashiIndex, longitude: upcomingPos.jupiter.longitude },
              { name: 'Venus', rashi: upcomingPos.venus.rashi, rashiIndex: upcomingPos.venus.rashiIndex, longitude: upcomingPos.venus.longitude },
              { name: 'Saturn', rashi: upcomingPos.saturn.rashi, rashiIndex: upcomingPos.saturn.rashiIndex, longitude: upcomingPos.saturn.longitude },
              { name: 'Rahu', rashi: upcomingPos.rahu.rashi, rashiIndex: upcomingPos.rahu.rashiIndex, longitude: upcomingPos.rahu.longitude },
              { name: 'Ketu', rashi: upcomingPos.ketu.rashi, rashiIndex: upcomingPos.ketu.rashiIndex, longitude: upcomingPos.ketu.longitude }
            ];
          }
        }

        const newProfile: BirthProfile = {
          name: trimmedName,
          dob: dobString,
          tob: tobString,
          tobUnknown,
          pob,
          pobUnknown,
          pobCoords: pobCoords || undefined,
          birthNakshatra: finalNakshatraName,
          sunRashi: pos.sun.rashi,
          sunRashiIndex: pos.sun.rashiIndex,
          moonRashi: pos.moon.rashi,
          moonNakshatraIndex: finalNakshatraIndex,
          moonRashiIndex: pos.moon.rashiIndex,
          rahu: pos.rahu,
          ketu: pos.ketu,
          lagna: pos.lagna,
          planets: planetsData,
          upcomingPlanets: upcomingPlanetsData,
          ayanamsa: pos.ayanamsa
        };

        setProfile(newProfile);
        setUpcoming(results);
        setError(null);
      } catch (err: any) {
        console.error("Calculation error:", err);
        if (err.message?.includes('out of range')) {
          setError('The date is outside the supported range for Vedic calculations.');
        } else {
          setError('An error occurred during calculation. Please check your inputs.');
        }
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
    setPobCoords(null);
    setPobUnknown(false);
    setIsManualNakshatra(false);
    setSelectedNakshatraIndex(0);
    setProfile(null);
    setUpcoming([]);
    setError(null);
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!phoneNumber) {
      setError("Please enter a valid phone number.");
      return;
    }

    setLoggingIn(true);
    setError(null);
    try {
      // Basic validation for phone number
      const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
      if (!cleanPhone.startsWith('+')) {
        setError("Please include your country code (e.g., +91 for India).");
        setLoggingIn(false);
        return;
      }

      const verifier = setupRecaptcha('recaptcha-container');
      const result = await sendOtp(cleanPhone, verifier);
      setConfirmationResult(result);
      setIsOtpSent(true);
    } catch (err: any) {
      console.error("Error sending OTP:", err);
      let msg = "Failed to send OTP. Please try again.";
      if (err.code === 'auth/invalid-phone-number') msg = "Invalid phone number format. Please use E.164 format (e.g., +919876543210).";
      if (err.code === 'auth/too-many-requests') msg = "Too many attempts. Please try again later.";
      if (err.code === 'auth/captcha-check-failed') msg = "Security check failed. Please refresh and try again.";
      if (err.code === 'auth/unauthorized-domain') msg = "This domain is not authorized for phone authentication. Please contact support.";
      if (err.code === 'auth/operation-not-allowed') msg = "Phone authentication is not enabled in the Firebase console.";
      
      setError(`${msg} (${err.code || 'unknown'})`);
      // Reset reCAPTCHA if it fails
      if ((window as any).recaptchaVerifier) {
        try {
          (window as any).recaptchaVerifier.clear();
        } catch (e) {}
        (window as any).recaptchaVerifier = null;
      }
    } finally {
      setLoggingIn(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!otp || !confirmationResult) {
      setError("Please enter the verification code.");
      return;
    }

    setLoggingIn(true);
    setError(null);
    try {
      const cleanOtp = otp.replace(/\s/g, '');
      await confirmationResult.confirm(cleanOtp);
      setShowLoginModal(false);
      setIsOtpSent(false);
      setOtp('');
      setPhoneNumber('');
    } catch (err: any) {
      console.error("Error verifying OTP:", err);
      let msg = "Invalid verification code. Please try again.";
      if (err.code === 'auth/code-expired') msg = "The verification code has expired. Please request a new one.";
      if (err.code === 'auth/invalid-verification-code') msg = "Invalid verification code. Please check and try again.";
      
      setError(`${msg} (${err.code || 'unknown'})`);
    } finally {
      setLoggingIn(false);
    }
  };

  const handleSave = async () => {
    console.log("handleSave triggered. Profile:", !!profile, "User:", !!user);
    if (!profile || !user) {
      if (!user) {
        console.warn("Save failed: User not logged in");
        alert('Please log in to save profiles.');
      }
      return;
    }
    
    setSaving(true);
    try {
      const profileToSave: any = {
        ...profile,
        uid: user.uid,
        createdAt: serverTimestamp()
      };
      
      // Remove undefined/null values to prevent Firestore errors and rule violations
      Object.keys(profileToSave).forEach(key => {
        if (profileToSave[key] === undefined || profileToSave[key] === null) {
          delete profileToSave[key];
        }
      });
      
      console.log("Saving profile to Firestore...");
      const profileId = profile.name.toLowerCase().replace(/\s+/g, '_');
      await setDoc(doc(db, 'profiles', `${user.uid}_${profileId}`), profileToSave);
      console.log("Profile saved successfully!");
      alert('Profile saved successfully to Cloud!');
    } catch (err) {
      console.error("Firestore save error:", err);
      handleFirestoreError(err, OperationType.WRITE, 'profiles');
    } finally {
      setSaving(false);
    }
  };

  const deleteProfile = async (p: BirthProfile) => {
    if (!user) return;
    try {
      const profileId = p.name.toLowerCase().replace(/\s+/g, '_');
      await deleteDoc(doc(db, 'profiles', `${user.uid}_${profileId}`));
      alert('Profile deleted from Cloud.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'profiles');
    }
  };

  const loadProfile = (p: BirthProfile) => {
    setName(p.name);
    setDob(p.dob);
    setTob(p.tob || '12:00');
    setTobUnknown(p.tobUnknown || false);
    setPob(p.pob || '');
    setPobUnknown(p.pobUnknown || false);
    setPobCoords(p.pobCoords || null);
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

    if (profile.pobCoords) {
      params.set('lat', profile.pobCoords.lat.toString());
      params.set('lng', profile.pobCoords.lng.toString());
    }
    
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

  const scheduleNotification = async (bday: UpcomingBirthday) => {
    console.log("scheduleNotification triggered for:", bday.formattedDate);
    // If permission is not granted, we still allow "scheduling" for the demo experience
    // but we warn the user that native alerts might not pop up.
    if (notificationPermission !== 'granted') {
      console.log("Notification permission not granted, showing alert info");
    }

    console.log("Reminder set for:", bday.formattedDate);
    
    // Store reminder in Firestore if logged in
    if (user) {
      try {
        const alertData = {
          uid: user.uid,
          name: `Vedic Birthday: ${profile?.name}`,
          targetDate: bday.formattedDate,
          type: 'birthday',
          enabled: true,
          createdAt: serverTimestamp()
        };
        console.log("Saving alert to Firestore:", alertData);
        await addDoc(collection(db, 'alerts'), alertData);
        console.log("Alert saved successfully to Firestore");
        setToast({ message: `Reminder set! This birthday has been added to your Alerts.`, type: 'success' });
      } catch (err) {
        console.error('Failed to save alert to Firestore:', err);
        setToast({ message: `Failed to save alert. Please try again.`, type: 'error' });
        handleFirestoreError(err, OperationType.WRITE, 'alerts');
      }
    } else {
      // Store reminder in localStorage if not logged in
      console.log("Saving alert to localStorage");
      const reminders = JSON.parse(localStorage.getItem('viniyogah_reminders') || '[]');
      const newReminder = {
        name: profile?.name,
        date: bday.date,
        formattedDate: bday.formattedDate,
        sunRashi: profile?.sunRashi,
        nakshatra: profile?.birthNakshatra,
        createdAt: Date.now()
      };
      
      const exists = reminders.some((r: any) => r.name === newReminder.name && r.formattedDate === newReminder.formattedDate);
      if (!exists) {
        reminders.push(newReminder);
        localStorage.setItem('viniyogah_reminders', JSON.stringify(reminders));
        // Update local alerts state immediately
        const localAlerts: VedicAlert[] = reminders.map((r: any, idx: number) => ({
          id: `local-${idx}`,
          uid: 'local',
          name: `Vedic Birthday: ${r.name}`,
          targetDate: r.formattedDate,
          type: 'birthday',
          enabled: true,
          createdAt: r.createdAt || new Date(r.date).getTime()
        }));
        setAlerts(localAlerts);
        console.log("Alert saved successfully to localStorage");
        setToast({ message: `Reminder set! You will be notified on ${bday.formattedDate}.`, type: 'success' });
      } else {
        console.log("Alert already exists in localStorage");
        setToast({ message: `Reminder already exists for this date.`, type: 'success' });
      }
    }

    // Mock notification if the date is today or tomorrow (for testing/immediate feedback)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const bdayDate = new Date(bday.date);
    bdayDate.setHours(0, 0, 0, 0);
    
    const diffTime = bdayDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (notificationPermission === 'granted') {
      if (diffDays === 0) {
        new Notification('Hindu Birthdate Reminder', {
          body: `Happy Hindu Birthday, ${profile?.name}! Today the Sun is in ${profile?.sunRashi} and the Moon is in ${profile?.birthNakshatra}.`,
          icon: '/vel-icon.svg'
        });
      } else if (diffDays === 1) {
        new Notification('Upcoming Hindu Birthday', {
          body: `Reminder: Tomorrow is ${profile?.name}'s Hindu Birthday!`,
          icon: '/vel-icon.svg'
        });
      }
    }
  };

  // Check for due reminders on load
  useEffect(() => {
    if (notificationPermission !== 'granted') return;

    const checkReminders = () => {
      const reminders = JSON.parse(localStorage.getItem('viniyogah_reminders') || '[]');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const remainingReminders = reminders.filter((r: any) => {
        const bdayDate = new Date(r.date);
        bdayDate.setHours(0, 0, 0, 0);
        
        const diffTime = bdayDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
          new Notification('Hindu Birthdate Reminder', {
            body: `Happy Hindu Birthday, ${r.name}! Today the Sun is in ${r.sunRashi} and the Moon is in ${r.nakshatra}.`,
            icon: '/vel-icon.svg'
          });
          return false; // Remove completed reminder
        } else if (diffDays === 1) {
          new Notification('Upcoming Hindu Birthday', {
            body: `Reminder: Tomorrow is ${r.name}'s Hindu Birthday!`,
            icon: '/vel-icon.svg'
          });
          // Keep it to notify again tomorrow
          return true;
        }
        
        return bdayDate > today; // Keep future reminders
      });
      
      localStorage.setItem('viniyogah_reminders', JSON.stringify(remainingReminders));
    };

    // Check once on load
    checkReminders();
  }, [notificationPermission]);

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#1A1A1A] font-sans selection:bg-primary/20 relative">
      {/* Loading Progress Bar */}
      <AnimatePresence>
        {loading && (
          <motion.div 
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary z-[9999] origin-left pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Login Modal */}
      <AnimatePresence>
        {showLoginModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              if (!loggingIn) {
                setShowLoginModal(false);
                setIsOtpSent(false);
                setError(null);
              }
            }}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => {
                  setShowLoginModal(false);
                  setIsOtpSent(false);
                  setError(null);
                }}
                className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-600 transition-colors"
              >
                <X size={20} />
              </button>

              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mx-auto mb-4">
                  <Smartphone size={32} />
                </div>
                <h2 className="text-2xl font-display font-black tracking-tighter italic">
                  {isOtpSent ? 'Verify Code' : 'Login with Phone'}
                </h2>
                <p className="text-stone-500 text-sm mt-2">
                  {isOtpSent 
                    ? `Enter the 6-digit code sent to ${phoneNumber}` 
                    : 'Enter your phone number to receive a verification code.'}
                </p>
              </div>

              <form onSubmit={isOtpSent ? handleVerifyOtp : handleSendOtp} className="space-y-6">
                {!isOtpSent ? (
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-stone-400 ml-1">Phone Number (with Country Code)</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">
                        <Globe size={18} />
                      </div>
                      <input 
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono"
                        required
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-stone-400 ml-1">Verification Code</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">
                        <ShieldCheck size={18} />
                      </div>
                      <input 
                        type="text"
                        placeholder="123456"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        maxLength={6}
                        className="w-full pl-12 pr-4 py-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono tracking-[0.5em] text-center text-lg"
                        required
                      />
                    </div>
                    <button 
                      type="button"
                      onClick={() => setIsOtpSent(false)}
                      className="text-[10px] text-primary font-bold uppercase tracking-widest hover:underline mt-2"
                    >
                      Change Number
                    </button>
                  </div>
                )}

                {error && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600">
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <p className="text-xs font-medium">{error}</p>
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={loggingIn}
                  className="w-full py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loggingIn ? (
                    <RefreshCw size={20} className="animate-spin" />
                  ) : (
                    isOtpSent ? 'Verify & Login' : 'Send Code'
                  )}
                </button>
              </form>

              <div id="recaptcha-container" className="mt-4"></div>

              <p className="text-[9px] text-stone-400 text-center mt-6 uppercase tracking-widest leading-relaxed">
                By continuing, you agree to our Terms of Service and Privacy Policy. Standard SMS rates may apply.
              </p>
            </motion.div>
          </motion.div>
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
              <p className="text-stone-500 text-xs mb-6 bg-stone-50 p-3 rounded-xl border border-stone-100">
                <strong>Note:</strong> On iOS (iPhone/iPad), you <strong>must</strong> use the <strong>Safari</strong> browser to install the app. Chrome and other browsers do not support this feature on iOS.
              </p>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0 font-bold">1</div>
                  <div>
                    <p className="font-semibold">On iPhone (Safari Only)</p>
                    <p className="text-stone-600 text-sm">Tap the <Share2 className="inline w-4 h-4 mx-1" /> Share button, then scroll and tap "Add to Home Screen".</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0 font-bold">2</div>
                  <div>
                    <p className="font-semibold">On Android (Chrome)</p>
                    <p className="text-stone-600 text-sm">Tap the <span className="inline-block w-1 h-1 bg-stone-400 rounded-full mx-0.5" /><span className="inline-block w-1 h-1 bg-stone-400 rounded-full mx-0.5" /><span className="inline-block w-1 h-1 bg-stone-400 rounded-full mx-0.5" /> menu, then tap "Install App" or "Add to Home Screen".</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0 font-bold">3</div>
                  <div>
                    <p className="font-semibold">On Windows / Mac (Chrome/Edge)</p>
                    <p className="text-stone-600 text-sm">Click the "Install" button in the app header. This will add Viniyogah to your Desktop and Start Menu with the "Vel" icon as the app icon.</p>
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

      {/* Alerts Management Modal */}
      <AnimatePresence>
        {showSavedAlerts && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowSavedAlerts(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-primary/10 rounded-2xl">
                  <Bell className="w-6 h-6 text-primary" />
                </div>
                <button onClick={() => setShowSavedAlerts(false)} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <h3 className="text-2xl font-bold mb-2">Saved Alerts</h3>
              <p className="text-stone-500 text-sm mb-6">Manage your Vedic birthday and planetary transit notifications.</p>
              
              <div className="space-y-4">
                {alerts.length === 0 ? (
                  <div className="text-center py-10 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                    <BellOff className="w-10 h-10 text-stone-300 mx-auto mb-3" />
                    <p className="text-stone-500 text-sm">No alerts saved yet.</p>
                  </div>
                ) : (
                  alerts.map(alert => (
                    <div key={alert.id} className="p-4 bg-stone-50 rounded-2xl border border-stone-100 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-stone-800 truncate">{alert.name}</p>
                        <p className="text-[10px] text-stone-500 uppercase tracking-widest font-bold">
                          {alert.type} {alert.targetTithi || alert.targetNakshatra || alert.targetDate}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => toggleAlert(alert)}
                          className={`w-10 h-6 rounded-full relative transition-colors ${alert.enabled ? 'bg-primary' : 'bg-stone-300'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${alert.enabled ? 'left-5' : 'left-1'}`} />
                        </button>
                        <button 
                          onClick={() => deleteAlert(alert.id)}
                          className="p-2 text-stone-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button 
                onClick={() => setShowSavedAlerts(false)}
                className="w-full mt-8 py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="border-b border-black/5 bg-white/80 backdrop-blur-md sticky top-0 z-[50]">
        <div className="max-w-5xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <Logo className="w-8 h-8 md:w-10 md:h-10" />
            <div>
              <h1 className="font-display font-black text-xl md:text-2xl tracking-tighter leading-none flex items-center lowercase">
                <span className="text-accent">vini</span>
                <span className="text-primary">yogah</span>
              </h1>
              <div className="flex items-center gap-1.5">
                <p className="text-[6.5px] md:text-[7.5px] uppercase tracking-[0.12em] md:tracking-[0.15em] font-bold text-black/30 whitespace-nowrap">Vedic B'Day Calculator</p>
                <div className="flex items-center gap-0.5 px-1 py-0.5 bg-green-50 rounded text-[5px] md:text-[6px] text-green-600 font-bold uppercase tracking-widest border border-green-100">
                  <ShieldCheck size={6} className="md:w-2 md:h-2" />
                  <span>Secure</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <div className="flex items-center gap-1 md:gap-2">
              {!isInstalled && (
                <button 
                  id="install-app-button"
                  onClick={handleInstall}
                  className="p-2 md:px-3 md:py-1.5 text-accent hover:bg-accent/5 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                  title="Install App"
                >
                  <Download size={18} />
                  <span className="hidden md:inline text-[10px] uppercase tracking-widest font-bold">Install</span>
                </button>
              )}
                <button 
                  id="manage-alerts-button"
                  onClick={() => setShowSavedAlerts(true)}
                  className="p-2 md:px-3 md:py-1.5 text-primary hover:bg-primary/5 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                  title="Manage Alerts"
                >
                  <Bell size={18} />
                  <span className="hidden md:inline text-[10px] uppercase tracking-widest font-bold">Alerts</span>
                </button>
            </div>

            <div className="w-px h-6 bg-black/5 hidden sm:block" />

            {user ? (
              <div className="flex items-center gap-2 md:gap-3">
                <div className="hidden lg:block text-right">
                  <p className="text-[8px] font-bold text-black/30 uppercase tracking-wider">User</p>
                  <p className="text-[10px] font-display font-black tracking-tight truncate max-w-[80px]">{user.displayName || user.phoneNumber}</p>
                </div>
                <button 
                  onClick={logout}
                  className="p-2 hover:bg-red-50 rounded-xl transition-colors text-stone-300 hover:text-red-500"
                  title="Logout"
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-end">
                <button 
                  id="login-button"
                  onClick={() => setShowLoginModal(true)}
                  disabled={loggingIn}
                  className="px-3 py-1.5 md:px-4 md:py-2 bg-primary text-white rounded-full text-[10px] md:text-xs font-display font-black tracking-tight flex items-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <LogIn size={14} />
                  <span className="inline">Login</span>
                </button>
                <span className="hidden sm:block text-[7px] font-bold text-black/20 uppercase tracking-widest mt-1">Optional for saving</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-4 md:py-8 relative z-0">
        {/* Rahu Kaal Banner */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 overflow-hidden bg-white/40 backdrop-blur-md border border-black/5 rounded-2xl p-2.5 flex flex-col md:flex-row items-center justify-between gap-2 shadow-sm"
        >
          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <div className={`px-2 py-1.5 rounded-lg shrink-0 flex items-center justify-center min-w-[44px] ${rahuKaal?.today.isOngoing ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'}`}>
              <div className="flex items-center font-mono text-[11px] font-black tracking-tighter leading-none">
                <span>{format(currentTime, 'HH')}</span>
                <motion.span
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="mx-0.5 text-accent"
                >
                  :
                </motion.span>
                <span>{format(currentTime, 'mm')}</span>
              </div>
            </div>
            <div className="grid grid-cols-[auto_1fr] md:grid-cols-[auto_1fr_auto_1fr] gap-x-2 md:gap-x-4 gap-y-1 text-[9px] md:text-[10px] leading-tight">
              {/* Row 1: Today */}
              <span className="font-bold text-black/40 uppercase tracking-wider text-right">Today:</span>
              <span className="font-medium text-stone-600">{format(new Date(), 'dd MMM yyyy')}, {format(new Date(), 'EEE').toUpperCase()}.</span>
              
              <span className="font-bold text-primary uppercase tracking-tighter text-right md:ml-4">Rahu Kaal:</span>
              <span className={`font-black ${rahuKaal?.today.isOngoing ? 'text-red-500' : 'text-primary'}`}>
                {rahuKaal ? `${format(rahuKaal.today.start, 'hh:mm a')} - ${format(rahuKaal.today.end, 'hh:mm a')}` : '...'}
              </span>

              {/* Row 2: Tomorrow */}
              <span className="font-bold text-black/40 uppercase tracking-wider text-right">Tomorrow:</span>
              <span className="font-medium text-stone-600">
                {(() => {
                  const tom = new Date(Date.now() + 86400000);
                  return `${format(tom, 'dd MMM yyyy')}, ${format(tom, 'EEE').toUpperCase()}.`;
                })()}
              </span>
              
              <span className="font-bold text-primary/60 uppercase tracking-tighter text-right md:ml-4">Rahu Kaal:</span>
              <span className="font-black text-primary/80">
                {rahuKaal ? `${format(rahuKaal.tomorrow.start, 'hh:mm a')} - ${format(rahuKaal.tomorrow.end, 'hh:mm a')}` : '...'}
              </span>
            </div>
          </div>
          
          {rahuKaal && (
            <div className={`shrink-0 px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 ${rahuKaal.today.isOngoing ? 'bg-red-500 text-white' : 'bg-primary/5 text-primary border border-primary/10'}`}>
              <span className="opacity-70">{rahuKaal.nextEvent.type === 'ends' ? 'Ends in' : 'Starts in'}</span>
              <span>{rahuKaal.nextEvent.timeLeft}</span>
            </div>
          )}
        </motion.div>

        {/* Panchangam Ribbon */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 relative"
        >
          {/* Logo Silver Decorative Label with Large Moon Icon */}
          <div className="absolute -top-4 left-6 h-7 pl-9 pr-4 bg-accent text-[7px] font-black uppercase tracking-[0.2em] text-white z-10 rounded-full border border-accent/20 shadow-[0_0_25px_rgba(242,125,38,0.7)] flex items-center">
            {panchangam && (
              <div className="absolute -left-3 w-10 h-10 flex items-center justify-center">
                <div className="relative w-full h-full flex items-center justify-center">
                  {/* Faint Silver Glow Reflection */}
                  <div className="absolute inset-0 rounded-full bg-white/60 blur-xl animate-pulse" />
                  
                  <div className="relative w-8 h-8 rounded-full overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.9)] border border-white/30">
                    {/* The Actual Glowing Moon PNG */}
                    <img 
                      src="https://www.transparentpng.com/download/moon/moon-free-download-transparent-3.png"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    
                    {/* Purple Shading Overlay for Phases */}
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 w-full h-full">
                      <defs>
                        <mask id="moon-shading-mask">
                          <rect x="0" y="0" width="24" height="24" fill="white" />
                          {panchangam.tithiIndex === 14 ? (
                            <circle cx="12" cy="12" r="12" fill="black" />
                          ) : panchangam.tithiIndex === 29 ? (
                            null
                          ) : (
                            <path 
                              d={panchangam.tithiIndex < 14 
                                ? `M 12 0 A 12 12 0 0 1 12 24 A ${Math.abs(12 - (panchangam.tithiIndex / 7.5) * 12)} 12 0 0 ${panchangam.tithiIndex < 7.5 ? 1 : 0} 12 0`
                                : `M 12 0 A 12 12 0 0 0 12 24 A ${Math.abs(12 - ((panchangam.tithiIndex - 15) / 7.5) * 12)} 12 0 0 ${panchangam.tithiIndex < 22.5 ? 0 : 1} 12 0`
                              } 
                              fill="black"
                            />
                          )}
                        </mask>
                      </defs>
                      <rect x="0" y="0" width="24" height="24" fill="#3D1B63" opacity="0.85" mask="url(#moon-shading-mask)" />
                    </svg>
                  </div>
                </div>
              </div>
            )}
            Daily Panchangam
          </div>
          
          {/* Main Container - Grid for visibility, no horizontal scroll */}
          <div className="bg-white/40 backdrop-blur-xl border border-stone-200/50 rounded-2xl shadow-sm overflow-hidden">
            <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 divide-x divide-y divide-stone-100 lg:divide-y-0">
              {panchangam ? (
                [
                  { label: 'Samvatsara', value: panchangam.samvatsara },
                  { label: 'Aayana', value: panchangam.aayana },
                  { label: 'Rithou', value: panchangam.ritu },
                  { label: 'Maasa', value: panchangam.maasa },
                  { label: 'Paksha', value: panchangam.paksha },
                  { label: 'Tithi', value: panchangam.tithi },
                  { label: 'Vasara', value: panchangam.vasara },
                  { label: 'Nakshatra', value: panchangam.nakshatra },
                  { label: 'Yoga', value: panchangam.yoga },
                  { label: 'Karana', value: panchangam.karana }
                ].map((item) => {
                  const isNakshatra = item.label === 'Nakshatra';
                  return (
                    <div 
                      key={item.label} 
                      className="px-0.5 py-3 md:px-1.5 md:py-4 flex flex-col items-center justify-center hover:bg-accent/5 transition-colors group relative overflow-hidden"
                    >
                      <span className={`text-[6px] md:text-[7px] font-bold uppercase tracking-widest mb-1 transition-colors relative z-10 ${isNakshatra ? 'text-accent animate-glow-orange' : 'text-stone-400 group-hover:text-accent'}`}>
                        {item.label}
                      </span>
                      <span className={`text-[8px] md:text-[10px] font-display font-black uppercase tracking-tighter sm:tracking-tight text-center leading-tight break-all sm:break-words w-full px-0.5 transition-colors relative z-10 ${isNakshatra ? 'text-accent animate-glow-orange' : 'text-stone-700'}`}>
                        {item.value}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full p-6 text-center text-[10px] text-stone-400 animate-pulse uppercase tracking-widest font-bold">
                  Synchronizing with Celestial Cycles...
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {!isInstalled && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-3 bg-accent/5 border border-accent/10 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-xl">
                <Zap className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm font-bold text-stone-800 leading-tight">Install Viniyogah for a better experience</p>
                <p className="text-[10px] text-stone-500 leading-tight">Access your Vedic birthdays offline and get instant alerts on your home screen.</p>
              </div>
            </div>
            <button 
              onClick={handleInstall}
              className="px-5 py-2 bg-accent text-white text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-accent-dark transition-all shadow-md shadow-accent/20 whitespace-nowrap"
            >
              Install Now
            </button>
          </motion.div>
        )}

        {/* Global Dashboard - Restored to Top */}
        <AnimatePresence mode="wait">
          {user && savedProfiles.length > 0 ? (
            globalUpcoming.length > 0 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mb-8"
              >
                <div className="bg-gradient-to-r from-primary via-purple-dark to-accent text-white rounded-[2rem] p-3 md:p-4 overflow-hidden relative shadow-2xl shadow-primary/20 border border-white/10 backdrop-blur-xl min-h-[120px] flex items-center">
                  <div className="relative z-10 flex flex-col md:flex-row items-center gap-3 md:gap-8 w-full">
                    <div className="shrink-0 text-center md:text-left">
                      <h2 className="text-xl md:text-4xl font-display font-black tracking-tighter italic leading-[0.8] text-white">
                        The Next<br/>Three
                      </h2>
                      <p className="text-[8px] md:text-[10px] uppercase tracking-[0.2em] md:tracking-[0.3em] font-light text-white/60 mt-1 md:mt-2">
                        Upcoming Vedic Birthdays
                      </p>
                    </div>
                    
                    <div className="flex-1 overflow-hidden relative">
                      <motion.div 
                        className="flex items-center gap-3 md:gap-4 w-fit"
                        animate={{ 
                          x: ["0%", "-33.333%"],
                        }}
                        transition={{ 
                          duration: 25, 
                          repeat: Infinity, 
                          ease: "linear" 
                        }}
                      >
                        {[...globalUpcoming, ...globalUpcoming, ...globalUpcoming].map((item, idx) => (
                          <React.Fragment key={`${item.name}-${item.date.getTime()}-${idx}`}>
                            <div className="flex items-center gap-3 md:gap-4">
                              <div className="bg-white/5 border border-white/10 rounded-[1.5rem] p-2 md:p-3 flex flex-col items-center justify-center hover:bg-white/10 transition-all group w-28 md:w-36 lg:w-44 shrink-0 relative overflow-hidden text-center">
                                <div className="relative z-10 w-full">
                                  <p className="text-[8px] md:text-[10px] font-display font-black tracking-tight uppercase leading-tight line-clamp-1 break-words text-white/90 mb-1">{item.name}</p>
                                </div>
                                
                                <div className="relative z-10">
                                  <div className="flex flex-col items-center">
                                    <div className="flex items-baseline gap-1">
                                      <span className="text-xl md:text-4xl font-display font-black tracking-tighter text-accent group-hover:scale-110 transition-transform">{format(item.date, 'dd')}</span>
                                      <span className="text-[8px] md:text-[10px] uppercase font-bold text-white/60">{format(item.date, 'MMM')}</span>
                                    </div>
                                    <div className="flex items-center gap-1 mt-0.5">
                                      <Zap size={8} className="text-accent" />
                                      <span className="text-[7px] md:text-[9px] uppercase tracking-widest font-bold text-white/40">{item.nakshatra}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            {/* End Limiter after each full list cycle */}
                            {(idx + 1) % globalUpcoming.length === 0 && (
                              <div className="flex items-center justify-center px-6 md:px-10 shrink-0">
                                <div className="relative">
                                  <div className="absolute inset-0 blur-xl bg-accent/40 rounded-full" />
                                  <div className="relative z-10 p-2 border border-white/20 rounded-full bg-white/5">
                                    <Moon size={16} className="text-accent opacity-80" />
                                  </div>
                                </div>
                              </div>
                            )}
                          </React.Fragment>
                        ))}
                      </motion.div>
                      
                      {/* Gradient masks for smooth fade edges */}
                      <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-primary/20 to-transparent z-20 pointer-events-none" />
                      <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-accent/20 to-transparent z-20 pointer-events-none" />
                    </div>
                  </div>
                  
                  {/* Decorative Elements */}
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-accent/20 rounded-full blur-3xl" />
                  <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl" />
                </div>
              </motion.div>
            ) : null
          ) : !profile ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-12"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border border-black/5 rounded-3xl p-6 shadow-sm">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
                    <span className="text-xs font-black">01</span>
                  </div>
                  <h4 className="text-[10px] font-display font-black uppercase tracking-widest mb-2">Enter Details</h4>
                  <p className="text-[9px] text-stone-500 leading-relaxed">Provide your birth date, time, and location. We use high-precision astronomical algorithms for calculations.</p>
                </div>
                <div className="bg-white border border-black/5 rounded-3xl p-6 shadow-sm">
                  <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center text-accent mb-4">
                    <span className="text-xs font-black">02</span>
                  </div>
                  <h4 className="text-[10px] font-display font-black uppercase tracking-widest mb-2">Get Your Tithi</h4>
                  <p className="text-[9px] text-stone-500 leading-relaxed">Discover your traditional Hindu birthdate based on the lunar calendar and planetary alignments.</p>
                </div>
                <div className="bg-white border border-black/5 rounded-3xl p-6 shadow-sm">
                  <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center text-green-600 mb-4">
                    <ShieldCheck size={16} />
                  </div>
                  <h4 className="text-[10px] font-display font-black uppercase tracking-widest mb-2">Privacy First</h4>
                  <p className="text-[9px] text-stone-500 leading-relaxed">No login required to calculate. Your data is processed securely and only saved if you choose to create a profile.</p>
                </div>
              </div>
            </motion.div>
          ) : user ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-8 p-6 glass-card border-dashed border-2 border-stone-200 rounded-[2rem] text-center"
            >
              <p className="text-stone-400 text-sm italic font-sans">
                Save profiles to see upcoming birthdays in your global dashboard.
              </p>
            </motion.div>
          ) : null}
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
                    id="name-input"
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
                    id="dob-input"
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
                  <PlaceSearch 
                    onPlaceSelect={(result) => {
                      setPob(result.address);
                      setPobCoords(result.coords);
                    }}
                    disabled={pobUnknown}
                    defaultValue={pob}
                  />
                  {pob && !pobUnknown && (
                    <p className="text-[10px] text-primary font-medium mt-1">Selected: {pob}</p>
                  )}
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
                    id="tob-input"
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
                          id="clear-all-button"
                          onClick={handleClear}
                          className="w-full px-4 py-4 bg-white border border-black/10 text-black/40 hover:text-red-500 hover:border-red-200 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                          title="Clear All"
                        >
                          <Trash2 size={20} />
                          <span className="font-bold uppercase tracking-widest text-[10px]">Clear All Details</span>
                        </button>
                      </div>
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
                            deleteProfile(p);
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
                        <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-green-50 rounded-lg text-[7px] text-green-600 font-bold uppercase tracking-widest border border-green-100">
                          <ShieldCheck size={10} />
                          <span>Secure Storage</span>
                        </div>
                        <button 
                          onClick={handleSave}
                          disabled={saving}
                          className="px-4 py-2 bg-primary text-white text-[10px] font-bold uppercase tracking-widest rounded-full shadow-lg shadow-primary/30 flex items-center gap-2 hover:scale-105 transition-all disabled:opacity-50"
                        >
                          {saving ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
                          {saving ? 'Saving...' : 'Save Profile'}
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
                          <p className={`font-bold leading-tight ${profile.birthNakshatra.length > 12 ? 'text-lg md:text-xl' : 'text-2xl'}`}>
                            {profile.birthNakshatra.length > 15 ? NAKSHATRA_SHORT[profile.moonNakshatraIndex] : profile.birthNakshatra}
                          </p>
                        </div>
                      </div>

                      {profile.rahu && profile.ketu && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-3 p-4 md:p-6 bg-black/5 rounded-3xl border border-black/5 relative overflow-hidden group flex flex-col items-center text-center">
                            <div className="flex items-center gap-2 text-red-500">
                              <Zap size={18} />
                              <span className="text-[10px] uppercase tracking-widest font-display font-bold">Rahu</span>
                            </div>
                            <p className="text-lg md:text-2xl font-bold w-full truncate">{profile.rahu.rashi}</p>
                          </div>
                          <div className="space-y-3 p-4 md:p-6 bg-black/5 rounded-3xl border border-black/5 relative overflow-hidden group flex flex-col items-center text-center">
                            <div className="flex items-center gap-2 text-indigo-500">
                              <Zap size={18} />
                              <span className="text-[10px] uppercase tracking-widest font-display font-bold">Ketu</span>
                            </div>
                            <p className="text-lg md:text-2xl font-bold w-full truncate">{profile.ketu.rashi}</p>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col items-center justify-center space-y-4">
                        <h3 className="text-[10px] uppercase tracking-widest font-display font-bold text-black/40">Janma Rashi Chakra</h3>
                        <div className="flex flex-wrap justify-center gap-4 text-[10px] font-display font-bold uppercase tracking-widest">
                          <div className="flex items-center gap-1.5 text-accent">
                            <div className="w-2 h-2 rounded-full bg-accent" /> Sun
                          </div>
                          <div className="flex items-center gap-1.5 text-primary">
                            <div className="w-2 h-2 rounded-full bg-primary" /> Moon
                          </div>
                          {profile.rahu && (
                            <div className="hidden sm:flex items-center gap-1.5 text-red-500">
                              <div className="w-2 h-2 rounded-full bg-red-500" /> Rahu
                            </div>
                          )}
                          {profile.ketu && (
                            <div className="hidden sm:flex items-center gap-1.5 text-indigo-500">
                              <div className="w-2 h-2 rounded-full bg-indigo-500" /> Ketu
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* AI Nakshatra Profile */}
                  <NakshatraProfile nakshatra={profile.birthNakshatra} />

                  {/* Debug Info / Raw Positions for Cross-checking */}
                  <div className="mt-8 p-6 bg-stone-50 rounded-3xl border border-stone-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] uppercase tracking-widest font-display font-bold text-stone-400">Raw Planetary Data (Sidereal)</h3>
                      <span className="text-[8px] text-stone-300">Lahiri Ayanamsa: {profile.ayanamsa?.toFixed(4)}°</span>
                    </div>
                    {profile.tobUnknown ? (
                      <div className="py-8 text-center border-2 border-dashed border-stone-200 rounded-2xl">
                        <Clock size={24} className="mx-auto text-stone-300 mb-2" />
                        <p className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">Time of Birth Required for Raw Data</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto -mx-6 px-6">
                        <table className="w-full text-left text-[9px] md:text-[10px] font-mono border-collapse">
                          <thead>
                            <tr className="border-b border-stone-200 text-stone-400">
                              <th className="pb-2 font-medium">Planet</th>
                              <th className="pb-2 font-medium">Long</th>
                              <th className="pb-2 font-medium">Rashi</th>
                              <th className="pb-2 font-medium">Deg</th>
                              <th className="pb-2 font-medium">Nakshatra</th>
                              <th className="pb-2 font-medium">Navamsha (D9)</th>
                              <th className="pb-2 font-medium">Dashamsha (D10)</th>
                            </tr>
                          </thead>
                          <tbody className="text-stone-600">
                            {profile.planets.map(p => {
                              const nak = getNakshatra(p.longitude);
                              return (
                                <tr key={p.name} className="border-b border-stone-100 last:border-0">
                                  <td className="py-2 font-bold text-indigo-deep">{p.name}</td>
                                  <td className="py-2">{(p.longitude || 0).toFixed(1)}°</td>
                                  <td className="py-2">
                                    <span className="hidden md:inline">{p.rashi}</span>
                                    <span className="md:hidden">{RASHI_SHORT[p.rashiIndex]}</span>
                                  </td>
                                  <td className="py-2">{(p.longitude % 30).toFixed(1)}°</td>
                                  <td className="py-2">
                                    <span className="hidden md:inline">{nak.name}</span>
                                    <span className="md:hidden">{NAKSHATRA_SHORT[nak.index]}</span>
                                  </td>
                                  <td className="py-2 font-bold text-primary">{p.navamsha}</td>
                                  <td className="py-2 font-bold text-accent">{p.dashamsha}</td>
                                </tr>
                              );
                            })}
                            {profile.lagna && (
                              <tr className="bg-accent/5">
                                <td className="py-2 font-bold text-accent">Lagna</td>
                                <td className="py-2">{(profile.lagna.longitude || 0).toFixed(1)}°</td>
                                <td className="py-2">
                                  <span className="hidden md:inline">{profile.lagna.rashi}</span>
                                  <span className="md:hidden">{RASHI_SHORT[profile.lagna.rashiIndex]}</span>
                                </td>
                                <td className="py-2">{(profile.lagna.longitude % 30).toFixed(1)}°</td>
                                <td className="py-2">
                                  <span className="hidden md:inline">{getNakshatra(profile.lagna.longitude).name}</span>
                                  <span className="md:hidden">{NAKSHATRA_SHORT[getNakshatra(profile.lagna.longitude).index]}</span>
                                </td>
                                <td className="py-2 font-black text-accent underline decoration-accent/30 underline-offset-4">{profile.lagna.navamsha}</td>
                                <td className="py-2 font-black text-primary underline decoration-primary/30 underline-offset-4">{profile.lagna.dashamsha}</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
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
          <div className="mt-16 space-y-12">
            <HoroscopeChart 
              name={profile.name}
              sunRashi={profile.sunRashi}
              sunRashiIndex={profile.sunRashiIndex}
              moonRashi={profile.moonRashi}
              moonRashiIndex={profile.moonRashiIndex}
              moonNakshatra={profile.birthNakshatra}
              moonNakshatraIndex={profile.moonNakshatraIndex}
              dob={profile.dob}
              tob={profile.tob}
              tobUnknown={profile.tobUnknown}
              pob={profile.pob}
              pobUnknown={profile.pobUnknown}
              rahu={profile.rahu}
              ketu={profile.ketu}
              lagna={profile.lagna}
              planets={profile.planets}
              pobCoords={profile.pobCoords}
            />

            {/* AI Auspicious Guidance - Moved here */}
            {upcoming.length > 0 && (
              <AuspiciousGuidance 
                name={profile.name}
                nakshatra={profile.birthNakshatra}
                sunRashi={profile.sunRashi}
                birthdayDate={upcoming[0].formattedDate}
                planetaryPositions={profile.upcomingPlanets || profile.planets}
              />
            )}

            {/* Profile-specific Upcoming Birthdays - Moved to Bottom */}
            <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-[10px] uppercase tracking-widest font-display font-bold text-black/40">Upcoming Vedic Birthdays for {profile.name}</h3>
                <span className="text-[10px] text-black/20 font-medium uppercase tracking-widest">Next 3 Years</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {upcoming.slice(0, 3).map((bday, idx) => (
                  <motion.div 
                    key={bday.year}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="group bg-white border border-black/5 hover:border-primary/30 rounded-3xl p-6 flex flex-col justify-between transition-all shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-start justify-between mb-6">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex flex-col items-center justify-center text-primary group-hover:from-primary group-hover:to-accent group-hover:text-white transition-all">
                        <span className="text-[8px] font-display font-bold">{bday.year}</span>
                        <Calendar size={16} />
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShare(bday);
                          }}
                          className="py-1.5 px-3 rounded-lg hover:bg-primary/10 text-black/20 hover:text-primary transition-all"
                        >
                          <Share2 size={14} />
                        </button>
                        <button 
                          onClick={async (e) => {
                            e.stopPropagation();
                            await scheduleNotification(bday);
                          }}
                          className="py-1.5 px-3 rounded-lg hover:bg-primary/10 text-black/20 hover:text-primary transition-all"
                        >
                          <Bell size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="font-display font-black text-2xl tracking-tighter group-hover:text-primary transition-colors leading-none mb-3">{bday.formattedDate}</p>
                      <div className="text-[10px] text-black/40 font-medium uppercase tracking-wider leading-relaxed">
                        <p>Sun: {profile.sunRashi}</p>
                        <p>Nakshatra: {profile.birthNakshatra}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Trust & Privacy Section */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-20 pt-20 border-t border-black/5"
        >
          <div className="mb-12 text-center">
            <h3 className="text-xl md:text-2xl font-display font-black tracking-tighter mb-2">Why Viniyogah?</h3>
            <p className="text-[10px] text-stone-400 uppercase tracking-[0.2em] font-bold">Built for Trust & Precision</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-primary/5 flex items-center justify-center text-primary">
                <ShieldCheck size={20} />
              </div>
              <h4 className="text-xs font-display font-black uppercase tracking-widest">Secure & Private</h4>
              <p className="text-[10px] text-stone-500 leading-relaxed">
                Your data is stored securely in Google Firebase. We only use your phone number to manage your saved birth profiles. We never share your data with third parties.
              </p>
            </div>
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-accent/5 flex items-center justify-center text-accent">
                <Zap size={20} />
              </div>
              <h4 className="text-xs font-display font-black uppercase tracking-widest">Login is Optional</h4>
              <p className="text-[10px] text-stone-500 leading-relaxed">
                You can calculate your Tithi and planetary positions without logging in. Login is only required if you want to save multiple profiles for family and friends.
              </p>
            </div>
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-500">
                <Smartphone size={20} />
              </div>
              <h4 className="text-xs font-display font-black uppercase tracking-widest">Native Experience</h4>
              <p className="text-[10px] text-stone-500 leading-relaxed">
                Viniyogah is a Progressive Web App (PWA). You can install it on your home screen for a fast, app-like experience without using an app store.
              </p>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-black/5 py-12 mt-12">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-xs text-black/30">@2026 viniyogah - Vedic Birthdate Calculator. Sidereal Zodiac (Lahiri Ayanamsa).</p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-xs text-black/30 hover:text-black transition-colors">Privacy</a>
            <a href="#" className="text-xs text-black/30 hover:text-black transition-colors">Terms</a>
            <a href="#" className="text-xs text-black/30 hover:text-black transition-colors">Contact</a>
          </div>
        </div>
      </footer>

      {/* AI Vedic Chat Assistant */}
      <VedicChat />

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className={`fixed bottom-8 left-1/2 z-[200] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border ${
              toast.type === 'success' ? 'bg-white border-primary/20 text-primary' : 'bg-red-50 border-red-100 text-red-600'
            }`}
          >
            {toast.type === 'success' ? <Bell size={18} className="animate-glow-orange" /> : <AlertCircle size={18} />}
            <span className="text-xs font-display font-bold uppercase tracking-widest">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
