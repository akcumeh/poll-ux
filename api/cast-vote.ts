import type { VercelRequest, VercelResponse } from '@vercel/node';
import { serviceDb } from './_lib/db.js';
import { getPol } from './_lib/pols.js';
import { VOTE_COOLDOWN_SECONDS, DAILY_ACTION_CEILING } from '../src/lib/constants.js';

const ZONES = ['Southwest', 'Southeast', 'South-South', 'Northwest', 'Northeast', 'North Central'];

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        res.status(405).json({ ok: false, error: 'method_not_allowed' });
        return;
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const uid = typeof body.uid === 'string' ? body.uid.slice(0, 64) : '';
    const politicianId = typeof body.politicianId === 'string' ? body.politicianId : '';
    const direction = body.direction;
    const state = typeof body.state === 'string' ? body.state.slice(0, 32) : null;
    const zone = typeof body.zone === 'string' && ZONES.includes(body.zone) ? body.zone : null;

    if (!uid || uid.length < 8) {
        res.status(400).json({ ok: false, error: 'bad_request', message: 'Missing uid' });
        return;
    }
    if (!getPol(politicianId)) {
        res.status(400).json({ ok: false, error: 'bad_request', message: 'Unknown politician' });
        return;
    }
    if (direction !== null && direction !== 's' && direction !== 'o' && direction !== 'u') {
        res.status(400).json({ ok: false, error: 'bad_request', message: 'direction must be s, o, u, or null to retract' });
        return;
    }

    const db = serviceDb();
    const now = Date.now();

    const since = new Date(now - VOTE_COOLDOWN_SECONDS * 1000).toISOString();
    const { data: recent } = await db
        .from('poll_vote_actions')
        .select('created_at')
        .eq('user_id', uid)
        .eq('politician_id', politicianId)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(1);

    if (recent && recent.length > 0) {
        const last = new Date(recent[0].created_at).getTime();
        const retryAfterSeconds = Math.max(1, Math.ceil((last + VOTE_COOLDOWN_SECONDS * 1000 - now) / 1000));
        res.status(429).json({ ok: false, error: 'cooldown', retryAfterSeconds });
        return;
    }

    const dayStart = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await db
        .from('poll_vote_actions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', uid)
        .gte('created_at', dayStart);

    if ((count ?? 0) >= DAILY_ACTION_CEILING) {
        res.status(429).json({ ok: false, error: 'daily_limit', retryAfterSeconds: 3600 });
        return;
    }

    let action: string;
    if (direction === null) {
        const { error } = await db
            .from('poll_user_votes')
            .delete()
            .eq('user_id', uid)
            .eq('politician_id', politicianId);
        if (error) {
            res.status(500).json({ ok: false, error: 'unknown' });
            return;
        }
        action = 'retract';
    } else {
        const { error } = await db
            .from('poll_user_votes')
            .upsert(
                { user_id: uid, politician_id: politicianId, direction, state, zone },
                { onConflict: 'user_id,politician_id' },
            );
        if (error) {
            res.status(500).json({ ok: false, error: 'unknown' });
            return;
        }
        action = String(direction);
    }

    await db.from('poll_vote_actions').insert({ user_id: uid, politician_id: politicianId, action });

    const { data: agg } = await db
        .from('poll_votes')
        .select('support_count, oppose_count, undecided_count')
        .eq('politician_id', politicianId)
        .maybeSingle();

    res.status(200).json({
        ok: true,
        counts: {
            s: agg?.support_count ?? 0,
            o: agg?.oppose_count ?? 0,
            u: agg?.undecided_count ?? 0,
        },
    });
}
