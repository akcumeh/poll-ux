import type { VoteDirection } from '../types.js';
import { db } from '../lib/supabase.js';
import { getC, saveC, getUV, saveUV, getUID } from '../lib/storage.js';
import { showToast } from '../ui/toast.js';
import { refresh } from '../ui/nav.js';

export async function loadFromSupabase(): Promise<void> {
    try {
        // Read aggregated counts from poll_votes (publicly readable)
        const { data: votes, error: ve } = await db.from('poll_votes').select('*');
        if (!ve && votes) {
            const c = getC();
            votes.forEach((row: { politician_id: string; support_count: number; oppose_count: number }) => {
                c[row.politician_id] = { s: row.support_count || 0, o: row.oppose_count || 0 };
            });
            saveC(c);
        }

        // Load this device's own votes (so buttons show as already voted)
        const { data: uVotes, error: uve } = await db
            .from('poll_user_votes').select('*').eq('user_id', getUID());
        if (!uve && uVotes) {
            const uv: Record<string, VoteDirection> = {};
            uVotes.forEach((row: { politician_id: string; direction: VoteDirection }) => {
                uv[row.politician_id] = row.direction;
            });
            saveUV(uv);
        }

        // Load all comments
        const { data: cmts, error: ce } = await db
            .from('poll_comments').select('*').order('created_at', { ascending: true });
        if (!ce && cmts) {
            const cm: Record<string, { id: string; voter: string; text: string; sentiment: string; ts: number }[]> = {};
            cmts.forEach((row: { politician_id: string; id: string; handle: string; comment_text: string; direction: string | null; created_at: string }) => {
                if (!cm[row.politician_id]) cm[row.politician_id] = [];
                cm[row.politician_id].push({
                    id: row.id,
                    voter: row.handle,
                    text: row.comment_text,
                    sentiment: row.direction || 'neutral',
                    ts: new Date(row.created_at).getTime()
                });
            });
            const { saveCm } = await import('../lib/storage.js');
            saveCm(cm as Parameters<typeof saveCm>[0]);
        }

        refresh();
    } catch (err) {
        console.warn('Could not load from Supabase — showing local data:', err);
        refresh();
    }
}

export async function castVote(pid: string, type: VoteDirection): Promise<void> {
    const c = getC(), uv = getUV(), prev = uv[pid];
    if (!c[pid]) c[pid] = { s: 0, o: 0 };

    // Step 1: Update instantly on THIS device (optimistic UI)
    const removing = prev === type;
    if (removing) {
        c[pid][type] = Math.max(0, c[pid][type] - 1);
        delete uv[pid];
        showToast('Vote removed', '#666');
    } else {
        if (prev) c[pid][prev] = Math.max(0, c[pid][prev] - 1);
        c[pid][type]++;
        uv[pid] = type;
        showToast(type === 's' ? 'Support recorded 👍' : 'Opposition recorded 👎', type === 's' ? '#84cc16' : '#ef4444');
    }
    saveC(c); saveUV(uv); refresh();

    // Step 2: Sync to Supabase via direct table writes (no RPC needed)
    try {
        const uid = getUID();
        if (removing) {
            // Delete the user's vote row
            await db.from('poll_user_votes')
                .delete()
                .eq('user_id', uid)
                .eq('politician_id', pid);
        } else {
            // Upsert the user's vote (handles both new votes and direction changes)
            await db.from('poll_user_votes').upsert(
                { user_id: uid, politician_id: pid, direction: type },
                { onConflict: 'user_id,politician_id' }
            );
        }
        // Fetch updated global counts from the server so local state reflects reality
        await loadFromSupabase();
    } catch (err) {
        console.warn('Vote saved locally but cloud sync failed:', err);
    }
}
