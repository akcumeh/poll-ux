import type { VoteDirection, Comment } from '../types.js';
import { callApi } from '../lib/apiClient.js';
import { getUV, getCm, saveCm, getHeld, saveHeld, getHandle, getUID } from '../lib/storage.js';
import { COMMENT_MAX_LENGTH, HELD_VISIBLE_MS } from '../lib/constants.js';
import { showToast } from '../ui/toast.js';
import { refresh } from '../ui/nav.js';

export async function submitComment(pid: string, text: string): Promise<void> {
    if (!text || !text.trim()) return;
    const uv = getUV();
    const handle = getHandle();
    const commentText = text.trim().slice(0, COMMENT_MAX_LENGTH);
    const rawVote = uv[pid] as VoteDirection | undefined;
    const sentiment: VoteDirection | 'neutral' = rawVote ?? 'neutral';

    showToast('Comment submitted', 'A quick automated check runs before it goes live.');

    try {
        const { ok, data } = await callApi<{ id: string; status: string; createdAt: string }>('moderate-comment', {
            uid: getUID(),
            politicianId: pid,
            handle,
            text: commentText,
            direction: sentiment === 'neutral' ? null : sentiment,
        });

        if (!ok || !data) {
            showToast('Comment not posted', 'The server could not be reached. Please try again.');
            return;
        }

        const comment: Comment = {
            id: String(data.id),
            voter: handle,
            text: commentText,
            sentiment,
            ts: data.createdAt ? new Date(data.createdAt).getTime() : Date.now(),
            status: data.status === 'held' ? 'held' : 'approved',
            mine: true,
        };

        const cm = getCm();
        if (!cm[pid]) cm[pid] = [];
        if (!cm[pid].some(c => c.id === comment.id)) cm[pid].push(comment);
        saveCm(cm);

        if (comment.status === 'held') {
            const held = getHeld();
            if (!held[pid]) held[pid] = [];
            held[pid].push(comment);
            saveHeld(held);
        }
        refresh();
    } catch (err) {
        console.warn('Comment submit failed:', err);
        showToast('Comment not posted', 'The server could not be reached. Please try again.');
    }
}

export function purgeExpiredHeld(pid: string): number {
    const cutoff = Date.now() - HELD_VISIBLE_MS;
    const cm = getCm();
    const held = getHeld();
    let changed = false;
    let nextExpiry = 0;

    const keep = (c: Comment): boolean => {
        if (c.status !== 'held') {
            return true;
        }
        if (c.ts <= cutoff) {
            changed = true;
            return false;
        }
        const remaining = c.ts - cutoff;
        if (!nextExpiry || remaining < nextExpiry) {
            nextExpiry = remaining;
        }
        return true;
    };

    if (cm[pid]) {
        cm[pid] = cm[pid].filter(keep);
    }
    if (held[pid]) {
        held[pid] = held[pid].filter(c => c.ts > cutoff);
    }
    if (changed) {
        saveCm(cm);
        saveHeld(held);
    }
    return nextExpiry;
}
