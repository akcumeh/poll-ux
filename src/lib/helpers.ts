import type { PctResult } from '../types.js';
import { getCm } from '../lib/storage.js';

export function fmt(n: number): string {
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return String(n);
}

// Tri-state shares of all active votes. Support and oppose round normally;
// undecided takes the remainder so the three always sum to 100.
export function pct(s: number, o: number, u: number): PctResult {
    const t = s + o + u;
    if (!t) return { sp: 0, op: 0, up: 0 };
    const sp = Math.round(s / t * 100);
    const op = Math.round(o / t * 100);
    const up = Math.max(0, 100 - sp - op);
    return { sp, op, up };
}

export function ini(name: string): string {
    return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export function timeAgo(ts: number): string {
    const d = Date.now() - ts;
    if (d < 60000) return 'just now';
    if (d < 3600000) return Math.floor(d / 60000) + 'm ago';
    if (d < 86400000) return Math.floor(d / 3600000) + 'h ago';
    return Math.floor(d / 86400000) + 'd ago';
}

export function tagClass(p: string): string {
    return ({ APC: 'apc', PDP: 'pdp', 'Labour': 'lp', 'Labour Party': 'lp', NNPP: 'nnpp', APGA: 'apga', ADC: 'adc' } as Record<string, string>)[p] || 'indep';
}

const PARTY_COLORS: Record<string, string> = {
    APC: '#84cc16',
    PDP: '#ef4444',
    Labour: '#f59e0b',
    'Labour Party': '#f59e0b',
    NNPP: '#a78bfa',
    APGA: '#14b8a6',
    ADC: '#3b82f6',
    Independent: '#9ca3af',
};

export function partyColor(party: string): string {
    return PARTY_COLORS[party] || '#9ca3af';
}

export function escHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function totalComments(): number {
    const cm = getCm();
    return Object.values(cm).reduce((a, arr) => a + (arr ? arr.filter(c => c.status === 'approved').length : 0), 0);
}
