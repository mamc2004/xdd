
import { GoogleGenAI, Modality } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";

const getRelevantKnowledge = (prompt: string, files: any[], limit = 8) => {
  if (!files || files.length === 0) return [];
  const query = prompt.toLowerCase();
  const scoredFiles = files.map(file => {
    let score = 0;
    const fileName = file.name.toLowerCase();
    const keywords = query.split(' ').filter(k => k.length > 2);
    keywords.forEach(kw => {
      if (fileName.includes(kw)) score += 10;
    });
    return { ...file, score };
  });
  return scoredFiles.sort((a, b) => b.score - a.score).slice(0, limit);
};

export const callGeminiStream = async (
  prompt: string, 
  history: any[] = [], 
  knowledgeFiles: any[] = [],
  isPro: boolean = false,
  onChunk: (text: string, thinking?: string) => void
) => {
  // Always use process.env.API_KEY directly as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  
  const contents = history.map(h => ({
    role: h.role,
    parts: [
      ...(h.files ? h.files.map((f: any) => ({ inlineData: { mimeType: f.mimeType, data: f.data } })) : []),
      { text: h.text }
    ]
  }));

  const parts: any[] = [];
  const relevantFiles = getRelevantKnowledge(prompt, knowledgeFiles, 8);

  if (relevantFiles.length > 0) {
    let contextText = "NGỮ CẢNH TRI THỨC: \n";
    relevantFiles.forEach(f => { contextText += `- Tệp: ${f.name}\n`; });
    parts.push({ text: contextText });
    for (const file of relevantFiles) {
      parts.push({ inlineData: { mimeType: file.mimeType, data: file.data } });
    }
  }

  parts.push({ text: `Yêu cầu: ${prompt}` });
  contents.push({ role: 'user', parts: parts });

  try {
    const modelName = isPro ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
    const config: any = {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: isPro ? 0.7 : 0.1,
    };

    // Correctly configure thinkingBudget for Gemini 3 models
    if (isPro) config.thinkingConfig = { thinkingBudget: 32768 };
    else config.thinkingConfig = { thinkingBudget: 0 };

    const result = await ai.models.generateContentStream({
      model: modelName,
      contents: contents,
      config: config
    });

    let fullText = "";
    let fullThinking = "";

    for await (const chunk of result) {
      // Use .text property directly as per guidelines (not .text())
      if (chunk.text) {
        fullText += chunk.text;
      }
      
      // Extract thinking process if present in the candidates
      const chunkParts = chunk.candidates?.[0]?.content?.parts || [];
      for (const part of chunkParts) {
        if (part.thought) {
          fullThinking += part.thought;
        }
      }

      onChunk(fullText, fullThinking || undefined);
    }
    return fullText;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const generateTTS = async (text: string): Promise<string | undefined> => {
  // Always use process.env.API_KEY directly as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Đọc văn bản sau: ${text}` }] }],
      config: {
        // Fix: Changed responseModalalities to responseModalities
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (error) {
    console.error("TTS generation error:", error);
    return undefined;
  }
};

export function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
