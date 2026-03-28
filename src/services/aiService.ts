import { GoogleGenAI, Type } from "@google/genai";

const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined in the environment.");
  }
  return new GoogleGenAI({ apiKey });
};

// Simple in-memory cache
const cache: Record<string, string> = {};

const withRetry = async <T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && (error?.message?.includes('429') || error?.message?.toLowerCase().includes('rate limit') || error?.message?.toLowerCase().includes('quota'))) {
      console.warn(`Rate limit hit, retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

export const getNakshatraProfile = async (nakshatra: string) => {
  const cacheKey = `nakshatra_${nakshatra}`;
  if (cache[cacheKey]) return cache[cacheKey];

  const ai = getAI();
  const prompt = `Provide a detailed Vedic reading for the birth star (Nakshatra): ${nakshatra}. 
  Include:
  1. Core personality characteristics.
  2. Spiritual strengths and life purpose.
  3. Career and relationship tendencies.
  4. **FAMOUS PERSONALITIES**: Provide a dedicated section listing famous global or Indian personalities born in this Nakshatra. This is a key requirement.
  5. A short piece of wisdom or mantra for this star.
  
  Keep the tone respectful, mystical, and encouraging. Use Markdown for formatting.`;

  const result = await withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text;
  });

  if (result) cache[cacheKey] = result;
  return result;
};

export const getAuspiciousGuidance = async (
  name: string,
  nakshatra: string,
  sunRashi: string,
  birthdayDate: string,
  planetaryPositions?: any[]
) => {
  const cacheKey = `guidance_${name}_${nakshatra}_${sunRashi}_${birthdayDate}`;
  if (cache[cacheKey]) return cache[cacheKey];

  const ai = getAI();
  const planetsStr = planetaryPositions 
    ? `Current planetary alignments: ${JSON.stringify(planetaryPositions)}`
    : "Standard Vedic alignments for this Tithi.";

  const prompt = `Explain the spiritual significance of ${name}'s upcoming Vedic birthday on ${birthdayDate}.
  Their birth details: Nakshatra: ${nakshatra}, Sun Rashi: ${sunRashi}.
  ${planetsStr}
  
  CRITICAL: On this specific day (the Vedic birthday), the Sun and Moon are in the same relative positions as they were at birth. However, other planets (Mars, Mercury, Jupiter, Venus, Saturn, Rahu, Ketu) are transiting in their current positions for this date.
  
  Please provide a reading that:
  1. Acknowledges the Sun and Moon's alignment with the birth positions.
  2. Interprets the significance of the other planets based on their actual transits on this day (as provided in the planetary alignments).
  3. Explains why this specific day is auspicious for them and what spiritual activities or reflections they should focus on. 
  
  Keep it personal, insightful, and rooted in Vedic astrological principles. Use Markdown for formatting.`;

  const result = await withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text;
  });

  if (result) cache[cacheKey] = result;
  return result;
};

export const getVedicWisdomAnswer = async (question: string, chatHistory: { role: string, parts: { text: string }[] }[]) => {
  const ai = getAI();
  const chat = ai.chats.create({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction: "You are a wise Vedic assistant named 'Viniyogah Guru'. You answer questions about Vedic traditions, Tithis, Nakshatras, and Hindu philosophy. Your tone is calm, knowledgeable, and helpful. Keep answers concise but deep. If asked about something non-Vedic, gently steer the conversation back to Vedic wisdom.",
    },
    history: chatHistory,
  });

  const result = await withRetry(async () => {
    const response = await chat.sendMessage({ message: question });
    return response.text;
  });

  return result;
};
