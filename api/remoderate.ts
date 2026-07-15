import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sweepPending } from './_lib/moderation.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const secret = process.env.CRON_SECRET;
    if (secret) {
        const auth = req.headers.authorization;
        if (auth !== `Bearer ${secret}`) {
            res.status(401).json({ ok: false, error: 'unauthorized' });
            return;
        }
    }

    try {
        const result = await sweepPending(10);
        res.status(200).json({ ok: true, ...result });
    } catch (err) {
        console.error('remoderate sweep failed:', String(err));
        res.status(500).json({ ok: false, error: 'unknown' });
    }
}
