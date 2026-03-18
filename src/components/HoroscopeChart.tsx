import React from 'react';
import { motion } from 'motion/react';
import { Compass, Info, MapPin, Clock } from 'lucide-react';

interface PlanetPosition {
  name: string;
  symbol: string;
  rashi: string;
  rashiIndex: number;
}

interface HoroscopeChartProps {
  name: string;
  sunRashi: string;
  sunRashiIndex: number;
  moonNakshatra: string;
  moonNakshatraIndex: number;
  dob: string;
  tob: string;
  tobUnknown: boolean;
  pob: string;
  pobUnknown: boolean;
  planets?: PlanetPosition[];
  calculating?: boolean;
}

const RASHIS = [
  "Mesha", "Vrishabha", "Mithuna", "Karka", 
  "Simha", "Kanya", "Tula", "Vrischika", 
  "Dhanu", "Makara", "Kumbha", "Meena"
];

// South Indian Chart Layout (Indices 0-11)
// 11 00 01 02
// 10       03
// 09       04
// 08 07 06 05
const CHART_LAYOUT = [
  [11, 0, 1, 2],
  [10, null, null, 3],
  [9, null, null, 4],
  [8, 7, 6, 5]
];

export const HoroscopeChart: React.FC<HoroscopeChartProps> = ({ 
  name, 
  sunRashi, 
  sunRashiIndex, 
  moonNakshatra, 
  moonNakshatraIndex,
  dob,
  tob,
  tobUnknown,
  pob,
  pobUnknown,
  planets,
  calculating
}) => {
  // Only show chart if ToB and PoB are provided
  if (tobUnknown || pobUnknown || !pob) {
    return (
      <section className="mt-16 p-8 bg-black/[0.02] border border-dashed border-black/10 rounded-[2.5rem] text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-black/5 flex items-center justify-center mx-auto text-black/20">
          <Compass size={32} />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-display font-black tracking-tight text-black/40">Chart Unavailable</h3>
          <p className="text-xs text-black/30 max-w-xs mx-auto">
            Please provide both <span className="font-bold">Time of Birth</span> and <span className="font-bold">Place of Birth</span> to generate your accurate Vedic Horoscope.
          </p>
        </div>
      </section>
    );
  }

  const getPlanetsInRashi = (index: number) => {
    return planets?.filter(p => p.rashiIndex === index) || [];
  };

  const moonRashiIndex = planets?.find(p => p.name === 'Moon')?.rashiIndex;

  return (
    <section className="mt-16 space-y-8 relative">
      {calculating && (
        <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center rounded-[2.5rem] space-y-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-xs font-bold uppercase tracking-widest text-primary animate-pulse">Calculating Ephemeris...</p>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <Compass size={16} className="animate-spin-slow" />
            <h3 className="text-[10px] uppercase tracking-[0.2em] font-display font-bold">Janma Kundali</h3>
          </div>
          <h2 className="text-3xl font-display font-black tracking-tighter italic">Birth Chart</h2>
          <p className="text-sm text-black/40 max-w-md">
            Accurate South Indian style representation of planetary positions for <span className="text-primary font-bold">{name}</span>.
          </p>
        </div>
        
        <div className="flex flex-col items-end gap-1">
          <div className="bg-black/5 px-4 py-2 rounded-xl flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-black/40">
            <MapPin size={14} />
            {pob}
          </div>
          <div className="bg-black/5 px-4 py-2 rounded-xl flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-black/40">
            <Clock size={14} />
            {tob}
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <div className="grid grid-cols-4 grid-rows-4 w-full max-w-[500px] aspect-square border-2 border-primary/20 bg-white rounded-[2rem] overflow-hidden shadow-2xl shadow-primary/5">
          {CHART_LAYOUT.map((row, rowIndex) => (
            row.map((rashiIdx, colIndex) => {
              if (rashiIdx === null) {
                // Center space
                if (rowIndex === 1 && colIndex === 1) {
                  return (
                    <div key="center" className="col-span-2 row-span-2 flex flex-col items-center justify-center p-4 text-center bg-primary/[0.02]">
                      <div className="w-16 h-16 rounded-full border border-primary/10 flex items-center justify-center mb-2">
                        <Compass size={32} className="text-primary/20" />
                      </div>
                      <p className="text-[10px] font-display font-black tracking-tighter uppercase text-primary/40">{name}</p>
                      <p className="text-[8px] text-black/20 font-bold">{dob}</p>
                    </div>
                  );
                }
                return null;
              }

              const rashiPlanets = getPlanetsInRashi(rashiIdx);
              const isSunSign = rashiIdx === sunRashiIndex;
              const isMoonSign = rashiIdx === moonRashiIndex;

              return (
                <div 
                  key={rashiIdx} 
                  className={`border border-primary/10 p-2 flex flex-col relative transition-colors hover:bg-primary/[0.02] ${
                    isSunSign ? 'bg-orange-vibrant/5' : isMoonSign ? 'bg-primary/5' : ''
                  }`}
                >
                  <span className="text-[8px] font-bold text-black/20 uppercase tracking-tighter absolute top-1 left-1">
                    {RASHIS[rashiIdx]}
                  </span>
                  
                  <div className="flex flex-wrap gap-1 mt-3 justify-center items-center h-full">
                    {rashiPlanets.map(p => (
                      <motion.div
                        key={p.name}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shadow-sm ${
                          p.name === 'Sun' ? 'bg-orange-vibrant text-white' : 
                          p.name === 'Moon' ? 'bg-primary text-white' : 
                          'bg-black/5 text-black/60'
                        }`}
                        title={p.name}
                      >
                        {p.symbol}
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-black/5 p-4 rounded-2xl space-y-1">
          <p className="text-[9px] uppercase tracking-widest font-bold text-black/30">Sun Rashi</p>
          <p className="text-sm font-display font-black tracking-tight text-orange-vibrant">{sunRashi}</p>
        </div>
        <div className="bg-white border border-black/5 p-4 rounded-2xl space-y-1">
          <p className="text-[9px] uppercase tracking-widest font-bold text-black/30">Moon Nakshatra</p>
          <p className="text-sm font-display font-black tracking-tight text-primary">{moonNakshatra}</p>
        </div>
        <div className="bg-white border border-black/5 p-4 rounded-2xl space-y-1">
          <p className="text-[9px] uppercase tracking-widest font-bold text-black/30">Birth Date</p>
          <p className="text-sm font-display font-black tracking-tight">{dob}</p>
        </div>
        <div className="bg-white border border-black/5 p-4 rounded-2xl space-y-1">
          <p className="text-[9px] uppercase tracking-widest font-bold text-black/30">Birth Time</p>
          <p className="text-sm font-display font-black tracking-tight">{tobUnknown ? 'Unknown' : tob}</p>
        </div>
      </div>
    </section>
  );
};
