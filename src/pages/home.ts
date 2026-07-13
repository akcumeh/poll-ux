import { getC, getCm } from '../lib/storage.js';
import { fmt } from '../lib/helpers.js';
import { MIN_COMMENTS_AI } from '../lib/constants.js';
import { LIVE } from '../lib/live.js';
import { POLS } from '../data/politicians.js';
import { STATE_ZONES } from '../data/zones.js';
import { avatar } from '../ui/card.js';
import { escHtml } from '../lib/helpers.js';

export function rHome(): void {
    const c = getC();
    const cm = getCm();
    const totalVotes = POLS.reduce((a, p) => {
        const cv = c[p.id] || { s: 0, o: 0, u: 0 };
        return a + cv.s + cv.o + cv.u;
    }, 0);
    const totalCmts = Object.values(cm).reduce((a, arr) => a + (arr ? arr.filter(x => x.status === 'approved').length : 0), 0);

    const stats = document.getElementById('home-stats');
    if (stats) {
        stats.innerHTML = [
            { value: String(POLS.length), label: 'Politicians tracked' },
            { value: totalVotes === 0 ? '0' : fmt(totalVotes), label: 'Votes recorded' },
            { value: totalCmts === 0 ? '0' : fmt(totalCmts), label: 'Comments moderated' },
            { value: String(STATE_ZONES.length), label: 'States and FCT' },
        ].map(st => `<div class="stat-cell">
            <div class="mnum stat-n">${st.value}</div>
            <div class="mlabel stat-l">${st.label}</div>
          </div>`).join('');
    }

    const heated = document.getElementById('home-heated');
    if (heated) {
        const rows = POLS
            .map(p => ({ p, ins: LIVE.insights[p.id] }))
            .filter(x => x.ins && x.ins.temperature !== null)
            .sort((a, b) => (b.ins!.temperature ?? 0) - (a.ins!.temperature ?? 0))
            .slice(0, 3);

        heated.innerHTML = rows.length
            ? rows.map(({ p, ins }) => {
                const t = ins!.temperature!;
                const barColor = t > 70 ? 'var(--amber)' : 'var(--lime)';
                return `<div class="heat-card" onclick="openDetail('${p.id}')">
                  <div class="heat-hd">
                    ${avatar(p, 36)}
                    <div>
                      <div class="heat-name">${p.name}</div>
                      <div class="heat-role">${p.role}</div>
                    </div>
                  </div>
                  <div class="heat-reading">
                    <span class="mnum heat-temp">${t}</span>
                    <span class="mlabel">Debate temperature</span>
                  </div>
                  <div class="heat-track"><div class="heat-fill" style="width:${t}%;background:${barColor}"></div></div>
                  <div class="heat-tags">${ins!.emotions.map(e => `<span class="pm-tag">${escHtml(e)}</span>`).join('')}</div>
                </div>`;
            }).join('')
            : `<div class="nodata heat-empty">
                <div class="nodata-label">No debates analyzed yet</div>
                <div class="nodata-text">A thread needs ${MIN_COMMENTS_AI} comments before the AI measures its temperature. Start one from any politician's page.</div>
              </div>`;
    }
}
