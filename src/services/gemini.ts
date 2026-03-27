import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function transcribeAudio(base64Audio: string, mimeType: string) {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts", // Using a model that handles audio well, or gemini-3-flash-preview
    contents: [
      {
        parts: [
          { text: "Transcribe this audio message accurately. Return only the transcription." },
          { inlineData: { data: base64Audio, mimeType } }
        ]
      }
    ]
  });
  return response.text;
}

export async function convertMessage(text: string, targetStyle: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          { text: `Convert the following message into a ${targetStyle} style. Maintain the original meaning but adjust the tone and structure accordingly.\n\nMessage: ${text}` }
        ]
      }
    ]
  });
  return response.text;
}

export async function generateSpeech(text: string, voice: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr' = 'Zephyr') {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Say this: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voice },
        },
      },
    },
  });

  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
}
