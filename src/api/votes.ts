import type { VoteDirection, Comment, CommentStore, ZoneStats, PolZoneStats, Zone } from '../types.js';
import { db } from '../lib/supabase.js';
import { callApi } from '../lib/apiClient.js';
import { getC, saveC, getUV, saveUV, getUID, getLV, saveLV, getRegion, getHeld, saveCm } from '../lib/storage.js';
import { LIVE } from '../lib/live.js';
import { VOTE_COOLDOWN_SECONDS } from '../lib/constants.js';
import { showToast } from '../ui/toast.js';
import { refresh } from '../ui/nav.js';

interface VoteRow { politician_id: string; support_count: number; oppose_count: number; undecided_count: number }
interface ZoneRow { zone: Zone; support_count: number; oppose_count: number; undecided_count: number; total: number }
interface PolZoneRow extends ZoneRow { politician_id: string }
interface CommentRow { id: string; politician_id: string; handle: string; comment_text: string; direction: string | null; created_at: string; user_id?: string }
interface InsightRow {
    politician_id: string; temperature: number | null; emotions: string[] | null;
    temp_summary: string | null; digest_support: string | null; digest_oppose: string | null;
    briefing: string | null; briefing_at: string | null; computed_at: string | null;
    comment_count_at_compute: number;
}

export async function loadFromSupabase(): Promise<void> {
    try {
        const uid = getUID();
        const [votes, uVotes, cmts, zones, polZones, insights] = await Promise.all([
            db.from('poll_votes').select('*'),
            db.from('poll_user_votes').select('politician_id, direction').eq('user_id', uid),
            db.from('poll_comments').select('*').order('created_at', { ascending: true }),
            db.from('poll_zone_stats').select('*'),
            db.from('poll_pol_zone_stats').select('*'),
            db.from('poll_ai_insights').select('*'),
        ]);

        if (!votes.error && votes.data) {
            const c = getC();
            (votes.data as VoteRow[]).forEach(row => {
                c[row.politician_id] = {
                    s: row.support_count || 0,
                    o: row.oppose_count || 0,
                    u: row.undecided_count || 0,
                };
            });
            saveC(c);
        }

        if (!uVotes.error && uVotes.data) {
            const uv: Record<string, VoteDirection> = {};
            (uVotes.data as { politician_id: string; direction: VoteDirection }[]).forEach(row => {
                uv[row.politician_id] = row.direction;
            });
            saveUV(uv);
        }

        if (!cmts.error && cmts.data) {
            const cm: CommentStore = {};
            (cmts.data as CommentRow[]).forEach(row => {
                if (!cm[row.politician_id]) cm[row.politician_id] = [];
                cm[row.politician_id].push({
                    id: String(row.id),
                    voter: row.handle,
                    text: row.comment_text,
                    sentiment: (row.direction as VoteDirection | null) ?? 'neutral',
                    ts: new Date(row.created_at).getTime(),
                    status: 'approved',
                });
            });
            const held = getHeld();
            Object.entries(held).forEach(([pid, list]) => {
                if (!list || !list.length) return;
                if (!cm[pid]) cm[pid] = [];
                const seen = new Set(cm[pid].map(c => c.id));
                (list as Comment[]).forEach(hc => { if (!seen.has(hc.id)) cm[pid].push(hc); });
                cm[pid].sort((a, b) => a.ts - b.ts);
            });
            saveCm(cm);
        }

        if (!zones.error && zones.data) {
            LIVE.zoneStats = (zones.data as ZoneRow[]).map(z => ({
                zone: z.zone, s: z.support_count, o: z.oppose_count, u: z.undecided_count, total: z.total,
            })) as ZoneStats[];
        }

        if (!polZones.error && polZones.data) {
            LIVE.polZoneStats = (polZones.data as PolZoneRow[]).map(z => ({
                politicianId: z.politician_id, zone: z.zone,
                s: z.support_count, o: z.oppose_count, u: z.undecided_count, total: z.total,
            })) as PolZoneStats[];
        }

        if (!insights.error && insights.data) {
            (insights.data as InsightRow[]).forEach(row => {
                LIVE.insights[row.politician_id] = {
                    politicianId: row.politician_id,
                    temperature: row.temperature,
                    emotions: (row.emotions as string[]) || [],
                    tempSummary: row.temp_summary,
                    digestSupport: row.digest_support,
                    digestOppose: row.digest_oppose,
                    briefing: row.briefing,
                    briefingAt: row.briefing_at ? new Date(row.briefing_at).getTime() : null,
                    computedAt: row.computed_at ? new Date(row.computed_at).getTime() : null,
                    commentCount: row.comment_count_at_compute || 0,
                };
            });
        }

        LIVE.loaded = true;
        refresh();
    } catch (err) {
        console.warn('Could not load from Supabase, showing local data:', err);
        LIVE.loaded = true;
        refresh();
    }
}

export async function castVote(pid: string, type: VoteDirection): Promise<void> {
    const c = getC(), uv = getUV(), lv = getLV(), prev = uv[pid];
    if (!c[pid]) c[pid] = { s: 0, o: 0, u: 0 };

    const last = lv[pid] || 0;
    const now = Date.now();
    if (now - last < VOTE_COOLDOWN_SECONDS * 1000) {
        LIVE.cooldowns[pid] = last + VOTE_COOLDOWN_SECONDS * 1000;
        refresh();
        return;
    }

    const removing = prev === type;
    const snapshot = { ...c[pid] };
    if (removing) {
        c[pid][type] = Math.max(0, c[pid][type] - 1);
        delete uv[pid];
        showToast('Vote retracted', 'Your vote was removed from the totals.');
    } else {
        if (prev) c[pid][prev] = Math.max(0, c[pid][prev] - 1);
        c[pid][type]++;
        uv[pid] = type;
        const label = type === 's' ? 'Support' : type === 'o' ? 'Opposition' : 'Undecided';
        showToast(label + ' recorded', 'Anonymous. You can change it anytime.');
    }
    lv[pid] = now;
    saveC(c); saveUV(uv); saveLV(lv); refresh();

    try {
        const region = getRegion();
        const { ok, data, error } = await callApi<{ counts: { s: number; o: number; u: number } }>('cast-vote', {
            uid: getUID(),
            politicianId: pid,
            direction: removing ? null : type,
            state: region?.state ?? null,
            zone: region?.zone ?? null,
        });

        if (!ok) {
            revertVote(pid, snapshot, prev);
            if (error?.error === 'cooldown' || error?.error === 'daily_limit') {
                const secs = error.retryAfterSeconds ?? VOTE_COOLDOWN_SECONDS;
                LIVE.cooldowns[pid] = Date.now() + secs * 1000;
            } else {
                showToast('Vote not saved', 'The server could not be reached. Please try again.');
            }
            refresh();
            return;
        }

        if (data?.counts) {
            const fresh = getC();
            fresh[pid] = { s: data.counts.s, o: data.counts.o, u: data.counts.u };
            saveC(fresh);
            refresh();
        }
    } catch (err) {
        console.warn('Vote sync failed:', err);
        revertVote(pid, snapshot, prev);
        showToast('Vote not saved', 'The server could not be reached. Please try again.');
        refresh();
    }
}

function revertVote(pid: string, counts: { s: number; o: number; u: number }, prev: VoteDirection | undefined): void {
    const c = getC(), uv = getUV(), lv = getLV();
    c[pid] = counts;
    if (prev) uv[pid] = prev; else delete uv[pid];
    saveC(c); saveUV(uv);
    delete lv[pid];
    saveLV(lv);
}
