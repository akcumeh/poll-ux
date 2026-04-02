import type { VoteDirection } from '../types.js';
import { db } from '../lib/supabase.js';
import { getUV, getCm, saveCm, getHandle, getUID } from '../lib/storage.js';
import { showToast } from '../ui/toast.js';
import { refresh } from '../ui/nav.js';

export async function addComment(pid: string, text: string): Promise<void> {
    if (!text || !text.trim()) return;
    const uv = getUV();
    const handle = getHandle();
    const commentText = text.trim().slice(0, 280);
    const rawVote = uv[pid] as VoteDirection | undefined;
    const sentiment: VoteDirection | 'neutral' = rawVote ?? 'neutral';

    // Step 1: Show on THIS device instantly
    const cm = getCm();
    if (!cm[pid]) cm[pid] = [];
    cm[pid].push({
        id: 'local_' + Date.now(),
        voter: handle,
        text: commentText,
        sentiment: sentiment,
        ts: Date.now()
    });
    saveCm(cm);
    showToast('Comment posted ✓', '#84cc16');
    refresh();

    // Step 2: Save to Supabase so everyone sees it
    try {
        await db.from('poll_comments').insert({
            politician_id: pid,
            user_id: getUID(),
            handle: handle,
            comment_text: commentText,
            direction: sentiment === 'neutral' ? null : sentiment
        });
    } catch (err) {
        console.warn('Comment saved locally but cloud sync failed:', err);
    }
}
