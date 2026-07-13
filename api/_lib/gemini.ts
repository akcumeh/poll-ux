import { GoogleGenAI } from '@google/genai';

export const GEMINI_MODEL = 'gemini-2.5-flash';

export function geminiClient(): GoogleGenAI {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not set');
    }
    return new GoogleGenAI({ apiKey });
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
        promise,
        new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Gemini call timed out')), ms);
        }),
    ]);
}

export async function generateJson<T>(
    prompt: string,
    responseSchema: Record<string, unknown>,
    timeoutMs = 8000,
): Promise<T> {
    const ai = geminiClient();
    const call = ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema,
            temperature: 0.2,
        },
    });
    const result = await withTimeout(call, timeoutMs);
    const text = (result as { text?: string }).text;
    if (!text) {
        throw new Error('Empty Gemini response');
    }
    return JSON.parse(text) as T;
}

export async function generateGrounded(prompt: string, timeoutMs = 20000): Promise<string> {
    const ai = geminiClient();
    const call = ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }],
            temperature: 0.3,
        },
    });
    const result = await withTimeout(call, timeoutMs);
    const text = (result as { text?: string }).text;
    if (!text) {
        throw new Error('Empty Gemini response');
    }
    return text;
}
