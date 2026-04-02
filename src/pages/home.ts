import { getC, getUV } from '../lib/storage.js';
import { fmt, pct, totalComments } from '../lib/helpers.js';
import { POLS } from '../data/politicians.js';
import { card } from '../ui/card.js';

export function rHome(): void {
    const c = getC(), uv = getUV();
    const total = POLS.reduce((a, p) => { const cv = c[p.id] || { s: 0, o: 0 }; return a + cv.s + cv.o }, 0);
    const yvotes = Object.keys(uv).length;
    const cmtsTotal = totalComments();

    // Live counter
    const n = document.getElementById('lbc-n');
    if (n) n.innerHTML = `<em>${total === 0 ? '0' : fmt(total)}</em>`;
    const sub = document.getElementById('lbc-sub');
    if (sub) sub.textContent = total === 0
        ? 'Be the first to vote — recorded anonymously on your device'
        : `${total.toLocaleString()} vote${total !== 1 ? 's' : ''} cast on Pollux`;

    const stPols = document.getElementById('st-pols'); if (stPols) stPols.textContent = String(POLS.length);
    const stYours = document.getElementById('st-yours'); if (stYours) stYours.textContent = String(yvotes);
    const stCmts = document.getElementById('st-cmts'); if (stCmts) stCmts.textContent = String(cmtsTotal);

    // Trending — highest total votes
    const byVol = [...POLS].sort((a, b) => {
        const ca = c[a.id] || { s: 0, o: 0 }, cb = c[b.id] || { s: 0, o: 0 };
        return (cb.s + cb.o) - (ca.s + ca.o);
    });
    const gt = document.getElementById('g-trend');
    if (gt) gt.innerHTML = byVol.slice(0, 3).map(card).join('');

    // Polarising — closest to 50/50 split, exclude trending 3
    const tIds = byVol.slice(0, 3).map(p => p.id);
    const polar = [...POLS].filter(p => !tIds.includes(p.id)).sort((a, b) => {
        const ca = c[a.id] || { s: 0, o: 0 }, cb = c[b.id] || { s: 0, o: 0 };
        const { sp: sa } = pct(ca.s, ca.o), { sp: sb } = pct(cb.s, cb.o);
        return Math.abs(sa - 50) - Math.abs(sb - 50);
    });
    const gp = document.getElementById('g-polar');
    if (gp) gp.innerHTML = polar.slice(0, 3).map(card).join('');
}
