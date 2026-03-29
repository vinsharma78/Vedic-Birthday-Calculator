import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { Compass, MapPin, Clock, Share2, Zap, Download } from 'lucide-react';
import { toPng } from 'html-to-image';

// Custom Vel Icon (Murugan's Spear) - Using Exact Brand Logo Path
const VelIcon = ({ className }: { className?: string }) => (
  <div className={`relative ${className} flex items-center justify-center`}>
    <div className="absolute inset-0 bg-accent/20 rounded-full blur-md animate-pulse" />
    <svg viewBox="0 0 100 140" className="w-full h-full relative z-10 drop-shadow-sm" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Vel Leaf Shape */}
      <path 
        d="M50 5 C35 35 15 60 15 90 C15 120 35 130 50 130 C65 130 85 120 85 90 C85 60 65 35 50 5 Z" 
        stroke="url(#vel-grad-chart)" 
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
        <linearGradient id="vel-grad-chart" x1="50" y1="5" x2="50" y2="130" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F27D26" />
          <stop offset="1" stopColor="#5E2B97" />
        </linearGradient>
      </defs>
    </svg>
  </div>
);

interface PlanetPosition {
  name: string;
  symbol: string;
  rashi: string;
  rashiIndex: number;
  longitude: number;
  navamsha?: string;
  navamshaIndex?: number;
  dashamsha?: string;
  dashamshaIndex?: number;
}

interface HoroscopeChartProps {
  name: string;
  sunRashi: string;
  sunRashiIndex: number;
  moonRashi: string;
  moonRashiIndex: number;
  moonNakshatra: string;
  moonNakshatraIndex: number;
  dob: string;
  tob: string;
  tobUnknown: boolean;
  pob: string;
  pobUnknown: boolean;
  pobCoords?: { lat: number; lng: number };
  rahu?: { longitude: number; rashi: string; rashiIndex: number; navamshaIndex?: number; dashamshaIndex?: number };
  ketu?: { longitude: number; rashi: string; rashiIndex: number; navamshaIndex?: number; dashamshaIndex?: number };
  lagna?: { longitude: number; rashi: string; rashiIndex: number; navamshaIndex?: number; dashamshaIndex?: number };
  planets?: PlanetPosition[];
}

const RASHIS = [
  "Mesha", "Vrishabha", "Mithuna", "Karka", 
  "Simha", "Kanya", "Tula", "Vrischika", 
  "Dhanu", "Makara", "Kumbha", "Meena"
];

const PLANET_SYMBOLS: Record<string, string> = {
  Sun: '☉',
  Moon: '☽',
  Mars: '♂',
  Mercury: '☿',
  Jupiter: '♃',
  Venus: '♀',
  Saturn: '♄',
  Rahu: '☊',
  Ketu: '☋',
  Lagna: 'L'
};

// South Indian Chart Layout (Indices 0-11)
const CHART_LAYOUT = [
  [11, 0, 1, 2],
  [10, null, null, 3],
  [9, null, null, 4],
  [8, 7, 6, 5]
];

type ChartType = 'D1' | 'D9' | 'D10';

