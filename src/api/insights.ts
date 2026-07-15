import { callApi } from '../lib/apiClient.js';
import { LIVE } from '../lib/live.js';
import { refresh } from '../ui/nav.js';

const INSIGHTS_CLIENT_TTL_MS = 5 * 60 * 1000;
const insightsAskedAt: Record<string, number> = {};
const briefingPending: Record<string, boolean> = {};

interface InsightsResponse {
    ok: boolean;
    commentCount: number;
    insights: {
        temperature: number | null;
        emotions: string[];
        tempSummary: string | null;
        digestSupport: string | null;
        digestOppose: string | null;
        computedAt: string | null;
    } | null;
}

interface BriefingResponse {
    ok: boolean;
    briefing: string;
    generatedAt: string;
}

function blankInsights(pid: string) {
    return {
        politicianId: pid, temperature: null, emotions: [] as string[], tempSummary: null,
        digestSupport: null, digestOppose: null, briefing: null, briefingAt: null,
        computedAt: null, commentCount: 0,
    };
}

export async function refreshInsights(pid: string, force = false): Promise<void> {
    const asked = insightsAskedAt[pid] || 0;
    if (!force && Date.now() - asked < INSIGHTS_CLIENT_TTL_MS) return;
    insightsAskedAt[pid] = Date.now();

    const { ok, data } = await callApi<InsightsResponse>('ai-insights', { politicianId: pid });
    if (!ok || !data) return;

    const existing = LIVE.insights[pid] || blankInsights(pid);
    existing.commentCount = data.commentCount ?? existing.commentCount;
    if (data.insights) {
        existing.temperature = data.insights.temperature;
        existing.emotions = data.insights.emotions || [];
        existing.tempSummary = data.insights.tempSummary;
        existing.digestSupport = data.insights.digestSupport;
        existing.digestOppose = data.insights.digestOppose;
        existing.computedAt = data.insights.computedAt ? new Date(data.insights.computedAt).getTime() : null;
    }
    LIVE.insights[pid] = existing;
    refresh();
}

export async function fetchBriefing(pid: string): Promise<void> {
    if (briefingPending[pid]) return;
    briefingPending[pid] = true;

    const { ok, data } = await callApi<BriefingResponse>('briefing', { politicianId: pid });
    if (ok && data) {
        const existing = LIVE.insights[pid] || blankInsights(pid);
        existing.briefing = data.briefing;
        existing.briefingAt = data.generatedAt ? new Date(data.generatedAt).getTime() : Date.now();
        LIVE.insights[pid] = existing;
    }
    refresh();
    briefingPending[pid] = false;
}
