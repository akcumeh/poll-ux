import { getC, getUV } from '../lib/storage.js';
import { fmt, pct, ini, totalComments } from '../lib/helpers.js';
import { POLS } from '../data/politicians.js';
import { card } from '../ui/card.js';
import { go } from '../ui/nav.js';

export let AF = 'all';

export function setF(f: string, btn: HTMLElement): void {
    AF = f;
    document.querySelectorAll('.fbtn').forEach(b => b.classList.remove('on'));
    if (btn) btn.classList.add('on');
    rPolls();
}

export function rPolls(): void {
    const q = ((document.getElementById('srch') as HTMLInputElement)?.value || '').toLowerCase().trim();
    const party = ((document.getElementById('sel-party') as HTMLSelectElement)?.value || '').trim();
    const region = ((document.getElementById('sel-region') as HTMLSelectElement)?.value || '').trim();
    const sort = ((document.getElementById('sel-sort') as HTMLSelectElement)?.value || 'trending');
    const c = getC(), uv = getUV();

    let list = [...POLS];
    // Type filter
    if (AF === 'National') list = list.filter(p => p.type === 'National');
    else if (AF === 'Governor') list = list.filter(p => p.type === 'Governor');
    else if (AF === 'Senator') list = list.filter(p => p.type === 'Senator');
    // Party filter
    if (party) list = list.filter(p => p.party === party);
    // Region filter
    if (region) list = list.filter(p => p.region === region);
    // Search
    if (q) list = list.filter(p =>
        p.name.toLowerCase().includes(q) || p.party.toLowerCase().includes(q) ||
        p.state.toLowerCase().includes(q) || p.role.toLowerCase().includes(q) ||
        p.region.toLowerCase().includes(q));
    // Sort
    list.sort((a, b) => {
        const ca = c[a.id] || { s: 0, o: 0 }, cb = c[b.id] || { s: 0, o: 0 };
        if (sort === 'supported') { const { sp: sa } = pct(ca.s, ca.o), { sp: sb } = pct(cb.s, cb.o); return sb - sa }
        if (sort === 'opposed') { const { op: oa } = pct(ca.s, ca.o), { op: ob } = pct(cb.s, cb.o); return ob - oa }
        if (sort === 'polarising') { const { sp: sa } = pct(ca.s, ca.o), { sp: sb } = pct(cb.s, cb.o); return Math.abs(sa - 50) - Math.abs(sb - 50) }
        if (sort === 'alpha') return a.name.localeCompare(b.name);
        return (cb.s + cb.o) - (ca.s + ca.o); // trending
    });

    const g = document.getElementById('pgrid');
    const cnt = document.getElementById('polls-count');
    if (cnt) cnt.innerHTML = `<span>${list.length}</span> politician${list.length !== 1 ? 's' : ''} shown`;
    if (g) {
        g.innerHTML = list.length ? list.map(card).join('') : `
      <div class="empty">
        <div class="empty-ico"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg></div>
        <p style="font-size:15px;margin-bottom:4px;font-weight:500">No politicians found</p>
        <span style="font-size:12.5px;color:var(--mu3)">Try a different search or filter</span>
      </div>`;
    }

    // Your votes strip
    const votes = Object.entries(uv);
    const yvwrap = document.getElementById('yv-wrap');
    const yvpills = document.getElementById('yv-pills');
    const yvcnt = document.getElementById('yv-count');
    if (yvwrap && yvpills) {
        if (votes.length > 0) {
            yvwrap.style.display = 'block';
            if (yvcnt) yvcnt.textContent = `— ${votes.length} vote${votes.length !== 1 ? 's' : ''}`;
            yvpills.innerHTML = votes.map(([id, dir]) => {
                const pol = POLS.find(p => p.id === id); if (!pol) return '';
                const sc = dir === 's' ? 'yv-pill-s' : 'yv-pill-o';
                return `<span class="yv-pill ${sc}" onclick="go('polls')">
          ${dir === 's' ? '↑' : '↓'} ${pol.name.split(' ')[0]}
          <span class="yv-pill-x">×</span>
        </span>`;
            }).join('');
        } else {
            yvwrap.style.display = 'none';
        }
    }

    // Sidebar stats
    const total = POLS.reduce((a, p) => { const cv = c[p.id] || { s: 0, o: 0 }; return a + cv.s + cv.o }, 0);
    const sbTotal = document.getElementById('sb-total'); if (sbTotal) sbTotal.textContent = fmt(total);
    const sbPols = document.getElementById('sb-pols'); if (sbPols) sbPols.textContent = String(POLS.length);
    const sbCmts = document.getElementById('sb-cmts'); if (sbCmts) sbCmts.textContent = String(totalComments());
    const sbYours = document.getElementById('sb-yours'); if (sbYours) sbYours.textContent = String(votes.length);

    // Sidebar top 5 by support %
    const top5 = [...POLS].map(p => {
        const cv = c[p.id] || { s: 0, o: 0 }; const { sp } = pct(cv.s, cv.o);
        return { pol: p, sp, total: cv.s + cv.o };
    }).sort((a, b) => b.total - a.total).slice(0, 5);
    const sb5 = document.getElementById('sb-top5');
    if (sb5) {
        sb5.innerHTML = top5.map(({ pol, sp, total }) => `
      <div class="sb-row">
        <div style="display:flex;align-items:center;gap:7px;min-width:0">
          <div class="av" style="background:${pol.color};width:24px;height:24px;border-radius:6px;font-size:8px;flex-shrink:0">${ini(pol.name)}</div>
          <span class="sb-name" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${pol.name.split(' ')[0]} ${pol.name.split(' ').slice(-1)[0]}</span>
        </div>
        <span class="sb-val" style="color:${sp >= 50 ? 'var(--lime)' : 'var(--red)'}">${total === 0 ? '—' : sp + '%'}</span>
      </div>`).join('');
    }

    // Suppress unused import warning
    void go;
}
