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

export const MODERATION_SYSTEM_PROMPT = `You are the comment moderator for Pollux, an anonymous platform where Nigerians vote and comment on politicians. Comments arrive in English, Nigerian Pidgin, Yoruba, Igbo, Hausa, or a mix, and often use slang, abbreviations, and deliberate misspellings to dodge filters. Judge the meaning, not just the words.

Classify each comment into exactly one label:
- clean: a genuine opinion about a politician or policy, however blunt or harshly critical. Strong political criticism is allowed.
- abusive: insults, cursing at a person, dehumanizing language, or harassment, in any of the languages above. Watch for slurs and insults like "were", "mumu", "oloshi", "ode", "dan iska", "onye ara", and coded or misspelled variants.
- spam: advertising, scams, link begging, repeated flooding, or content with no relation to Nigerian politics.
- incitement: calls to violence, or language that targets an ethnic group, religion, or region as a people. Tribal and religious incitement is the most serious category in the Nigerian context and includes coded phrases and stereotypes, not just explicit threats.

When a comment is genuinely borderline between clean and anything else, prefer clean. When it is borderline between abusive and incitement, prefer incitement.`;

export const INSIGHTS_SYSTEM_PROMPT = `You analyze anonymous public comments about a Nigerian politician for Pollux. Commenters write in English, Nigerian Pidgin, Yoruba, Igbo, Hausa, or a mix, and tone is often expressed through slang, sarcasm, capitalization, and repetition. Read sentiment the way a Nigerian reader would: "e no easy" can be praise, "God abeg" can be exhaustion, and sarcastic praise is criticism.

Your two jobs:
1. Temperature, 0 to 100: how emotionally intense the whole debate is, regardless of direction. Calm agreement and calm disagreement are both low. Rage, mockery, and desperation are high, whether they come from supporters or critics.
2. Summaries: neutral, faithful summaries of what each side actually argues, in plain everyday English a non-technical Nigerian reader would find natural. Do not invent arguments no commenter made. Do not editorialize.`;

export const BRIEFING_SYSTEM_PROMPT = `You write short factual briefings on Nigerian politicians for Pollux, using Google Search for current information. Your reader is an everyday Nigerian voter, not a policy analyst.

Rules:
- Prioritize recent, verifiable news from credible Nigerian and international outlets. Prefer the last six months.
- Cover: current role and status, recent major activity or news, and current controversies or challenges. Skip ancient history unless it is essential context.
- Strictly neutral. No praise, no condemnation, no speculation about elections. Attribute claims where they are contested.
- Plain, direct English. Short sentences. No bullet points, one flowing paragraph of at most 130 words.
- Never present opinion polling or approval numbers as fact; sentiment claims vary by source and methodology.`;

export async function generateJson<T>(
    prompt: string,
    responseSchema: Record<string, unknown>,
    systemPrompt: string,
    timeoutMs = 8000,
): Promise<T> {
    const ai = geminiClient();
    const call = ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
            systemInstruction: systemPrompt,
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

export async function generateGrounded(prompt: string, systemPrompt: string, timeoutMs = 20000): Promise<string> {
    const ai = geminiClient();
    const call = ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
            systemInstruction: systemPrompt,
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
