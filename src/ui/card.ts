import type { Politician } from '../types.js';
import { getC } from '../lib/storage.js';
import { fmt, pct, ini, partyColor } from '../lib/helpers.js';
import { MIN_VOTES_OVERALL } from '../lib/constants.js';
import { triBar, voteToggle, insufficientData } from './trust.js';
import { POLS } from '../data/politicians.js';
import { showToast } from './toast.js';

export function avatar(pol: Politician, size: number): string {
    const r = Math.round(size * 0.28);
    const color = partyColor(pol.party);
    return `<div class="pav" style="width:${size}px;height:${size}px;border-radius:${r}px;background:${color}1A;border-color:${color}40;color:${color};font-size:${Math.round(size * 0.34)}px">${ini(pol.name)}</div>`;
}

export function partyTag(pol: Politician): string {
    const color = partyColor(pol.party);
    return `<span class="ptag" style="color:${color};border-color:${color}40">${pol.party}</span>`;
}

export function card(pol: Politician): string {
    const c = getC();
    const cv = c[pol.id] || { s: 0, o: 0, u: 0 };
    const total = cv.s + cv.o + cv.u;
    const hasData = total >= MIN_VOTES_OVERALL;
    const { sp, op, up } = pct(cv.s, cv.o, cv.u);

    const dataBlock = hasData
        ? `<div class="pcard-data">
            <div class="pcard-nums">
              <span class="mnum pcard-pct">${sp}%</span>
              <span class="mlabel">${fmt(total)} votes</span>
            </div>
            ${triBar(cv, 'sm')}
            <div class="tri-legend">
              <span class="tl-s">Support ${sp}%</span>
              <span class="tl-u">Undecided ${up}%</span>
              <span class="tl-o">Oppose ${op}%</span>
            </div>
          </div>`
        : insufficientData(total, MIN_VOTES_OVERALL, 'votes');

    return `<div class="pcard" id="pc-${pol.id}">
      <div class="pcard-hd">
        ${avatar(pol, 40)}
        <div class="pcard-info">
          <div class="pcard-name" onclick="openDetail('${pol.id}')" title="${pol.name}">${pol.name}</div>
          <div class="pcard-role">${pol.role}, ${pol.state}</div>
        </div>
        ${partyTag(pol)}
      </div>
      ${dataBlock}
      ${voteToggle(pol.id)}
    </div>`;
}

export function skeletonCard(): string {
    return `<div class="pcard skeleton-card">
      <div class="pcard-hd">
        <div class="skel skel-av"></div>
        <div class="pcard-info" style="flex:1">
          <div class="skel skel-line" style="width:60%;margin-bottom:8px"></div>
          <div class="skel skel-line" style="width:40%"></div>
        </div>
      </div>
      <div class="skel skel-line" style="width:100%;margin:14px 0 6px"></div>
      <div class="skel skel-bar"></div>
      <div style="display:flex;gap:6px;margin-top:14px">
        <div class="skel skel-btn"></div>
        <div class="skel skel-btn"></div>
        <div class="skel skel-btn"></div>
      </div>
    </div>`;
}

export function showSkeletons(count = 6): void {
    const g = document.getElementById('pgrid');
    const cnt = document.getElementById('polls-count');
    if (cnt) cnt.textContent = 'Loading';
    if (g) g.innerHTML = Array(count).fill(0).map(skeletonCard).join('');
}

export function shareCard(pid: string, e: Event): void {
    e.stopPropagation();
    const url = `${location.origin}/?pol=${pid}`;
    const pol = POLS.find(p => p.id === pid);
    const name = pol ? pol.name : 'this politician';
    if (navigator.share) {
        navigator.share({
            title: `Pollux, ${name}`,
            text: `See the live, honest sentiment data on ${name} on Pollux`,
            url,
        }).catch(() => { });
    } else if (navigator.clipboard) {
        navigator.clipboard.writeText(url)
            .then(() => showToast('Link copied', `Share ${name.split(' ')[0]}'s page anywhere.`));
    }
}
