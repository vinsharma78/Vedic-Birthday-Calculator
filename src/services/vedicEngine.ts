import { AstroTime, Body, SunPosition, EclipticGeoMoon, GeoVector, Ecliptic, SiderealTime } from 'astronomy-engine';

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

export const SAMVATSARAS = [
    "Prabhava", "Vibhava", "Shukla", "Pramoda", "Prajapati", "Angirasa", "Shrimukha", "Bhava", "Yuva", "Dhata",
    "Ishvara", "Bahudhanya", "Pramathi", "Vikrama", "Vrusha", "Chitrabhanu", "Subhanu", "Tarana", "Parthiva", "Vyaya",
    "Sarvajitu", "Sarvadhari", "Virodhi", "Vikruta", "Khara", "Nandana", "Vijaya", "Jaya", "Manmatha", "Durmukha",
    "Hevilambi", "Vilambi", "Vikari", "Sharvari", "Plava", "Shubhakruta", "Shobhakruta", "Krodhi", "Vishvavasu", "Parabhava",
    "Plavanga", "Kilaka", "Saumya", "Sadharana", "Virodhikruta", "Paridhavi", "Pramadicha", "Anala", "Rakshasa", "Anala",
    "Pingala", "Kalayukti", "Siddharth", "Raudra", "Durmati", "Dundubhi", "Rudhirodgari", "Raktakshi", "Krodhana", "Akshaya"
];

export const RITUS = ["Vasanta", "Grishma", "Varsha", "Sharad", "Hemanta", "Shishira"];

export const MAASAS = [
    "Chaitra", "Vaishakha", "Jyeshtha", "Ashadha", "Shravana", "Bhadrapada",
    "Ashvina", "Kartika", "Margashirsha", "Pausha", "Magha", "Phalguna"
];

export const YOGAS = [
    "Vishkumbha", "Preeti", "Ayushman", "Saubhagya", "Shobhana", "Atiganda", "Sukarma", "Dhriti", "Shoola",
    "Ganda", "Vriddhi", "Dhruva", "Vyaghata", "Harshana", "Vajra", "Siddhi", "Vyatipata", "Variyan", "Parigha",
    "Shiva", "Siddha", "Sadhya", "Shubha", "Shukla", "Brahma", "Indra", "Vaidhriti"
];

export const KARANAS = [
    "Bava", "Balava", "Kaulava", "Taitila", "Garaja", "Vanija", "Vishti",
    "Shakuni", "Chatushpada", "Naga", "Kimstughna"
];

export const VASARAS = [
    "Ravivaara", "Somavaara", "Mangalavaara", "Budhavaara", "Guruvaara", "Shukravaara", "Shanivaara"
];

/**
 * Calculates a more accurate Lahiri Ayanamsa for a given date.
 */
