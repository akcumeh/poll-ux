import type { LeaderboardMode } from '../types.js';
import { getC } from '../lib/storage.js';
import { fmt, pct, ini } from '../lib/helpers.js';
import { POLS } from '../data/politicians.js';

export let LM: LeaderboardMode = 'support';

export function setLb(m: LeaderboardMode, btn: HTMLElement): void {
    LM = m;
    document.querySelectorAll('.lb-tab').forEach(b => b.classList.remove('on'));
    if (btn) btn.classList.add('on');
    rLb();
}

export function rLb(): void {
    const c = getC();
    const sorted = [...POLS].sort((a, b) => {
        const ca = c[a.id] || { s: 0, o: 0 }, cb = c[b.id] || { s: 0, o: 0 };
        if (LM === 'support') { const { sp: sa } = pct(ca.s, ca.o), { sp: sb } = pct(cb.s, cb.o); return sb - sa }
        if (LM === 'oppose') { const { op: oa } = pct(ca.s, ca.o), { op: ob } = pct(cb.s, cb.o); return ob - oa }
        return (cb.s + cb.o) - (ca.s + ca.o);
    });
    const el = document.getElementById('lblist');
    if (!el) return;
    el.innerHTML = sorted.map((pol, i) => {
        const cv = c[pol.id] || { s: 0, o: 0 };
        const { sp, op } = pct(cv.s, cv.o); const total = cv.s + cv.o;
        const rk = i === 0 ? 'g' : i === 1 ? 's' : i === 2 ? 'b' : '';
        const barW = LM === 'oppose' ? op : LM === 'support' ? sp : 0;
        const val = LM === 'votes' ? fmt(total) : (LM === 'oppose' ? op : sp) + '%';
        const pcls = LM === 'oppose' ? 'go' : LM === 'support' ? 'gs' : 'gn';
        const bc = LM === 'oppose' ? 'var(--red)' : 'var(--lime)';
        return `<div class="lb-row" onclick="go('polls')">
      <div class="lb-rank ${rk}">${i + 1}</div>
      <div class="lb-av" style="background:${pol.color}">${ini(pol.name)}</div>
      <div class="lb-info">
        <div class="lb-name">${pol.name}</div>
        <div class="lb-det">${pol.party} · ${pol.type} · ${pol.state}</div>
      </div>
      <div class="lb-bar-w">
        <div class="lb-bar"><div class="lb-fill" style="width:${barW}%;background:${bc}"></div></div>
        <div class="lb-votes">${total === 0 ? 'No votes yet' : fmt(total) + ' total votes'}</div>
      </div>
      <div class="lb-pct ${pcls}">${total === 0 ? '—' : val}</div>
    </div>`;
    }).join('');
}
