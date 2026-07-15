import type { VoteDirection, Comment } from '../types.js';
import { callApi } from '../lib/apiClient.js';
import { getUV, getCm, saveCm, getHeld, saveHeld, getHandle, getUID } from '../lib/storage.js';
import { COMMENT_MAX_LENGTH, HELD_VISIBLE_MS } from '../lib/constants.js';
import { LIVE } from '../lib/live.js';
import { refreshInsights } from './insights.js';
import { showToast } from '../ui/toast.js';
import { refresh } from '../ui/nav.js';

export async function submitComment(pid: string, text: string): Promise<void> {
    if (!text || !text.trim()) return;
    const uv = getUV();
    const handle = getHandle();
    const commentText = text.trim().slice(0, COMMENT_MAX_LENGTH);
    const rawVote = uv[pid] as VoteDirection | undefined;
    const sentiment: VoteDirection | 'neutral' = rawVote ?? 'neutral';

    const tempId = 'pending_' + Date.now();
    const pending: Comment = {
        id: tempId,
        voter: handle,
        text: commentText,
        sentiment,
        ts: Date.now(),
        status: 'pending',
        mine: true,
    };
    const cm = getCm();
    if (!cm[pid]) cm[pid] = [];
    cm[pid].push(pending);
    saveCm(cm);
    refresh();

    const removePending = () => {
        const store = getCm();
        const arr = store[pid] || [];
        const idx = arr.findIndex(c => c.id === tempId);
        if (idx >= 0) {
            arr.splice(idx, 1);
            saveCm(store);
        }
        return { store, arr };
    };

    try {
        const { ok, data } = await callApi<{ id: string; status: string; createdAt: string }>('moderate-comment', {
            uid: getUID(),
            politicianId: pid,
            handle,
            text: commentText,
            direction: sentiment === 'neutral' ? null : sentiment,
        });

        if (!ok || !data) {
            removePending();
            showToast('Comment not posted', 'The server could not be reached. Please try again.');
            refresh();
            return;
        }

        const comment: Comment = {
            id: String(data.id),
            voter: handle,
            text: commentText,
            sentiment,
            ts: data.createdAt ? new Date(data.createdAt).getTime() : Date.now(),
            status: data.status === 'held' ? 'held' : data.status === 'pending' ? 'pending' : 'approved',
            mine: true,
        };

        const { store, arr } = removePending();
        if (!arr.some(c => c.id === comment.id)) {
            arr.push(comment);
            saveCm(store);
        }

        if (comment.status === 'held') {
            const held = getHeld();
            if (!held[pid]) held[pid] = [];
            held[pid].push(comment);
            saveHeld(held);
            LIVE.commentBlocked[pid] = Date.now() + 60 * 1000;
        } else if (comment.status === 'approved') {
            refreshInsights(pid, true);
        } else {
            pollPendingComment(pid, comment.id);
        }
        refresh();
    } catch (err) {
        console.warn('Comment submit failed:', err);
        removePending();
        showToast('Comment not posted', 'The server could not be reached. Please try again.');
        refresh();
    }
}

const PENDING_POLL_MS = 20 * 1000;
const PENDING_POLL_MAX_TRIES = 15;

function pollPendingComment(pid: string, commentId: string, tries = 0): void {
    if (tries >= PENDING_POLL_MAX_TRIES) return;
    window.setTimeout(async () => {
        const { ok, data } = await callApi<{ statuses: Record<string, string> }>('comment-status', {
            uid: getUID(),
            ids: [commentId],
        });
        const status = ok && data ? data.statuses[commentId] : undefined;

        if (status === 'approved') {
            const cm = getCm();
            const c = (cm[pid] || []).find(x => x.id === commentId);
            if (c) {
                c.status = 'approved';
                saveCm(cm);
                refreshInsights(pid, true);
                refresh();
            }
            return;
        }

        if (status === 'held') {
            const cm = getCm();
            const arr = cm[pid] || [];
            const idx = arr.findIndex(x => x.id === commentId);
            const c = idx >= 0 ? arr[idx] : null;
            if (idx >= 0) {
                arr.splice(idx, 1);
                saveCm(cm);
            }
            if (c) {
                c.status = 'held';
                const held = getHeld();
                if (!held[pid]) held[pid] = [];
                held[pid].push(c);
                saveHeld(held);
                LIVE.commentBlocked[pid] = Date.now() + 60 * 1000;
                refresh();
            }
            return;
        }

        pollPendingComment(pid, commentId, tries + 1);
    }, PENDING_POLL_MS);
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
