import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "";

export interface ChannelInput {
  keywords: string;
  niche: string;
  tone: string;
  audience: string;
}

export interface NameSuggestion {
  name: string;
  reason: string;
  seoScore: number;
}

export interface SEOContent {
  description: string;
  about: string;
  keywords: string[];
  hashtags: string[];
}

export const generateChannelNames = async (input: ChannelInput): Promise<NameSuggestion[]> => {
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Generate 15 unique, catchy, and brandable YouTube channel names for a channel with the following details:
  Niche: ${input.niche}
  Keywords: ${input.keywords}
  Tone: ${input.tone}
  Target Audience: ${input.audience}
  
  The names should be SEO-friendly and short. Provide a brief reason for each name and an estimated SEO score (1-100).`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            reason: { type: Type.STRING },
            seoScore: { type: Type.NUMBER }
          },
          required: ["name", "reason", "seoScore"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("Failed to parse names", e);
    return [];
  }
};

export const checkAvailability = async (name: string): Promise<{
  youtube: 'available' | 'taken' | 'possible';
  google: 'available' | 'taken' | 'possible';
  social: 'available' | 'taken' | 'possible';
}> => {
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Check the availability of the YouTube channel name "${name}". 
  Search for existing YouTube channels, Google search results, and common social media handles (Instagram, Twitter/X, TikTok).
  Return a status for each category.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          youtube: { type: Type.STRING, enum: ["available", "taken", "possible"] },
          google: { type: Type.STRING, enum: ["available", "taken", "possible"] },
          social: { type: Type.STRING, enum: ["available", "taken", "possible"] }
        },
        required: ["youtube", "google", "social"]
      }
    }
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    return { youtube: 'possible', google: 'possible', social: 'possible' };
  }
};

export const generateSEO = async (name: string, input: ChannelInput): Promise<SEOContent> => {
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Generate SEO-optimized content for a YouTube channel named "${name}".
  Niche: ${input.niche}
  Keywords: ${input.keywords}
  Tone: ${input.tone}
  
  Provide:
  1. A compelling channel description (optimized for the algorithm).
  2. A professional "About" section.
  3. A list of 15-20 relevant keywords/tags.
  4. 10 trending hashtags.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING },
          about: { type: Type.STRING },
          keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          hashtags: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["description", "about", "keywords", "hashtags"]
      }
    }
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    return { description: "", about: "", keywords: [], hashtags: [] };
  }
};

export const generateLogo = async (name: string, niche: string, style: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `A professional, high-resolution logo for a YouTube channel named "${name}". 
  Niche: ${niche}. 
  Style: ${style}. 
  The logo should be modern, clean, and brandable. 
  Centered on a simple background, suitable for a profile picture. 
  No text if possible, or very minimal stylized text of the name.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ text: prompt }] },
    config: {
      imageConfig: {
        aspectRatio: "1:1",
        imageSize: "1K"
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image generated");
};

export const generateBanner = async (name: string, tagline: string, niche: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `A professional YouTube channel banner for "${name}". 
  Tagline: "${tagline}". 
  Niche: ${niche}. 
  The design must be mobile-friendly with all important elements (name and tagline) centered in the "safe area". 
  High resolution, cinematic lighting, modern aesthetic. 
  The background should reflect the ${niche} niche.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ text: prompt }] },
    config: {
      imageConfig: {
        aspectRatio: "16:9", // Closest to 2560x1440
        imageSize: "1K"
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image generated");
};

export const chatAssistant = async (history: { role: string, parts: { text: string }[] }[], message: string) => {
  const ai = new GoogleGenAI({ apiKey });
  const chat = ai.chats.create({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction: "You are a YouTube branding expert. Help users refine their channel identity, suggest content ideas, and improve their SEO.",
    },
    history
  });

  const response = await chat.sendMessage({ message });
  return response.text;
};
