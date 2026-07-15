import { getC } from '../lib/storage.js';
import { fmt, pct } from '../lib/helpers.js';
import { MIN_VOTES_OVERALL } from '../lib/constants.js';
import { POLS } from '../data/politicians.js';
import { avatar, partyTag } from '../ui/card.js';

export function rLb(): void {
    const el = document.getElementById('lblist');
    if (!el) return;

    const sub = document.getElementById('lb-subtitle');
    if (sub) sub.textContent = `The most popular names and where they stand, most voted first. Politicians with fewer than ${MIN_VOTES_OVERALL} votes sit at the bottom, unranked.`;

    const party = ((document.getElementById('lb-party') as HTMLSelectElement)?.value || '').trim();
    const region = ((document.getElementById('lb-region') as HTMLSelectElement)?.value || '').trim();
    const role = ((document.getElementById('lb-role') as HTMLSelectElement)?.value || '').trim();

    const c = getC();
    let list = [...POLS];
    if (role) list = list.filter(p => p.type === role);
    if (party) list = list.filter(p => p.party === party);
    if (region) list = list.filter(p => p.region === region);

    const enriched = list.map(p => {
        const cv = c[p.id] || { s: 0, o: 0, u: 0 };
        const total = cv.s + cv.o + cv.u;
        return { p, cv, total, sp: pct(cv.s, cv.o, cv.u).sp };
    });

    const ranked = enriched.filter(x => x.total >= MIN_VOTES_OVERALL).sort((a, b) => b.total - a.total || b.sp - a.sp);
    const unranked = enriched.filter(x => x.total < MIN_VOTES_OVERALL).sort((a, b) => b.total - a.total);

    const rankCls = (i: number) => i === 0 ? 'rank-g' : i === 1 ? 'rank-s' : i === 2 ? 'rank-b' : '';

    const rows = [
        ...ranked.map(({ p, total, sp }, i) => `
      <div class="lb-row" onclick="openDetail('${p.id}')">
        <div class="mnum lb-rank ${rankCls(i)}">${String(i + 1).padStart(2, '0')}</div>
        ${avatar(p, 40)}
        <div class="lb-info">
          <div class="lb-name">${p.name}</div>
          <div class="lb-det">${p.role}, ${p.state}</div>
        </div>
        ${partyTag(p)}
        <div class="lb-data">
          <div class="mnum lb-pct">${sp}%</div>
          <div class="lb-track"><div class="lb-fill" style="width:${sp}%"></div></div>
        </div>
        <span class="mlabel lb-votes">${fmt(total)} votes</span>
      </div>`),
        ...unranked.map(({ p, total }) => `
      <div class="lb-row lb-row-nodata" onclick="openDetail('${p.id}')">
        <div class="mnum lb-rank rank-none">..</div>
        ${avatar(p, 40)}
        <div class="lb-info">
          <div class="lb-name">${p.name}</div>
          <div class="lb-det">${p.role}, ${p.state}</div>
        </div>
        ${partyTag(p)}
        <div class="lb-nodata">
          <div class="mlabel">Not enough votes</div>
          <div class="lb-nodata-sub">${total} of ${MIN_VOTES_OVERALL} votes needed</div>
        </div>
      </div>`),
    ];

    el.innerHTML = rows.length ? rows.join('') : `
      <div class="empty">
        <p class="empty-title">No politicians match</p>
        <span class="empty-sub">Try a different filter</span>
      </div>`;
}
