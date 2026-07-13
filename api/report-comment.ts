import type { VercelRequest, VercelResponse } from '@vercel/node';
import { serviceDb } from './_lib/db.js';
import { HOURLY_REPORT_CEILING } from '../src/lib/constants.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        res.status(405).json({ ok: false, error: 'method_not_allowed' });
        return;
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const uid = typeof body.uid === 'string' ? body.uid.slice(0, 64) : '';
    const commentId = typeof body.commentId === 'string' ? body.commentId.slice(0, 64) : '';
    const reason = typeof body.reason === 'string' ? body.reason.slice(0, 200) : null;

    if (!uid || uid.length < 8) {
        res.status(400).json({ ok: false, error: 'bad_request', message: 'Missing uid' });
        return;
    }
    if (!commentId) {
        res.status(400).json({ ok: false, error: 'bad_request', message: 'Missing commentId' });
        return;
    }

    const db = serviceDb();

    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await db
        .from('poll_reports')
        .select('id', { count: 'exact', head: true })
        .eq('reporter_uid', uid)
        .gte('created_at', hourAgo);

    if ((count ?? 0) >= HOURLY_REPORT_CEILING) {
        res.status(429).json({ ok: false, error: 'rate_limited' });
        return;
    }

    const { error } = await db
        .from('poll_reports')
        .upsert(
            { comment_id: commentId, reporter_uid: uid, reason },
            { onConflict: 'comment_id,reporter_uid', ignoreDuplicates: true },
        );

    if (error) {
        console.error('report insert failed:', error.message);
        res.status(500).json({ ok: false, error: 'unknown' });
        return;
    }

    res.status(200).json({ ok: true });
}
