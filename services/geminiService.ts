import { GoogleGenAI, Type } from "@google/genai";
import { Coaster, CoasterType } from '../types';

let genAI: GoogleGenAI | null = null;

if (process.env.API_KEY) {
  genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
}

export const generateCoasterInfo = async (searchTerm: string): Promise<Partial<Coaster> | null> => {
  if (!genAI) {
    console.warn("Gemini API Key missing");
    return null;
  }

  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Find details for the roller coaster "${searchTerm}". Return null if not found or not a real coaster.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            found: { type: Type.BOOLEAN },
            name: { type: Type.STRING },
            park: { type: Type.STRING },
            country: { type: Type.STRING },
            manufacturer: { type: Type.STRING },
            type: { 
              type: Type.STRING, 
              enum: [
                'Steel', 'Wooden', 'Hybrid', 'Alpine', 'Family', 'Powered', 'Bobsled'
              ] 
            }
          },
          required: ['found']
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    
    const data = JSON.parse(text);
    
    if (!data.found) return null;

    // Map the string type back to our enum safely
    let mappedType = CoasterType.Steel;
    const typeStr = data.type as string;
    if (Object.values(CoasterType).includes(typeStr as CoasterType)) {
      mappedType = typeStr as CoasterType;
    }

    return {
      name: data.name,
      park: data.park,
      country: data.country,
      manufacturer: data.manufacturer,
      type: mappedType,
      isCustom: true,
      imageUrl: 'https://picsum.photos/800/600?random=' + Math.floor(Math.random() * 1000)
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    return null;
  }
};

export const generateAppIcon = async (prompt: string): Promise<string | null> => {
  if (!genAI) {
    console.warn("Gemini API Key missing");
    return null;
  }

  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { text: prompt + " The image should be a funny, simple vector art style sticker suitable for an app icon, white background." },
        ],
      },
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    return null;

  } catch (error) {
    console.error("Gemini Image Gen Error:", error);
    return null;
  }
};