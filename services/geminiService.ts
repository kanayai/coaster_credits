
import { GoogleGenAI, Type } from "@google/genai";
import { Coaster, CoasterType } from '../types';

let genAI: GoogleGenAI | null = null;

if (process.env.API_KEY) {
  genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
}

export const generateCoasterInfo = async (searchTerm: string): Promise<Partial<Coaster>[] | null> => {
  if (!genAI) {
    console.warn("Gemini API Key missing");
    return null;
  }

  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Search for roller coaster data based on the query: "${searchTerm}".
      
      Rules:
      1. If the query is a theme park, return a list of its top 10 most popular current operating roller coasters.
      2. If the query is a specific coaster name, return that coaster's specific details.
      3. CRITICAL: If a coaster has distinct major variants (e.g., "Mr. Freeze" vs "Mr. Freeze: Reverse Blast", or "Space Mountain" vs "Hyperspace Mountain"), return them as SEPARATE results so the user can choose the correct version.
      4. If a coaster has been renamed (e.g., "Goliath" is now "The Chupacabra"), return the NEW name, but you may include the old name in parentheses like "The Chupacabra (formerly Goliath)".
      5. Include height (in feet), speed (in mph), and track length (in feet) if known.
      
      Return an empty list if no real coasters are found.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            found: { type: Type.BOOLEAN },
            results: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  park: { type: Type.STRING },
                  country: { type: Type.STRING },
                  manufacturer: { type: Type.STRING },
                  type: { 
                    type: Type.STRING, 
                    enum: ['Steel', 'Wooden', 'Hybrid', 'Alpine', 'Family', 'Powered', 'Bobsled'] 
                  },
                  specs: {
                    type: Type.OBJECT,
                    properties: {
                      height: { type: Type.STRING, description: "Height in feet" },
                      speed: { type: Type.STRING, description: "Speed in mph" },
                      length: { type: Type.STRING, description: "Length in feet" },
                      inversions: { type: Type.INTEGER }
                    }
                  }
                },
                required: ['name', 'park']
              }
            }
          },
          required: ['found', 'results']
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    
    const data = JSON.parse(text);
    if (!data.found || !data.results || data.results.length === 0) return null;

    return data.results.map((item: any) => {
        let mappedType = CoasterType.Steel;
        if (Object.values(CoasterType).includes(item.type as CoasterType)) {
            mappedType = item.type as CoasterType;
        }
        return {
            name: item.name,
            park: item.park,
            country: item.country || 'Unknown',
            manufacturer: item.manufacturer || 'Unknown',
            type: mappedType,
            specs: item.specs,
            isCustom: true,
            imageUrl: 'https://picsum.photos/800/600?random=' + Math.floor(Math.random() * 1000)
        };
    });

  } catch (error) {
    console.error("Gemini API Error:", error);
    return null;
  }
};

export const extractCoasterFromUrl = async (url: string): Promise<Partial<Coaster> | null> => {
  if (!genAI) return null;
  
  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: `Analyze the content associated with this specific URL: ${url}. 
      Extract details for the primary roller coaster described on that page.
      If the page describes a park, extract the details for their newest or most major roller coaster.
      
      Map the manufacturer to one of: Intamin, B&M, RMC, Mack, Vekoma, GCI, Arrow, Premier Rides, S&S, Zierer, Gerstlauer, PTC, CCI, or Unknown.
      Map the type to one of: Steel, Wooden, Hybrid, Alpine, Family, Powered, Bobsled.

      Also try to find a representative image URL for this coaster (must be a direct image link if possible, e.g. jpg/png/webp).`,
      config: {
        tools: [{ googleSearch: {} }], 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
             found: { type: Type.BOOLEAN },
             name: { type: Type.STRING },
             park: { type: Type.STRING },
             country: { type: Type.STRING },
             manufacturer: { type: Type.STRING },
             type: { type: Type.STRING },
             imageUrl: { type: Type.STRING, description: "Direct URL to an image of the coaster" },
          },
          required: ['found']
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    const data = JSON.parse(text);
    
    if (data.found && data.name) {
       let mappedType = CoasterType.Steel;
        if (Object.values(CoasterType).includes(data.type as CoasterType)) {
            mappedType = data.type as CoasterType;
        }

       return {
          name: data.name,
          park: data.park || 'Unknown Park',
          country: data.country || 'Unknown',
          manufacturer: data.manufacturer || 'Unknown',
          type: mappedType,
          isCustom: true,
          imageUrl: data.imageUrl || undefined
       };
    }
    return null;

  } catch (error) {
    console.error("URL Extraction Error:", error);
    return null;
  }
};

export const generateAppIcon = async (prompt: string): Promise<string | null> => {
  if (!genAI) return null;
  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt + " Funny vector sticker app icon, white background, high contrast." }],
      },
    });
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    return null;
  }
};

export const findNearbyParks = async (lat: number, lng: number): Promise<{ text: string, groundingChunks?: any[] } | null> => {
  if (!genAI) return null;
  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: "Find 3 closest amusement parks or theme parks near this location. Briefly list them with distance and current status (Open/Closed) if available.",
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: { latitude: lat, longitude: lng }
          }
        }
      },
    });
    
    return {
        text: response.text || "No parks found nearby.",
        groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    };
  } catch (error) {
    console.error("Gemini Maps Error:", error);
    return null;
  }
};
