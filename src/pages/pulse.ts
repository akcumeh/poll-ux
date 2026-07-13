import { getC } from '../lib/storage.js';
import { fmt, pct } from '../lib/helpers.js';
import { MIN_VOTES_OVERALL } from '../lib/constants.js';
import { db } from '../lib/supabase.js';
import { POLS } from '../data/politicians.js';
import { avatar } from '../ui/card.js';

type Period = 'day' | 'week' | 'month';

let period: Period = 'week';
let rows: { politician_id: string; direction: string; updated_at: string }[] = [];
let fetchedAt = 0;
let loading = false;

const REFRESH_MS = 60 * 1000;

function periodStart(p: Period): number {
    const d = new Date();
    if (p === 'day') {
        d.setHours(0, 0, 0, 0);
    } else if (p === 'week') {
        const day = d.getDay();
        d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
        d.setHours(0, 0, 0, 0);
    } else {
        d.setDate(1);
        d.setHours(0, 0, 0, 0);
    }
    return d.getTime();
}

export function setPulse(p: Period, btn: HTMLElement): void {
    period = p;
    document.querySelectorAll('.pulse-tab').forEach(b => b.classList.remove('on'));
    if (btn) btn.classList.add('on');
    rPulse();
}

async function fetchActivity(): Promise<void> {
    if (loading) return;
    loading = true;
    try {
        const since = new Date(periodStart('month')).toISOString();
        const { data, error } = await db
            .from('poll_user_votes')
            .select('politician_id, direction, updated_at')
            .gte('updated_at', since)
            .limit(10000);
        if (!error && data) {
            rows = data;
            fetchedAt = Date.now();
        }
    } catch (err) {
        console.warn('Pulse fetch failed:', err);
    } finally {
        loading = false;
        render();
    }
}

export function rPulse(): void {
    if (Date.now() - fetchedAt > REFRESH_MS) {
        fetchActivity();
        if (!fetchedAt) return renderLoading();
    }
    render();
}

function renderLoading(): void {
    const el = document.getElementById('pulse-body');
    if (el) el.innerHTML = `<p class="pulse-loading">Loading server side vote activity</p>`;
}

function render(): void {
    const el = document.getElementById('pulse-body');
    if (!el) return;

    const start = periodStart(period);
    const c = getC();

    const per: Record<string, { total: number; s: number; o: number }> = {};
    rows.forEach(r => {
        if (new Date(r.updated_at).getTime() < start) return;
        if (!per[r.politician_id]) per[r.politician_id] = { total: 0, s: 0, o: 0 };
        per[r.politician_id].total++;
        if (r.direction === 's') per[r.politician_id].s++;
        else if (r.direction === 'o') per[r.politician_id].o++;
    });

    const movers = POLS
        .map(p => {
            const act = per[p.id] || { total: 0, s: 0, o: 0 };
            const cv = c[p.id] || { s: 0, o: 0, u: 0 };
            const overall = cv.s + cv.o + cv.u;
            return { p, act, overall, sp: pct(cv.s, cv.o, cv.u).sp };
        })
        .filter(x => x.act.total > 0 && x.overall >= MIN_VOTES_OVERALL)
        .sort((a, b) => b.act.total - a.act.total)
        .slice(0, 10);

    const list = movers.length
        ? movers.map(({ p, act, sp }) => `
          <div class="pulse-row" onclick="openDetail('${p.id}')">
            ${avatar(p, 36)}
            <div class="pulse-info">
              <div class="pulse-name">${p.name}</div>
              <div class="pulse-role">${p.role}, ${p.state}</div>
            </div>
            <div class="pulse-delta">
              <span class="mnum pulse-new">+${fmt(act.total)} votes</span>
              <span class="pulse-split"><span class="pd-s">+${fmt(act.s)}</span> <span class="pd-o">+${fmt(act.o)}</span></span>
            </div>
            <span class="mnum pulse-now">${sp}%</span>
          </div>`).join('')
        : `<div class="nodata">
            <div class="nodata-label">No movement yet</div>
            <div class="nodata-text">No qualifying politician has received votes in this window. Politicians under the ${MIN_VOTES_OVERALL} vote minimum are excluded.</div>
          </div>`;

    el.innerHTML = `
      <div class="pulse-rows">${list}</div>
      <div class="pulse-method">
        <span>Methodology: count of vote actions in the selected window, from server side vote timestamps, identical on every device. The percentage shown is current overall support. Politicians under the ${MIN_VOTES_OVERALL} vote minimum are excluded from this list.</span>
      </div>`;
}
