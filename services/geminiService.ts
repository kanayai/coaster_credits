
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
      If the query is a theme park, return a list of its top 10 most popular current operating roller coasters.
      If the query is a specific coaster name, return that coaster's specific details.
      Include height (in feet), speed (in mph), and track length (in feet) if known.
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
