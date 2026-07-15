import type { VercelRequest, VercelResponse } from '@vercel/node';
import { serviceDb } from './_lib/db.js';
import { getPol } from './_lib/pols.js';
import { classify, statusForLabel, sweepPending } from './_lib/moderation.js';
import { COMMENT_MAX_LENGTH } from '../src/lib/constants.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        res.status(405).json({ ok: false, error: 'method_not_allowed' });
        return;
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const uid = typeof body.uid === 'string' ? body.uid.slice(0, 64) : '';
    const politicianId = typeof body.politicianId === 'string' ? body.politicianId : '';
    const handle = typeof body.handle === 'string' ? body.handle.slice(0, 40) : 'Anonymous_Voter';
    const rawText = typeof body.text === 'string' ? body.text.trim() : '';
    const direction = body.direction === 's' || body.direction === 'o' || body.direction === 'u' ? body.direction : null;

    if (!uid || uid.length < 8) {
        res.status(400).json({ ok: false, error: 'bad_request', message: 'Missing uid' });
        return;
    }
    if (!getPol(politicianId)) {
        res.status(400).json({ ok: false, error: 'bad_request', message: 'Unknown politician' });
        return;
    }
    if (!rawText) {
        res.status(400).json({ ok: false, error: 'bad_request', message: 'Empty comment' });
        return;
    }

    const text = rawText.slice(0, COMMENT_MAX_LENGTH);
    const label = await classify(text);
    const status = statusForLabel(label);

    const db = serviceDb();
    const { data, error } = await db
        .from('poll_comments')
        .insert({
            politician_id: politicianId,
            user_id: uid,
            handle,
            comment_text: text,
            direction,
            status,
            moderation_label: label,
        })
        .select('id, created_at')
        .single();

    if (error || !data) {
        console.error('comment insert failed:', error?.message);
        res.status(500).json({ ok: false, error: 'unknown' });
        return;
    }

    res.status(200).json({
        ok: true,
        id: data.id,
        status,
        createdAt: data.created_at,
    });

    if (label !== null) {
        try {
            await sweepPending(5);
        } catch (err) {
            console.warn('opportunistic sweep failed:', String(err));
        }
    }
}
