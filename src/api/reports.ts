import { callApi } from '../lib/apiClient.js';
import { getUID } from '../lib/storage.js';
import { LIVE } from '../lib/live.js';
import { refresh } from '../ui/nav.js';

export async function reportComment(commentId: string): Promise<void> {
    if (LIVE.reported[commentId]) return;
    LIVE.reported[commentId] = true;
    refresh();
    await callApi('report-comment', { uid: getUID(), commentId });
}
