import type { VercelRequest, VercelResponse } from '@vercel/node';
import { serviceDb } from './_lib/db.js';
import { getPol } from './_lib/pols.js';
import { generateJson, INSIGHTS_SYSTEM_PROMPT } from './_lib/gemini.js';
import { MIN_COMMENTS_AI, INSIGHTS_TTL_MS, INSIGHTS_NEW_COMMENT_TRIGGER } from '../src/lib/constants.js';

interface InsightOut {
    temperature: number;
    dominantEmotions: string[];
    summary: string;
    digestSupport: string;
    digestOppose: string;
}

const SCHEMA = {
    type: 'object',
    properties: {
        temperature: { type: 'integer', minimum: 0, maximum: 100 },
        dominantEmotions: { type: 'array', items: { type: 'string' }, maxItems: 4 },
        summary: { type: 'string' },
        digestSupport: { type: 'string' },
        digestOppose: { type: 'string' },
    },
    required: ['temperature', 'dominantEmotions', 'summary', 'digestSupport', 'digestOppose'],
};

function rowToPayload(row: Record<string, unknown> | null, commentCount: number) {
    if (!row || row.computed_at === null) {
        return { ok: true, insufficient: commentCount < MIN_COMMENTS_AI, commentCount, insights: null };
    }
    return {
        ok: true,
        insufficient: false,
        commentCount,
        insights: {
            temperature: row.temperature,
            emotions: row.emotions ?? [],
            tempSummary: row.temp_summary,
            digestSupport: row.digest_support,
            digestOppose: row.digest_oppose,
            computedAt: row.computed_at,
        },
    };
}

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

    const { count } = await db
        .from('poll_comments')
        .select('id', { count: 'exact', head: true })
        .eq('politician_id', politicianId)
        .eq('status', 'approved');
    const commentCount = count ?? 0;

    const { data: cached } = await db
        .from('poll_ai_insights')
        .select('*')
        .eq('politician_id', politicianId)
        .maybeSingle();

    if (commentCount < MIN_COMMENTS_AI) {
        res.status(200).json({ ok: true, insufficient: true, commentCount, insights: null });
        return;
    }

    if (cached?.computed_at) {
        const unchanged = commentCount === (cached.comment_count_at_compute ?? -1);
        const age = Date.now() - new Date(cached.computed_at).getTime();
        const bigDelta = Math.abs(commentCount - (cached.comment_count_at_compute ?? 0)) >= INSIGHTS_NEW_COMMENT_TRIGGER;
        if (unchanged || (age < INSIGHTS_TTL_MS && !bigDelta)) {
            console.log(`insights cache hit for ${politicianId}`);
            res.status(200).json(rowToPayload(cached, commentCount));
            return;
        }
    }

    const { data: comments } = await db
        .from('poll_comments')
        .select('comment_text, direction')
        .eq('politician_id', politicianId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(80);

    const lines = (comments ?? []).map(c => {
        const stance = c.direction === 's' ? 'supporter' : c.direction === 'o' ? 'critic' : 'undecided';
        return `[${stance}] ${String(c.comment_text).replaceAll('\n', ' ')}`;
    });

    const prompt = `These are anonymous public comments about ${pol.name} (${pol.role}, ${pol.party}). Each is prefixed with the commenter's declared stance.

Return strict JSON with:
- temperature: 0 to 100, the emotional intensity of this debate.
- dominantEmotions: 2 to 4 lowercase single words, for example frustration, hope, anger, pride.
- summary: one or two neutral sentences describing the character of the debate.
- digestSupport: what supporters mainly argue, maximum 80 words. If supporters are absent, say so plainly.
- digestOppose: what critics mainly argue, maximum 80 words. If critics are absent, say so plainly.

Comments:
${lines.join('\n')}`;

    try {
        const out = await generateJson<InsightOut>(prompt, SCHEMA, INSIGHTS_SYSTEM_PROMPT, 15000);
        const row = {
            politician_id: politicianId,
            temperature: Math.max(0, Math.min(100, Math.round(out.temperature))),
            emotions: out.dominantEmotions.slice(0, 4),
            temp_summary: out.summary,
            digest_support: out.digestSupport,
            digest_oppose: out.digestOppose,
            comment_count_at_compute: commentCount,
            computed_at: new Date().toISOString(),
        };
        const { error } = await db.from('poll_ai_insights').upsert(row);
        if (error) {
            console.error('insights upsert failed:', error.message);
        }
        console.log(`insights recomputed for ${politicianId} from ${commentCount} comments`);
        res.status(200).json(rowToPayload(row as unknown as Record<string, unknown>, commentCount));
    } catch (err) {
        console.warn('insights generation failed, serving cache:', String(err));
        res.status(200).json(rowToPayload(cached ?? null, commentCount));
    }
}
