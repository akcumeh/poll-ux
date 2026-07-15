import { db } from '../lib/supabase.js';
import { getC, saveC, getCm, saveCm } from '../lib/storage.js';
import { refreshInsights } from './insights.js';
import { refresh } from '../ui/nav.js';

export function subscribeRealtime(): void {
    db.channel('pollux_live')
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'poll_votes' },
            (payload: { new: { politician_id?: string; support_count?: number; oppose_count?: number; undecided_count?: number } }) => {
                const row = payload.new;
                if (!row || !row.politician_id) return;
                const c = getC();
                c[row.politician_id] = {
                    s: row.support_count || 0,
                    o: row.oppose_count || 0,
                    u: row.undecided_count || 0,
                };
                saveC(c);
                refresh();
            }
        )
        .on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'poll_comments' },
            (payload: { new: { politician_id?: string; id?: string | number; handle?: string; comment_text?: string; direction?: string | null; created_at?: string; status?: string } }) => {
                const row = payload.new;
                if (!row || !row.politician_id) return;
                if (row.status && row.status !== 'approved') return;
                const cm = getCm();
                if (!cm[row.politician_id]) cm[row.politician_id] = [];
                const id = String(row.id);
                if (!cm[row.politician_id].some(c => c.id === id)) {
                    cm[row.politician_id].push({
                        id,
                        voter: row.handle || 'Anonymous_Voter',
                        text: row.comment_text || '',
                        sentiment: (row.direction as import('../types.js').VoteDirection | null) ?? 'neutral',
                        ts: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
                        status: 'approved',
                    });
                    saveCm(cm);
                    refresh();
                    refreshInsights(row.politician_id, true);
                }
            }
        )
        .subscribe();
}
