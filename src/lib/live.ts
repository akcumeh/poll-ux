import type { ZoneStats, PolZoneStats, AiInsights } from '../types.js';

export const LIVE = {
    zoneStats: [] as ZoneStats[],
    polZoneStats: [] as PolZoneStats[],
    insights: {} as Record<string, AiInsights>,
    cooldowns: {} as Record<string, number>,
    commentBlocked: {} as Record<string, number>,
    reported: {} as Record<string, boolean>,
    loaded: false,
};

export function cooldownRemaining(pid: string): number {
    const until = LIVE.cooldowns[pid] || 0;
    return Math.max(0, Math.ceil((until - Date.now()) / 1000));
}

export function commentBlockRemaining(pid: string): number {
    const until = LIVE.commentBlocked[pid] || 0;
    return Math.max(0, Math.ceil((until - Date.now()) / 1000));
}
