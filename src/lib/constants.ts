export const MIN_VOTES_OVERALL = 10;
export const MIN_VOTES_ZONE = 5;
export const MIN_COMMENTS_AI = 5;

export const VOTE_COOLDOWN_SECONDS = 60;
export const DAILY_ACTION_CEILING = 150;
export const HOURLY_REPORT_CEILING = 20;

export const BRIEFING_REFRESH_SHOW_MS = 60 * 1000;

export function currentHourStart(): number {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    return d.getTime();
}

export const COMMENT_MAX_LENGTH = 280;
export const HELD_VISIBLE_MS = 60_000;