export function getAyanamsa(date: Date): number {
    // Use astronomy-engine's AstroTime for consistent Julian date calculation
    const time = new AstroTime(date);
    // t is Julian centuries from J2000.0 (JD 2451545.0)
    const jd = time.ut + 2451545.0;
    const t = (jd - 2451545.0) / 36525;
    
    // Lahiri Ayanamsa (Chitra Paksha) formula:
    // 23.853333 + 1.396042 * T + 0.000308 * T^2
    return 23.853333 + (1.396042 * t) + (0.000308 * t * t);
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

export function getYoga(sunLong: number, moonLong: number): { name: string; index: number } {
    let yogaLong = (sunLong + moonLong) % 360;
    const index = Math.floor(yogaLong / (360 / 27));
    return { name: YOGAS[index], index };
}

export function getTithi(sunLong: number, moonLong: number): { index: number; paksha: string; name: string } {
    let diff = (moonLong - sunLong + 360) % 360;
    const tithiIndex = Math.floor(diff / 12);
    const paksha = tithiIndex < 15 ? "Shukla" : "Krishna";
    const names = ["Prathama", "Dwitiya", "Tritiya", "Chaturthi", "Panchami", "Shashti", "Saptami", "Ashtami", "Navami", "Dashami", "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi", "Purnima", "Amavasya"];
    const nameIndex = tithiIndex < 15 ? tithiIndex : tithiIndex - 15;
    let name = names[nameIndex];
    if (tithiIndex === 29) name = "Amavasya";
    if (tithiIndex === 14) name = "Purnima";
    
    return { index: tithiIndex, paksha, name };
}

export function getKarana(sunLong: number, moonLong: number): { name: string; index: number } {
    let diff = (moonLong - sunLong + 360) % 360;
    const halfTithiIndex = Math.floor(diff / 6);
    
    let karanaIndex = 0;
    if (halfTithiIndex === 0) {
        karanaIndex = 10; // Kimstughna
    } else if (halfTithiIndex >= 57) {
        karanaIndex = 7 + (halfTithiIndex - 57); // Shakuni, Chatushpada, Naga
    } else {
        karanaIndex = ((halfTithiIndex - 1) % 7); // Bava to Vishti
    }
    
    return { name: KARANAS[karanaIndex], index: karanaIndex };
}

export function getSamvatsara(year: number): string {
    // Shaka Samvat start is 78 AD. 
    // Cycle starts from Prabhava. 
    // 2024 is Krodhi (38th in cycle).
    // Formula: (Year + 12) % 60 for North Indian, (Year + 11) % 60 for South Indian.
    // Let's use a common one: (Year - 1987 + 60) % 60 starts at Prabhava.
    // 2024 - 1987 = 37. 37th index is Krodhi. Correct.
    const index = (year - 1987 + 6000) % 60;
    return SAMVATSARAS[index];
}

export function getAayana(sunLong: number): string {
    // Uttarayana: Sun in Makara to Mithuna (approx 270 to 90 tropical, but Vedic uses sidereal)
    // Sidereal: Makara starts at 270.
    return (sunLong >= 270 || sunLong < 90) ? "Uttarayana" : "Dakshinayana";
}

export function getRitu(sunLong: number): string {
    const index = Math.floor(sunLong / 60);
    return RITUS[index];
}

export function getMaasa(sunLong: number): string {
    const index = Math.floor(sunLong / 30);
    return MAASAS[index];
}

export interface Coordinates {
    lat: number;
    lng: number;
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
        rashi: string;
        rashiIndex: number;
    };
    mars: { longitude: number; rashi: string; rashiIndex: number };
    mercury: { longitude: number; rashi: string; rashiIndex: number };
    jupiter: { longitude: number; rashi: string; rashiIndex: number };
    venus: { longitude: number; rashi: string; rashiIndex: number };
    saturn: { longitude: number; rashi: string; rashiIndex: number };
    rahu: {
        longitude: number;
        rashi: string;
        rashiIndex: number;
    };
    ketu: {
        longitude: number;
        rashi: string;
        rashiIndex: number;
    };
    lagna: {
        longitude: number;
        rashi: string;
        rashiIndex: number;
    };
    ayanamsa: number;
}

/**
 * Calculates the Mean Ascending Node of the Moon (Rahu).
 */
export function getMeanRahu(date: Date): number {
    // Julian centuries from J2000.0
    const d = (date.getTime() / 86400000) - 10957.5;
    const t = d / 36525;
    
    // Mean longitude of ascending node (IAU 1980)
    let rahu = 125.04452222 - (1934.13626083 * t) + (0.00207081 * t * t) + (t * t * t / 450000);
    
    rahu = rahu % 360;
    if (rahu < 0) rahu += 360;
    return rahu;
}

/**
 * Calculates the Obliquity of the Ecliptic.
 */
