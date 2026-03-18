import { 
    Body, 
    SunPosition,
    EclipticGeoMoon
} from 'astronomy-engine';

// Vedic Astrology Constants
export const RASHIS = [
    "Mesha", "Vrishabha", "Mithuna", "Karka", "Simha", "Kanya", 
    "Tula", "Vrischika", "Dhanu", "Makara", "Kumbha", "Meena"
];

export const NAKSHATRAS = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha",
    "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
    "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
];

/**
 * Calculates Lahiri Ayanamsa for a given date.
 */
export function getAyanamsa(date: Date): number {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    
    const t = year + (month + day / 30) / 12;
    return 23.85 + (t - 2000) * (50.29 / 3600);
}

export function getSiderealLongitude(tropicalLong: number, ayanamsa: number): number {
    let sidereal = (tropicalLong - ayanamsa) % 360;
    if (sidereal < 0) sidereal += 360;
    return sidereal;
}

export function getRashi(longitude: number): { name: string; index: number } {
    const index = Math.floor(longitude / 30);
    return { name: RASHIS[index], index };
}

export function getNakshatra(longitude: number): { name: string; index: number } {
    const index = Math.floor(longitude / (360 / 27));
    return { name: NAKSHATRAS[index], index };
}

export interface PlanetaryPositions {
    sun: {
        longitude: number;
        rashi: string;
        rashiIndex: number;
    };
    moon: {
        longitude: number;
        nakshatra: string;
        nakshatraIndex: number;
        rashiIndex: number;
    };
    ayanamsa: number;
}

export function calculatePositions(date: Date): PlanetaryPositions {
    const ayanamsa = getAyanamsa(date);
    
    // Sun Position (Tropical Ecliptic Longitude)
    // Using SunPosition instead of EclipticLongitude to avoid heliocentric errors
    const sunPos = SunPosition(date);
    const sunSidereal = getSiderealLongitude(sunPos.elon, ayanamsa);
    const sunRashi = getRashi(sunSidereal);

    // Moon Position (Tropical Ecliptic Longitude)
    // Using EclipticGeoMoon for reliable lunar coordinates
    const moonPos = EclipticGeoMoon(date);
    const moonSidereal = getSiderealLongitude(moonPos.lon, ayanamsa);
    const moonNakshatra = getNakshatra(moonSidereal);
    const moonRashi = getRashi(moonSidereal);

    return {
        sun: {
            longitude: sunSidereal,
            rashi: sunRashi.name,
            rashiIndex: sunRashi.index
        },
        moon: {
            longitude: moonSidereal,
            nakshatra: moonNakshatra.name,
            nakshatraIndex: moonNakshatra.index,
            rashiIndex: moonRashi.index
        },
        ayanamsa
    };
}

/**
 * Finds the next occurrence of the Hindu Birthdate.
 */
export function findHinduBirthdate(birthSunRashiIndex: number, birthMoonNakshatraIndex: number, year: number): Date | null {
    // Check every 6 hours to ensure we don't miss the Moon's transit through a Nakshatra
    // The Moon stays in a Nakshatra for about 24 hours, so 6-hour intervals are safe.
    for (let h = 0; h < 366 * 24; h += 6) {
        const date = new Date(Date.UTC(year, 0, 1));
        date.setUTCHours(h);
        
        const pos = calculatePositions(date);
        if (pos.sun.rashiIndex === birthSunRashiIndex) {
            if (pos.moon.nakshatraIndex === birthMoonNakshatraIndex) {
                // Return the date at 00:00 for that day for display purposes
                const resultDate = new Date(date);
                resultDate.setUTCHours(0, 0, 0, 0);
                return resultDate;
            }
        }
    }
    
    return null;
}
