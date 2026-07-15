import { getC, getRegion } from '../lib/storage.js';
import { fmt, pct } from '../lib/helpers.js';
import { MIN_VOTES_OVERALL, MIN_VOTES_ZONE, currentHourStart } from '../lib/constants.js';
import { LIVE } from '../lib/live.js';
import { POLS } from '../data/politicians.js';
import { ZONES } from '../data/zones.js';
import { avatar, partyTag } from '../ui/card.js';
import {
    triBar, voteToggle, insufficientData,
    passionMeter, debateDigest, briefingPanel, commentThread, regionPanel, regionFooterLink,
} from '../ui/trust.js';
import { go } from '../ui/nav.js';
import { refreshInsights, fetchBriefing } from '../api/insights.js';

let currentPid: string | null = null;
let briefingOpen = false;
let briefingLoading = false;

export function openDetail(pid: string): void {
    const pol = POLS.find(p => p.id === pid);
    if (!pol) { go('polls'); return; }
    currentPid = pid;
    briefingOpen = false;
    briefingLoading = false;
    history.pushState({}, '', `${location.pathname}?pol=${pid}`);
    go('detail');
    refreshInsights(pid);
}

export function refreshBriefing(): void {
    if (!currentPid) return;
    briefingLoading = true;
    const ins = LIVE.insights[currentPid];
    if (ins) {
        ins.briefing = null;
        ins.briefingAt = null;
    }
    fetchBriefing(currentPid).then(() => { briefingLoading = false; });
    rDetail();
}

export function toggleBriefing(): void {
    if (!currentPid) return;
    briefingOpen = !briefingOpen;

    if (!briefingOpen) {
        const el = document.querySelector('.briefing');
        if (el) {
            el.classList.add('briefing-out');
            window.setTimeout(rDetail, 240);
            return;
        }
        rDetail();
        return;
    }

    const ins = LIVE.insights[currentPid];
    const stale = !ins?.briefing || !ins.briefingAt || ins.briefingAt < currentHourStart();
    if (stale) {
        briefingLoading = true;
        fetchBriefing(currentPid).then(() => { briefingLoading = false; });
    }
    rDetail();
}

export function rDetail(): void {
    const el = document.getElementById('detail-body');
    if (!el) return;
    if (!currentPid) { go('polls'); return; }
    const pol = POLS.find(p => p.id === currentPid);
    if (!pol) { go('polls'); return; }

    const c = getC();
    const cv = c[pol.id] || { s: 0, o: 0, u: 0 };
    const total = cv.s + cv.o + cv.u;
    const hasData = total >= MIN_VOTES_OVERALL;
    const { sp, op, up } = pct(cv.s, cv.o, cv.u);

    const sentimentBlock = hasData
        ? `<div class="mlabel" style="margin-bottom:16px">Current sentiment, ${fmt(total)} votes</div>
           ${triBar(cv, 'lg')}
           <div class="detail-splits">
             <div><span class="mnum split-n split-s">${sp}%</span><div class="split-l">Support</div></div>
             <div><span class="mnum split-n split-u">${up}%</span><div class="split-l">Undecided</div></div>
             <div><span class="mnum split-n split-o">${op}%</span><div class="split-l">Oppose</div></div>
           </div>`
        : `<div class="mlabel" style="margin-bottom:16px">Current sentiment</div>
           ${insufficientData(total, MIN_VOTES_OVERALL, 'votes')}`;

    const zoneRows = ZONES.map(z => {
        const zs = LIVE.polZoneStats.find(s => s.politicianId === pol.id && s.zone === z.name);
        const zTotal = zs ? zs.total : 0;
        const zHasData = zs && zTotal >= MIN_VOTES_ZONE;
        const bar = zHasData
            ? triBar({ s: zs!.s, o: zs!.o, u: zs!.u }, 'sm')
            : `<div class="zrow-track"></div>`;
        const zSp = zHasData ? pct(zs!.s, zs!.o, zs!.u).sp : 0;
        return `<div class="zrow">
          <span class="zrow-name">${z.name}</span>
          <div class="zrow-bar">${bar}</div>
          <span class="mnum zrow-val">${zHasData ? zSp + '%' : 'no data'}</span>
        </div>`;
    }).join('');

    el.innerHTML = `
      <button class="quiet-link" onclick="go('polls')" style="margin-bottom:24px">Back to polls</button>
      <div class="detail-hd">
        ${avatar(pol, 64)}
        <div class="detail-hd-info">
          <h1 class="detail-name">${pol.name}</h1>
          <div class="detail-meta">
            <span class="detail-role">${pol.role}, ${pol.state}</span>
            ${partyTag(pol)}
          </div>
        </div>
        <div class="detail-actions">
          <button class="btn-ai ${briefingOpen ? 'on' : ''}" onclick="toggleBriefing()">AI briefing</button>
          <button class="btn-ghost btn-sm" onclick="shareCard('${pol.id}',event)">Share</button>
        </div>
      </div>
      <p class="detail-bio">${pol.bio}</p>

      ${briefingOpen ? briefingPanel(pol.id, briefingLoading) : ''}

      <div class="detail-grid">
        <div class="panel">
          ${sentimentBlock}
          ${voteToggle(pol.id)}
        </div>
        ${passionMeter(pol.id)}
      </div>

      ${debateDigest(pol.id)}

      ${commentThread(pol.id)}

      ${zoneSection(zoneRows)}
    `;
}

function zoneSection(zoneRows: string): string {
    const region = getRegion();
    const zonePanel = `<div class="panel">
      <div class="mlabel" style="margin-bottom:16px">Support by zone</div>
      <div class="zrows">${zoneRows}</div>
      <div class="panel-note" style="margin-top:14px">A zone shows a percentage once ${MIN_VOTES_ZONE} people from there have voted on this politician.</div>
    </div>`;

    if (region === null) {
        return `<div class="detail-grid detail-grid-even" style="margin-top:32px">${zonePanel}${regionPanel()}</div>`;
    }
    if (region.skipped) {
        return `<div style="margin-top:32px">${zonePanel}</div>${regionFooterLink()}`;
    }
    return `<div style="margin-top:32px">${zonePanel}</div>`;
}