export function getObliquity(time: AstroTime): number {
    // t is Julian centuries from J2000.0 (JD 2451545.0)
    const jd = time.ut + 2451545.0;
    const t = (jd - 2451545.0) / 36525;
    
    // Obliquity of the Ecliptic (Laskar, 1986)
    return 23.4392911 - (0.0130041667 * t) - (0.000000164 * t * t) + (0.0000005036 * t * t * t);
}

/**
 * Calculates the Ascendant (Lagna) longitude.
 */
export function getAscendant(date: Date, coords: Coordinates): number {
    const time = new AstroTime(date);
    
    // 1. Get Greenwich Apparent Sidereal Time (GAST) in hours
    const gst = SiderealTime(time);
    
    // 2. Calculate Local Sidereal Time (LST) in degrees
    // LST = GAST + Longitude
    const lst = (gst * 15 + coords.lng + 360) % 360;
    const lstRad = lst * Math.PI / 180;
    
    // 3. Get Obliquity of the Ecliptic
    const obl = getObliquity(time) * Math.PI / 180;
    const latRad = coords.lat * Math.PI / 180;
    
    // 4. Calculate Ascendant (Lagna)
    // The Ascendant is the point on the ecliptic that is rising on the eastern horizon.
    // Standard Formula: tan(Asc) = (cos LST) / (-sin LST * cos eps - tan phi * sin eps)
    // We use atan2 for correct quadrant handling.
    const y = Math.cos(lstRad);
    const x = -Math.sin(lstRad) * Math.cos(obl) - Math.tan(latRad) * Math.sin(obl);
    
    let ascendant = Math.atan2(y, x) * 180 / Math.PI;
    
    return (ascendant + 360) % 360;
}

/**
 * CALCULATES ACCURATE VEDIC PLANETARY POSITIONS
 * CRITICAL: Must use GEOCENTRIC coordinates (Earth-centered) for Vedic Astrology.
 */
