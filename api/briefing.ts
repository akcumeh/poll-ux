import type { VercelRequest, VercelResponse } from '@vercel/node';
import { serviceDb } from './_lib/db.js';
import { getPol } from './_lib/pols.js';
import { generateGrounded } from './_lib/gemini.js';
import { BRIEFING_TTL_MS } from '../src/lib/constants.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        res.status(405).json({ ok: false, error: 'method_not_allowed' });
        return;
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const politicianId = typeof body.politicianId === 'string' ? body.politicianId : '';
    const pol = getPol(politicianId);
    if (!pol) {
        res.status(400).json({ ok: false, error: 'bad_request', message: 'Unknown politician' });
        return;
    }

    const db = serviceDb();

    const { data: cached } = await db
        .from('poll_ai_insights')
        .select('briefing, briefing_at')
        .eq('politician_id', politicianId)
        .maybeSingle();

    if (
        cached?.briefing &&
        cached.briefing_at &&
        Date.now() - new Date(cached.briefing_at).getTime() < BRIEFING_TTL_MS
    ) {
        console.log(`briefing cache hit for ${politicianId}`);
        res.status(200).json({ ok: true, briefing: cached.briefing, generatedAt: cached.briefing_at });
        return;
    }

    const prompt = `Write a current, factual, strictly neutral briefing on the Nigerian politician ${pol.name} (${pol.role}, ${pol.party}, ${pol.state} State), grounded in recent search results. Cover, in flowing prose without headings or bullet points, in at most 130 words: their current role and status, the most recent major news or political activity around them, and the main debates or challenges they currently face. Do not praise or condemn. Do not predict election outcomes. Do not invent approval numbers. Plain text only.`;

    try {
        const text = (await generateGrounded(prompt)).trim();
        const generatedAt = new Date().toISOString();
        const { error } = await db.from('poll_ai_insights').upsert({
            politician_id: politicianId,
            briefing: text,
            briefing_at: generatedAt,
        }, { onConflict: 'politician_id', ignoreDuplicates: false });
        if (error) {
            console.error('briefing upsert failed:', error.message);
        }
        console.log(`briefing generated for ${politicianId}`);
        res.status(200).json({ ok: true, briefing: text, generatedAt });
    } catch (err) {
        console.warn('briefing generation failed:', String(err));
        if (cached?.briefing) {
            res.status(200).json({ ok: true, briefing: cached.briefing, generatedAt: cached.briefing_at, stale: true });
            return;
        }
        res.status(503).json({ ok: false, error: 'unavailable' });
    }
}
