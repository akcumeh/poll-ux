import { getC } from '../lib/storage.js';
import { pct } from '../lib/helpers.js';
import { POLS } from '../data/politicians.js';
import { card, showSkeletons } from '../ui/card.js';

export { showSkeletons };
export let AF = 'all';

export function setF(f: string, btn: HTMLElement): void {
    AF = f;
    document.querySelectorAll('.fbtn').forEach(b => b.classList.remove('on'));
    if (btn) btn.classList.add('on');
    document.querySelectorAll(`.fbtn[data-f="${f}"]`).forEach(b => b.classList.add('on'));
    rPolls();
}

export function rPolls(): void {
    const q = ((document.getElementById('srch') as HTMLInputElement)?.value || '').toLowerCase().trim();
    const party = ((document.getElementById('sel-party') as HTMLSelectElement)?.value || '').trim();
    const region = ((document.getElementById('sel-region') as HTMLSelectElement)?.value || '').trim();
    const sort = ((document.getElementById('sel-sort') as HTMLSelectElement)?.value || 'trending');
    const c = getC();

    let list = [...POLS];
    if (AF === 'National') list = list.filter(p => p.type === 'National');
    else if (AF === 'Governor') list = list.filter(p => p.type === 'Governor');
    else if (AF === 'Senator') list = list.filter(p => p.type === 'Senator');
    if (party) list = list.filter(p => p.party === party);
    if (region) list = list.filter(p => p.region === region);
    if (q) list = list.filter(p =>
        p.name.toLowerCase().includes(q) || p.party.toLowerCase().includes(q) ||
        p.state.toLowerCase().includes(q) || p.role.toLowerCase().includes(q) ||
        p.region.toLowerCase().includes(q));

    list.sort((a, b) => {
        const ca = c[a.id] || { s: 0, o: 0, u: 0 }, cb = c[b.id] || { s: 0, o: 0, u: 0 };
        const ta = ca.s + ca.o + ca.u, tb = cb.s + cb.o + cb.u;
        if (sort === 'supported') { const { sp: sa } = pct(ca.s, ca.o, ca.u), { sp: sb } = pct(cb.s, cb.o, cb.u); return sb - sa }
        if (sort === 'opposed') { const { op: oa } = pct(ca.s, ca.o, ca.u), { op: ob } = pct(cb.s, cb.o, cb.u); return ob - oa }
        if (sort === 'polarising') { const { sp: sa } = pct(ca.s, ca.o, ca.u), { sp: sb } = pct(cb.s, cb.o, cb.u); return Math.abs(sa - 50) - Math.abs(sb - 50) }
        if (sort === 'alpha') return a.name.localeCompare(b.name);
        return tb - ta;
    });

    const g = document.getElementById('pgrid');
    const cnt = document.getElementById('polls-count');
    if (cnt) cnt.innerHTML = `<span class="mnum">${list.length}</span> politician${list.length !== 1 ? 's' : ''} shown`;
    if (g) {
        g.innerHTML = list.length ? list.map(card).join('') : `
      <div class="empty">
        <p class="empty-title">No politicians found</p>
        <span class="empty-sub">Try a different search or filter</span>
      </div>`;
    }
}
