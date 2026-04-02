import { ini, rpct } from '../lib/helpers.js';
import { POLS } from '../data/politicians.js';
import { ZONES } from '../data/zones.js';

export function rRg(): void {
    const el = document.getElementById('rggrid'); if (!el) return;
    el.innerHTML = ZONES.map(zone => {
        const top = zone.pols
            .map(id => ({ pol: POLS.find(p => p.id === id), r: rpct(id, zone.name) }))
            .filter(x => x.pol)
            .sort((a, b) => b.r - a.r)
            .slice(0, 5);
        return `<div class="rg-card">
      <div class="rg-zone">${zone.name}</div>
      <div class="rg-states">${zone.states}</div>
      <div class="rp-list">
        ${top.map(({ pol, r }) => {
            const col = r >= 50 ? 'var(--lime)' : 'var(--red)';
            return `<div class="rp-row">
            <div class="rp-top">
              <div class="rp-av" style="background:${pol!.color}">${ini(pol!.name)}</div>
              <div class="rp-name">${pol!.name}</div>
              <div class="rp-pct" style="color:${col}">${r}%</div>
            </div>
            <div class="rp-bar"><div class="rp-fill" style="width:${r}%;background:${col}"></div></div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
    }).join('');
}
