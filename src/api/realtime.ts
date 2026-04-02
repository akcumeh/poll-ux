import { db } from '../lib/supabase.js';
import { getC, saveC, getCm, saveCm } from '../lib/storage.js';
import { refresh } from '../ui/nav.js';

export function subscribeRealtime(): void {
    db.channel('pollux_live')
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'poll_votes' },
            (payload: { new: { politician_id?: string; support_count?: number; oppose_count?: number } }) => {
                // Someone else voted — update the counts on screen instantly
                const row = payload.new;
                if (!row || !row.politician_id) return;
                const c = getC();
                c[row.politician_id] = { s: row.support_count || 0, o: row.oppose_count || 0 };
                saveC(c);
                refresh();
            }
        )
        .on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'poll_comments' },
            (payload: { new: { politician_id?: string; id?: string; handle?: string; comment_text?: string; direction?: string | null; created_at?: string } }) => {
                // Someone posted a comment — show it live
                const row = payload.new;
                if (!row || !row.politician_id) return;
                const cm = getCm();
                if (!cm[row.politician_id]) cm[row.politician_id] = [];
                const alreadyHere = cm[row.politician_id].some(c => c.id === row.id);
                if (!alreadyHere) {
                    cm[row.politician_id].push({
                        id: row.id!,
                        voter: row.handle!,
                        text: row.comment_text!,
                        sentiment: (row.direction as import('../types.js').VoteDirection | null) ?? 'neutral',
                        ts: new Date(row.created_at!).getTime()
                    });
                    saveCm(cm);
                    refresh();
                }
            }
        )
        .subscribe();
}
