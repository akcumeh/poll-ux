import { db } from '../lib/supabase.js';
import { getCm, saveCm } from '../lib/storage.js';
import { refresh } from '../ui/nav.js';
export function subscribeRealtime() {
    db.channel('pollux_live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_user_votes' }, () => {
        // Someone else voted — re-fetch global counts so all devices stay in sync
        import('../api/votes.js').then(({ loadFromSupabase }) => loadFromSupabase());
    })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'poll_comments' }, (payload) => {
        // Someone posted a comment — show it live
        const row = payload.new;
        if (!row || !row.politician_id)
            return;
        const cm = getCm();
        if (!cm[row.politician_id])
            cm[row.politician_id] = [];
        const alreadyHere = cm[row.politician_id].some(c => c.id === row.id);
        if (!alreadyHere) {
            cm[row.politician_id].push({
                id: row.id,
                voter: row.handle,
                text: row.comment_text,
                sentiment: row.direction ?? 'neutral',
                ts: new Date(row.created_at).getTime()
            });
            saveCm(cm);
            refresh();
        }
    })
        .subscribe();
}