export function calculatePositions(date: Date, coords?: Coordinates): PlanetaryPositions | null {
    if (!date || isNaN(date.getTime())) {
        return null;
    }
    
    try {
        const year = date.getUTCFullYear();
        if (year < -3000 || year > 3000) {
            console.warn("Date out of range for astronomy-engine:", year);
            return null;
        }

        const ayanamsa = getAyanamsa(date);
        const timeObj = new AstroTime(date);
        
        // Helper to get geocentric ecliptic longitude for any body
        const getPlanetLong = (body: Body) => {
            const gv = GeoVector(body, timeObj, true);
            const ecl = Ecliptic(gv);
            return ecl.elon;
        };

        // Sun position (geocentric)
        const sunPos = SunPosition(timeObj);
        const sunLong = sunPos.elon;
        
        // Moon position (geocentric)
        const moonPos = EclipticGeoMoon(timeObj);
        const moonLong = moonPos.lon;

        // Other planets (geocentric)
        const marsLong = getPlanetLong(Body.Mars);
        const mercuryLong = getPlanetLong(Body.Mercury);
        const jupiterLong = getPlanetLong(Body.Jupiter);
        const venusLong = getPlanetLong(Body.Venus);
        const saturnLong = getPlanetLong(Body.Saturn);
        
        // Rahu (Mean Node)
        const rahuLong = getMeanRahu(date);
        const ketuLong = (rahuLong + 180) % 360;
        
        const getSidereal = (long: number) => getSiderealLongitude(long, ayanamsa);
        const getRashiData = (long: number) => getRashi(getSidereal(long));

        const sunSidereal = getSidereal(sunLong);
        const sunRashi = getRashi(sunSidereal);

        const moonSidereal = getSidereal(moonLong);
        const moonNakshatra = getNakshatra(moonSidereal);
        const moonRashi = getRashi(moonSidereal);

        const marsSidereal = getSidereal(marsLong);
        const marsRashi = getRashi(marsSidereal);

        const mercurySidereal = getSidereal(mercuryLong);
        const mercuryRashi = getRashi(mercurySidereal);

        const jupiterSidereal = getSidereal(jupiterLong);
        const jupiterRashi = getRashi(jupiterSidereal);

        const venusSidereal = getSidereal(venusLong);
        const venusRashi = getRashi(venusSidereal);

        const saturnSidereal = getSidereal(saturnLong);
        const saturnRashi = getRashi(saturnSidereal);

        const rahuSidereal = getSidereal(rahuLong);
        const rahuRashi = getRashi(rahuSidereal);

        const ketuSidereal = getSidereal(ketuLong);
        const ketuRashi = getRashi(ketuSidereal);

        // Lagna (Ascendant)
        let lagnaSidereal = 0;
        if (coords) {
            const lagnaTropical = getAscendant(date, coords);
            lagnaSidereal = getSidereal(lagnaTropical);
        }
        const lagnaRashi = getRashi(lagnaSidereal);

        return {
            sun: { longitude: sunSidereal, rashi: sunRashi.name, rashiIndex: sunRashi.index },
            moon: {
                longitude: moonSidereal,
                nakshatra: moonNakshatra.name,
                nakshatraIndex: moonNakshatra.index,
                rashi: moonRashi.name,
                rashiIndex: moonRashi.index
            },
            mars: { longitude: marsSidereal, rashi: marsRashi.name, rashiIndex: marsRashi.index },
            mercury: { longitude: mercurySidereal, rashi: mercuryRashi.name, rashiIndex: mercuryRashi.index },
            jupiter: { longitude: jupiterSidereal, rashi: jupiterRashi.name, rashiIndex: jupiterRashi.index },
            venus: { longitude: venusSidereal, rashi: venusRashi.name, rashiIndex: venusRashi.index },
            saturn: { longitude: saturnSidereal, rashi: saturnRashi.name, rashiIndex: saturnRashi.index },
            rahu: { longitude: rahuSidereal, rashi: rahuRashi.name, rashiIndex: rahuRashi.index },
            ketu: { longitude: ketuSidereal, rashi: ketuRashi.name, rashiIndex: ketuRashi.index },
            lagna: { longitude: lagnaSidereal, rashi: lagnaRashi.name, rashiIndex: lagnaRashi.index },
            ayanamsa
        };
    } catch (e) {
        console.error("calculatePositions failed:", e);
        return null;
    }
}

/**
 * Finds the next occurrence of the Hindu Birthdate.
 * Calibrated for Sunrise-based Nakshatra determination (Vedic Standard).
 */
export function findHinduBirthdate(birthSunRashiIndex: number, birthMoonNakshatraIndex: number, year: number, coords?: Coordinates): Date | null {
    // Iterate through each day of the year
    for (let d = 0; d < 366; d++) {
        // Default to 06:00 AM local time if coordinates are available, else 06:00 AM IST (00:30 UTC)
        let date: Date;
        if (coords) {
            // Approximate local sunrise at 06:00 AM
            // For better accuracy, we'd use Astronomy.SearchSunrise, but 06:00 AM local is a common standard for "day of"
            // We'll use 06:00 AM at the given coordinates
            // This is a simplification, but better than fixed UTC
            const baseDate = new Date(Date.UTC(year, 0, 1, 6, 0));
            baseDate.setUTCDate(baseDate.getUTCDate() + d);
            // Adjust for longitude (approximate timezone)
            const tzOffsetHours = coords.lng / 15;
            date = new Date(baseDate.getTime() - (tzOffsetHours * 3600000));
        } else {
            date = new Date(Date.UTC(year, 0, 1, 0, 30));
            date.setUTCDate(date.getUTCDate() + d);
        }
        
        if (date.getUTCFullYear() !== year) continue;

        const pos = calculatePositions(date, coords);
        
        // Match Sun Rashi and Moon Nakshatra at Sunrise
        if (pos && pos.sun.rashiIndex === birthSunRashiIndex && pos.moon.nakshatraIndex === birthMoonNakshatraIndex) {
            return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
        }
    }
    
    return null;
}