export const HoroscopeChart: React.FC<HoroscopeChartProps> = ({ 
  name, 
  sunRashi, 
  sunRashiIndex, 
  moonRashi,
  moonRashiIndex,
  moonNakshatra, 
  moonNakshatraIndex,
  dob,
  tob,
  tobUnknown,
  pob,
  pobUnknown,
  pobCoords,
  rahu,
  ketu,
  lagna,
  planets
}) => {
  const [chartType, setChartType] = React.useState<ChartType>('D1');

  // Only show chart if ToB and PoB are provided
  if (tobUnknown || pobUnknown || !pob) {
    return (
      <section className="mt-16 p-12 glass-card border-dashed border-2 border-stone-200 rounded-[3rem] text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-paper flex items-center justify-center mx-auto text-stone-300 shadow-inner">
          <Compass size={40} />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-sans font-light text-indigo-deep">Chart Unavailable</h3>
          <p className="text-sm text-stone-400 max-w-xs mx-auto font-sans italic">
            Please provide both <span className="font-light text-accent">Time of Birth</span> and <span className="font-light text-accent">Place of Birth</span> to generate your accurate Vedic Horoscope.
          </p>
        </div>
      </section>
    );
  }

  const getPlanetsInRashi = (index: number) => {
    const list: PlanetPosition[] = [];
    
    // Helper to get correct rashi index based on chart type
    const getTargetRashiIndex = (p: any) => {
      if (chartType === 'D9') return p.navamshaIndex;
      if (chartType === 'D10') return p.dashamshaIndex;
      return p.rashiIndex;
    };

    // Process planets
    if (planets) {
      planets.forEach(p => {
        if (getTargetRashiIndex(p) === index) {
          list.push(p);
        }
      });
    }
    
    // Add Lagna
    if (lagna && getTargetRashiIndex(lagna) === index) {
      list.push({ 
        name: 'Lagna', 
        symbol: 'L', 
        rashi: lagna.rashi, 
        rashiIndex: lagna.rashiIndex,
        longitude: lagna.longitude 
      });
    }
    
    return list;
  };

  const getPlanetLabel = (name: string) => {
    if (name === 'Lagna') return 'L';
    if (name === 'Sun') return 'Su';
    if (name === 'Moon') return 'Mo';
    if (name === 'Mars') return 'Ma';
    if (name === 'Mercury') return 'Me';
    if (name === 'Jupiter') return 'Ju';
    if (name === 'Venus') return 'Ve';
    if (name === 'Saturn') return 'Sa';
    if (name === 'Rahu') return 'Ra';
    if (name === 'Ketu') return 'Ke';
    return name.substring(0, 2);
  };

  const getPlanetColor = (name: string) => {
    switch (name) {
      case 'Sun': return 'text-[#B45309]'; // Muted Amber/Orange
      case 'Moon': return 'text-[#64748B]'; // Muted Slate
      case 'Mars': return 'text-[#991B1B]'; // Deep Red
      case 'Mercury': return 'text-[#065F46]'; // Deep Emerald
      case 'Jupiter': return 'text-[#92400E]'; // Deep Amber
      case 'Venus': return 'text-[#BE185D]'; // Deep Pink
      case 'Saturn': return 'text-[#1E3A8A]'; // Deep Blue
      case 'Rahu': return 'text-[#0369A1]'; // Deep Sky Blue
      case 'Ketu': return 'text-[#713F12]'; // Deep Brown
      case 'Lagna': return 'text-[#5E2B97]'; // Deep Purple for Lagna
      default: return 'text-stone-600';
    }
  };

  const getPlanetBg = (name: string) => {
    switch (name) {
      case 'Sun': return 'bg-orange-50/50';
      case 'Moon': return 'bg-slate-50/50';
      case 'Mars': return 'bg-red-50/50';
      case 'Mercury': return 'bg-emerald-50/50';
      case 'Jupiter': return 'bg-amber-50/50';
      case 'Venus': return 'bg-pink-50/50';
      case 'Saturn': return 'bg-blue-50/50';
      case 'Rahu': return 'bg-sky-50/50';
      case 'Ketu': return 'bg-stone-50/50';
      case 'Lagna': return 'bg-indigo-50/80'; // Distinct background for Lagna
      default: return 'bg-paper';
    }
  };

  const chartRef = useRef<HTMLDivElement>(null);

  const handleShareChart = async () => {
    if (!chartRef.current) return;

    try {
      // Capture the chart as a PNG
      const dataUrl = await toPng(chartRef.current, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        style: {
          borderRadius: '0',
          padding: '20px'
        }
      });

      // Convert dataUrl to a File object
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `viniyogah-chart-${name.toLowerCase().replace(/\s+/g, '-')}.png`, { type: 'image/png' });

      const shareText = `Vedic Birth Chart for ${name}\nDate: ${dob}\nTime: ${tobUnknown ? 'Unknown' : tob}\nPlace: ${pob}\n\nGenerated by Viniyogah - Vedic B'Day Calculator`;

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Viniyogah Chart - ${name}`,
          text: shareText,
          files: [file],
        });
      } else {
        // Fallback: Download the image and open WhatsApp
        const link = document.createElement('a');
        link.download = `viniyogah-chart-${name}.png`;
        link.href = dataUrl;
        link.click();
        
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText + '\n(Image downloaded to your device)')}`;
        window.open(whatsappUrl, '_blank');
      }
    } catch (err) {
      console.error('Error sharing chart image:', err);
      // Fallback to text share if image fails
      const shareText = `Vedic Birth Chart for ${name}\nDate: ${dob}\nTime: ${tobUnknown ? 'Unknown' : tob}\nPlace: ${pob}\n\nGenerated by Viniyogah - Vedic B'Day Calculator`;
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  const nameParts = name.trim().split(/\s+/);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';
  const formatPoB = (place: string) => {
    if (!place) return "";
    // Remove pincodes (6 digits) and extra spaces
    let cleaned = place.replace(/\b\d{6}\b/g, '').replace(/\s+/g, ' ').trim();
    const parts = cleaned.split(',').map(p => p.trim()).filter(Boolean);
    
    // Show only City and Country (first and last parts usually, or last two)
    if (parts.length >= 2) {
      return `${parts[0]}, ${parts[parts.length - 1]}`;
    }
    return cleaned;
  };

  return (
    <section className="mt-12 md:mt-20 space-y-8 md:space-y-10 relative">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 px-2 md:px-4">
        <div className="space-y-1 md:space-y-2">
          <div className="flex items-center gap-2 md:gap-3 text-accent">
            <Compass size={16} className="animate-spin-slow md:w-5 md:h-5" />
            <span className="text-[8px] md:text-[10px] uppercase tracking-[0.2em] md:tracking-[0.3em] font-light">Janma Kundali</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-sans font-light text-indigo-deep tracking-tight">Birth Chart</h2>
          
          {/* Chart Type Toggle */}
          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl w-fit">
            {(['D1', 'D9', 'D10'] as ChartType[]).map((type) => (
              <button
                key={type}
                onClick={() => setChartType(type)}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                  chartType === type 
                    ? 'bg-white text-accent shadow-sm' 
                    : 'text-stone-400 hover:text-stone-600'
                }`}
              >
                {type === 'D1' ? 'Rashi (D1)' : type === 'D9' ? 'Navamsha (D9)' : 'Dashamsha (D10)'}
              </button>
            ))}
          </div>

          <p className="text-stone-400 max-w-md font-sans italic text-base md:text-lg">
            A sacred South Indian representation of planetary positions for <span className="text-accent font-light">{name}</span>.
          </p>
        </div>
        
        <div className="flex flex-row md:flex-col items-center md:items-end gap-2 md:gap-3 overflow-x-auto no-scrollbar pb-2 md:pb-0">
          <button 
            onClick={handleShareChart}
            className="bg-accent/10 hover:bg-accent/20 text-accent px-3 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl flex items-center gap-2 md:gap-3 text-[8px] md:text-[10px] font-bold uppercase tracking-widest transition-all border border-accent/20"
          >
            <Share2 size={12} className="md:w-4 md:h-4" />
            Share Chart
          </button>
          <div className="bg-paper px-3 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl flex items-center gap-2 md:gap-3 text-[8px] md:text-[10px] font-light uppercase tracking-widest text-stone-400 border border-stone-100 whitespace-nowrap">
            <MapPin size={12} className="text-accent md:w-4 md:h-4" />
            {formatPoB(pob)}
          </div>
          <div className="bg-paper px-3 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl flex items-center gap-2 md:gap-3 text-[8px] md:text-[10px] font-light uppercase tracking-widest text-stone-400 border border-stone-100 whitespace-nowrap">
            <Clock size={12} className="text-primary md:w-4 md:h-4" />
            {tob}
          </div>
        </div>
      </div>

      <div className="flex justify-center px-2">
        <div ref={chartRef} className="grid grid-cols-4 grid-rows-4 w-full max-w-[600px] aspect-square border-2 md:border-4 border-indigo-deep/10 bg-white rounded-2xl md:rounded-[3rem] overflow-hidden shadow-xl md:shadow-2xl shadow-indigo-deep/5 p-1 md:p-4 gap-1 md:gap-2">
          {CHART_LAYOUT.map((row, rowIndex) => (
            row.map((rashiIdx, colIndex) => {
              if (rashiIdx === null) {
                // Center space
                if (rowIndex === 1 && colIndex === 1) {
                  return (
                    <div key="center" className="col-span-2 row-span-2 flex flex-col items-center justify-center p-2 md:p-4 text-center bg-indigo-deep/[0.02] rounded-xl md:rounded-3xl border border-indigo-deep/5 relative">
                      {/* Chart Type Label */}
                      <div className="absolute top-2 left-2 md:top-4 md:left-4">
                        <span className="text-[6px] md:text-[8px] font-display font-black uppercase tracking-widest">
                          <span className="text-accent">{chartType}</span>
                          <span className="text-indigo-deep/20 ml-1">
                            {chartType === 'D1' ? '/ Lagna' : chartType === 'D9' ? '/ Navamsha' : '/ Dashamsha'}
                          </span>
                        </span>
                      </div>
                      
                      <div className="w-10 h-10 md:w-16 md:h-16 rounded-full border border-indigo-deep/10 flex items-center justify-center mb-2 md:mb-3 bg-white shadow-sm">
                        <VelIcon className="w-6 h-6 md:w-10 md:h-10 text-accent" />
                      </div>
                      <div className="font-display font-black text-xs md:text-base tracking-tighter leading-none flex items-center lowercase mb-1 md:mb-2">
                        <span className="text-accent">{firstName}</span>
                        {lastName && <span className="text-primary ml-1">{lastName}</span>}
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[7px] md:text-[9px] text-stone-400 font-medium uppercase tracking-wider">{dob}</p>
                        <p className="text-[7px] md:text-[9px] text-stone-400 font-medium uppercase tracking-wider">{tobUnknown ? 'Unknown Time' : tob}</p>
                        <p className="text-[7px] md:text-[9px] text-stone-400 font-medium uppercase tracking-wider line-clamp-1">{formatPoB(pob)}</p>
                        {pobCoords && (
                          <p className="text-[6px] md:text-[8px] text-stone-300 font-mono tracking-tighter">
                            {Math.abs(pobCoords.lat).toFixed(2)}°{pobCoords.lat >= 0 ? 'N' : 'S'}, {Math.abs(pobCoords.lng).toFixed(2)}°{pobCoords.lng >= 0 ? 'E' : 'W'}
                          </p>
                        )}
                      </div>
                      
                      {/* Trademark */}
                      <div className="absolute bottom-2 right-2 opacity-20 flex items-center gap-1">
                        <span className="font-display font-black text-[6px] md:text-[8px] tracking-tighter lowercase">
                          <span className="text-accent">vini</span>
                          <span className="text-primary">yogah</span>
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              }

              const rashiPlanets = getPlanetsInRashi(rashiIdx);
              const isSunSign = rashiIdx === sunRashiIndex;
              const isMoonSign = rashiIdx === moonRashiIndex;
              const isLagnaRashi = lagna && rashiIdx === lagna.rashiIndex;
              const houseNumber = lagna ? ((rashiIdx - lagna.rashiIndex + 12) % 12 + 1) : null;
              
              // Compact mode if many planets
              const isCompact = rashiPlanets.length > 2;
              const isSuperCompact = rashiPlanets.length > 4;

              return (
                <div 
                  key={rashiIdx} 
                  className={`border border-stone-100 rounded-lg md:rounded-2xl p-1 md:p-3 flex flex-col relative transition-all hover:border-accent/30 hover:bg-paper ${
                    isSunSign ? 'bg-accent/5 border-accent/20' : isMoonSign ? 'bg-primary/5 border-primary/20' : 'bg-white'
                  }`}
                >
                  <span className="text-[7px] md:text-[9px] font-light text-stone-300 uppercase tracking-widest absolute top-1 md:top-2 left-1.5 md:left-3">
                    {RASHIS[rashiIdx]}
                  </span>

                  {houseNumber && (
                    <div className="absolute bottom-1 md:bottom-2 right-1.5 md:right-3">
                      <span className="text-[7px] md:text-[9px] font-bold text-indigo-deep/30">{houseNumber}</span>
                    </div>
                  )}
                  
                  <div className={`mt-4 md:mt-6 flex-1 flex items-center justify-center p-0.5 md:p-1`}>
                    <div className={`grid gap-1 md:gap-2 w-full h-full items-center justify-items-center ${
                      rashiPlanets.length > 4 ? 'grid-cols-3' : 
                      rashiPlanets.length > 1 ? 'grid-cols-2' : 
                      'grid-cols-1'
                    }`}>
                      {rashiPlanets.map(p => {
                        const isLagna = p.name === 'Lagna';
                        const planetCount = rashiPlanets.length;
                        
                        // Dynamic sizing based on count
                        let iconSize = 'w-6 h-6 md:w-10 md:h-10 text-xs md:text-xl';
                        let fontSize = 'text-[6px] md:text-[8px]';
                        let degSize = 'text-[6px] md:text-[8px]';

                        if (planetCount > 4) {
                          iconSize = 'w-3.5 h-3.5 md:w-6 md:h-6 text-[7px] md:text-xs';
                          fontSize = 'text-[4px] md:text-[5px]';
                          degSize = 'text-[4px] md:text-[5px]';
                        } else if (planetCount > 2) {
                          iconSize = 'w-4.5 h-4.5 md:w-8 md:h-8 text-[9px] md:text-base';
                          fontSize = 'text-[5px] md:text-[6px]';
                          degSize = 'text-[5px] md:text-[6px]';
                        }

                        return (
                          <motion.div
                            key={p.name}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="flex flex-col items-center group/planet w-full"
                          >
                            {!isLagna && (
                              <span className={`font-bold uppercase opacity-60 group-hover/planet:opacity-100 transition-opacity leading-none mb-0.5 ${fontSize}`}>
                                {getPlanetLabel(p.name)}
                              </span>
                            )}
                            <div className={`rounded-full flex items-center justify-center transition-transform group-hover/planet:scale-110 shadow-sm ${getPlanetColor(p.name)} ${getPlanetBg(p.name)} ${iconSize} ${isLagna ? 'ring-2 ring-primary/40 font-black' : ''}`} title={p.name}>
                              {PLANET_SYMBOLS[p.name] || p.symbol}
                            </div>
                            <span className={`font-mono text-stone-400/80 leading-none mt-0.5 ${degSize}`}>
                              {(p.longitude % 30).toFixed(0)}°
                            </span>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 px-2 md:px-0">
        <div className="glass-card p-4 md:p-6 rounded-2xl md:rounded-3xl space-y-1 md:space-y-2 border-accent/10">
          <p className="text-[8px] md:text-[9px] uppercase tracking-[0.15em] md:tracking-[0.2em] font-light text-stone-400">Sun Rashi</p>
          <p className="text-base md:text-xl font-sans font-light text-accent truncate">{sunRashi}</p>
        </div>
        <div className="glass-card p-4 md:p-6 rounded-2xl md:rounded-3xl space-y-1 md:space-y-2 border-primary/10">
          <p className="text-[8px] md:text-[9px] uppercase tracking-[0.15em] md:tracking-[0.2em] font-light text-stone-400">Nakshatra</p>
          <p className="text-base md:text-xl font-sans font-light text-primary truncate leading-tight">{moonNakshatra}</p>
        </div>
        <div className="glass-card p-4 md:p-6 rounded-2xl md:rounded-3xl space-y-1 md:space-y-2">
          <p className="text-[8px] md:text-[9px] uppercase tracking-[0.15em] md:tracking-[0.2em] font-light text-stone-400">Birth Date</p>
          <p className="text-base md:text-xl font-sans font-light text-indigo-deep truncate">{dob}</p>
        </div>
        <div className="glass-card p-4 md:p-6 rounded-2xl md:rounded-3xl space-y-1 md:space-y-2">
          <p className="text-[8px] md:text-[9px] uppercase tracking-[0.15em] md:tracking-[0.2em] font-light text-stone-400">Birth Time</p>
          <p className="text-base md:text-xl font-sans font-light text-indigo-deep truncate">{tobUnknown ? 'Unknown' : tob}</p>
        </div>
      </div>
    </section>
  );
};
