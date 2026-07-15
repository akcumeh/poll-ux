import type { VercelRequest, VercelResponse } from '@vercel/node';
import { serviceDb } from './_lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        res.status(405).json({ ok: false, error: 'method_not_allowed' });
        return;
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const uid = typeof body.uid === 'string' ? body.uid.slice(0, 64) : '';
    const ids = Array.isArray(body.ids) ? body.ids.filter(id => typeof id === 'string').slice(0, 20) : [];

    if (!uid || ids.length === 0) {
        res.status(200).json({ ok: true, statuses: {} });
        return;
    }

    const db = serviceDb();
    const { data, error } = await db
        .from('poll_comments')
        .select('id, status')
        .eq('user_id', uid)
        .in('id', ids);

    if (error) {
        res.status(200).json({ ok: true, statuses: {} });
        return;
    }

    const statuses: Record<string, string> = {};
    (data ?? []).forEach(row => { statuses[String(row.id)] = row.status; });
    res.status(200).json({ ok: true, statuses });
}
