import { pct, fmt } from '../lib/helpers.js';
import { MIN_VOTES_ZONE } from '../lib/constants.js';
import { LIVE } from '../lib/live.js';
import { ZONES } from '../data/zones.js';
import { triBar, insufficientData } from '../ui/trust.js';

export function rRg(): void {
    const el = document.getElementById('rggrid');
    if (!el) return;

    el.innerHTML = ZONES.map(zone => {
        const zs = LIVE.zoneStats.find(z => z.zone === zone.name);
        const total = zs ? zs.total : 0;
        const hasData = zs && total >= MIN_VOTES_ZONE;

        let body: string;
        if (hasData) {
            const { sp } = pct(zs!.s, zs!.o, zs!.u);
            body = `
              <div class="rg-reading">
                <span class="mnum rg-pct">${sp}%</span>
                <span class="rg-of">average support</span>
              </div>
              ${triBar({ s: zs!.s, o: zs!.o, u: zs!.u }, 'md')}
              <div class="mlabel" style="margin-top:10px">${fmt(total)} regional votes</div>`;
        } else {
            body = insufficientData(total, MIN_VOTES_ZONE, 'regional votes');
        }

        return `<div class="rg-card">
          <div class="rg-hd">
            <div class="rg-zone">${zone.name}</div>
            <span class="mlabel">${zone.stateCount} states</span>
          </div>
          <div class="rg-states">${zone.states}</div>
          ${body}
        </div>`;
    }).join('');
}
