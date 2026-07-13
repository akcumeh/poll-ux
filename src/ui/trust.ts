import type { VoteCounts, VoteDirection, Comment } from '../types.js';
import { getUV, getCm, getRegion, saveRegion } from '../lib/storage.js';
import { LIVE, cooldownRemaining } from '../lib/live.js';
import { MIN_COMMENTS_AI, COMMENT_MAX_LENGTH } from '../lib/constants.js';
import { pct, fmt, timeAgo, escHtml } from '../lib/helpers.js';
import { STATE_ZONES, zoneOfState } from '../data/zones.js';
import { castVote } from '../api/votes.js';
import { submitComment, purgeExpiredHeld } from '../api/comments.js';
import { reportComment } from '../api/reports.js';
import { refresh } from './nav.js';

export function triBar(cv: VoteCounts, size: 'sm' | 'md' | 'lg' = 'sm'): string {
    const { sp, op, up } = pct(cv.s, cv.o, cv.u);
    return `<div class="tribar tribar-${size}">
      <div class="tri-s" style="width:${sp}%"></div>
      <div class="tri-u" style="width:${up}%"></div>
      <div class="tri-o" style="width:${op}%"></div>
    </div>`;
}

export function insufficientData(current: number, needed: number, unit: string): string {
    const w = Math.min(100, Math.round(current / needed * 100));
    return `<div class="nodata">
      <div class="nodata-label">Not enough votes yet</div>
      <div class="nodata-track"><div class="nodata-fill" style="width:${w}%"></div></div>
      <div class="nodata-text">${current} of ${needed} ${unit} needed before a percentage is shown</div>
    </div>`;
}

export function insufficientComments(current: number): string {
    const w = Math.min(100, Math.round(current / MIN_COMMENTS_AI * 100));
    return `<div class="nodata">
      <div class="nodata-label">Not enough comments yet</div>
      <div class="nodata-track"><div class="nodata-fill" style="width:${w}%"></div></div>
      <div class="nodata-text">${current} of ${MIN_COMMENTS_AI} comments needed before AI analysis runs</div>
    </div>`;
}

export function voteToggle(pid: string): string {
    const uv = getUV();
    const cur = uv[pid];
    const deviceState =
        cur === 's' ? 'You voted Support' :
            cur === 'o' ? 'You voted Oppose' :
                cur === 'u' ? 'You voted Undecided' :
                    'You have not voted';
    const cd = cooldownRemaining(pid);

    return `<div class="vtoggle">
      <div class="vt-btns">
        <button class="vt-btn ${cur === 's' ? 'vt-on-s' : ''}" onclick="doVote('${pid}','s',event)">Support</button>
        <button class="vt-btn ${cur === 'u' ? 'vt-on-u' : ''}" onclick="doVote('${pid}','u',event)">Undecided</button>
        <button class="vt-btn ${cur === 'o' ? 'vt-on-o' : ''}" onclick="doVote('${pid}','o',event)">Oppose</button>
      </div>
      <div class="vt-state">
        <span>${deviceState}</span>
        ${cur ? `<button class="vt-retract" onclick="retractVote('${pid}',event)">Retract vote</button>` : ''}
      </div>
      ${cd > 0 ? cooldownNotice(pid, cd) : ''}
    </div>`;
}

export function cooldownNotice(pid: string, secs: number): string {
    window.setTimeout(() => { if (cooldownRemaining(pid) === 0) refresh(); }, secs * 1000 + 250);
    return `<div class="cooldown">
      <div class="cooldown-hd">Taking a short breather</div>
      <div class="cooldown-bd">You changed this vote a moment ago. To keep results honest, the next change is available in about ${secs} seconds.</div>
    </div>`;
}

export function confidenceBadge(): string {
    return `<span class="conf-badge" title="Votes are anonymous and tied to a per device identity. Pollux does not verify voter identity.">Single session votes</span>`;
}

export function aiLabel(text: string): string {
    return `<span class="mlabel violet">${text}</span>`;
}

export function methodLink(label = 'Method'): string {
    return `<button class="quiet-link" onclick="openMethod()">${label}</button>`;
}

let pendingVote: { pid: string; dir: VoteDirection } | null = null;

export function doVote(pid: string, dir: VoteDirection, e?: Event): void {
    if (e) e.stopPropagation();
    if (getRegion() === null) {
        pendingVote = { pid, dir };
        openRegionPrompt();
        return;
    }
    const el = document.getElementById('pc-' + pid);
    if (el) { el.classList.add('blip'); setTimeout(() => el.classList.remove('blip'), 200); }
    castVote(pid, dir);
}

export function retractVote(pid: string, e?: Event): void {
    if (e) e.stopPropagation();
    const cur = getUV()[pid];
    if (cur) castVote(pid, cur);
}

function openRegionPrompt(): void {
    const root = document.getElementById('modal-root');
    if (!root) return;
    root.innerHTML = `<div class="modal-overlay" onclick="regionSkip()">
      <div class="modal" onclick="event.stopPropagation()">
        <div class="mlabel" style="margin-bottom:10px">Where is your vote from?</div>
        <p class="modal-body">Optionally share the state you vote from. It powers the Regions page and is never tied to your identity. Skipping keeps your vote in national totals only.</p>
        <select class="modal-select" id="region-select">
          <option value="">Select your state</option>
          ${STATE_ZONES.map(sz => `<option value="${sz.state}">${sz.state}</option>`).join('')}
        </select>
        <div class="modal-actions">
          <button class="btn-solid" onclick="regionSave()">Save</button>
          <button class="btn-ghost" onclick="regionSkip()">Skip for now</button>
        </div>
      </div>
    </div>`;
}

function closeModal(): void {
    const root = document.getElementById('modal-root');
    if (root) root.innerHTML = '';
}

function resumePendingVote(): void {
    const pv = pendingVote;
    pendingVote = null;
    if (pv) castVote(pv.pid, pv.dir);
}

export function regionSave(): void {
    const sel = document.getElementById('region-select') as HTMLSelectElement | null;
    const state = sel?.value || '';
    if (state) {
        saveRegion({ state, zone: zoneOfState(state), skipped: false });
    } else {
        saveRegion({ state: null, zone: null, skipped: true });
    }
    closeModal();
    resumePendingVote();
}

export function regionSkip(): void {
    saveRegion({ state: null, zone: null, skipped: true });
    closeModal();
    resumePendingVote();
}

export function regionPanel(): string {
    const r = getRegion();
    const current = r?.state || '';
    return `<div class="panel">
      <div class="mlabel" style="margin-bottom:14px">Where is your vote from?</div>
      <p class="panel-body">Optionally share the state you vote from. It powers the Regions page and is never tied to your identity. Skipping keeps your vote in national totals only.</p>
      <select class="modal-select" id="region-select">
        <option value="">Select your state</option>
        ${STATE_ZONES.map(sz => `<option value="${sz.state}" ${sz.state === current ? 'selected' : ''}>${sz.state}</option>`).join('')}
      </select>
      <div class="modal-actions" style="margin-top:auto">
        <button class="btn-solid" onclick="regionSaveInline()">Save</button>
        ${current ? `<span class="panel-note">Applies to your future votes</span>` : `<button class="btn-ghost" onclick="regionSkipInline()">Skip for now</button>`}
      </div>
    </div>`;
}

export function regionSaveInline(): void {
    const sel = document.getElementById('region-select') as HTMLSelectElement | null;
    const state = sel?.value || '';
    if (state) saveRegion({ state, zone: zoneOfState(state), skipped: false });
    else saveRegion({ state: null, zone: null, skipped: true });
    refresh();
}

export function regionSkipInline(): void {
    saveRegion({ state: null, zone: null, skipped: true });
    refresh();
}

export function openMethod(): void {
    const root = document.getElementById('modal-root');
    if (!root) return;
    root.innerHTML = `<div class="modal-overlay" onclick="closeMethod()">
      <div class="modal modal-wide" onclick="event.stopPropagation()">
        <div class="modal-hd">
          <h2 class="modal-title">How we calculate this</h2>
          <button class="btn-ghost btn-sm" onclick="closeMethod()">Close</button>
        </div>
        <div class="method-sec">
          <div class="mlabel lime">Overall percentages</div>
          <p>Support, undecided and oppose shares are simple proportions of all active votes for a politician. One device holds one active vote per politician, enforced on the server, and any vote can be changed or retracted.</p>
        </div>
        <div class="method-sec">
          <div class="mlabel lime">Regional numbers</div>
          <p>A vote counts toward a zone only when the voter chose to share their state. Zones under the minimum sample show no percentage at all. Pollux never estimates or fills in a missing regional number.</p>
        </div>
        <div class="method-sec">
          <div class="mlabel lime">AI features</div>
          <p>The Passion Meter, Debate Digest and briefings are generated by Google Gemini on the server from public comments and search results. They are always labeled, cached, and kept separate from vote data. They are commentary about the debate, never poll numbers.</p>
        </div>
        <div class="method-sec">
          <div class="mlabel lime">What we can verify</div>
          <p>Votes are anonymous and tied to a per device identity, so the current confidence level is single session votes. Rate limits and server checks reject rapid or duplicate voting, but Pollux does not verify voter identity and does not predict elections.</p>
        </div>
      </div>
    </div>`;
}

export function closeMethod(): void {
    closeModal();
}

let heldTimer = 0;

export function commentThread(pid: string): string {
    const nextExpiry = purgeExpiredHeld(pid);
    window.clearTimeout(heldTimer);
    if (nextExpiry > 0) {
        heldTimer = window.setTimeout(refresh, nextExpiry + 500);
    }
    const cm = getCm();
    const all = (cm[pid] || []).slice().sort((a, b) => a.ts - b.ts);
    const rows = all.map(c => commentRow(c)).join('');

    return `<div class="cthread">
      <div class="cthread-hd">
        <h2 class="sec-title-sm">Comments</h2>
        <span class="cthread-note">Anonymous handles, moderated by AI before publishing</span>
      </div>
      <div class="cthread-list">${rows || `<p class="cthread-empty">No comments yet. Say why you support or oppose, anonymously.</p>`}</div>
      <div class="cform">
        <input class="cform-input" id="ctxt-${pid}" maxlength="${COMMENT_MAX_LENGTH}"
          placeholder="Why do you support or oppose? Posted anonymously after a quick review."
          onkeydown="if(event.key==='Enter'){submitCommentUI('${pid}')}">
        <button class="btn-solid" onclick="submitCommentUI('${pid}')">Submit</button>
      </div>
      <div class="cform-meta"><span class="char-count" id="cc-${pid}"></span></div>
    </div>`;
}

function commentRow(c: Comment): string {
    const held = c.status === 'held';
    const dirLabel = c.sentiment === 's' ? 'Supports' : c.sentiment === 'o' ? 'Opposes' : 'Undecided';
    const dirCls = c.sentiment === 's' ? 'cdir-s' : c.sentiment === 'o' ? 'cdir-o' : 'cdir-u';
    const reported = !!LIVE.reported[c.id];
    return `<div class="crow ${held ? 'crow-held' : ''}">
      <div class="crow-meta">
        <div class="crow-av">${escHtml(c.voter.slice(0, 2).toUpperCase())}</div>
        <span class="crow-handle">${escHtml(c.voter)}</span>
        <span class="cdir ${dirCls}">${dirLabel}</span>
        <span class="crow-time">${timeAgo(c.ts)}</span>
      </div>
      <p class="crow-text">${escHtml(c.text)}</p>
      ${held
            ? `<div class="crow-held-note">Held for review. Only you can see this, and it clears in a bit.</div>`
            : `<button class="crow-report ${reported ? 'on' : ''}" onclick="reportCommentUI('${c.id}')">${reported ? 'Reported. Thank you' : 'Report'}</button>`}
    </div>`;
}

export function submitCommentUI(pid: string): void {
    const el = document.getElementById('ctxt-' + pid) as HTMLInputElement | null;
    if (!el || !el.value.trim()) return;
    const text = el.value;
    el.value = '';
    submitComment(pid, text);
}

export function reportCommentUI(commentId: string): void {
    reportComment(commentId);
}

export function passionMeter(pid: string): string {
    const ins = LIVE.insights[pid];
    const cm = getCm();
    const approved = (cm[pid] || []).filter(c => c.status === 'approved').length;

    let body: string;
    if (!ins || ins.temperature === null || approved < MIN_COMMENTS_AI) {
        body = insufficientComments(approved);
    } else {
        const t = ins.temperature;
        const barColor = t > 70 ? 'var(--amber)' : 'var(--lime)';
        body = `
        <div class="pm-reading"><span class="mnum pm-temp">${t}</span><span class="pm-of">of 100, debate intensity</span></div>
        <div class="pm-track"><div class="pm-fill" style="width:${t}%;background:${barColor}"></div></div>
        <div class="pm-tags">${ins.emotions.map(e => `<span class="pm-tag">${escHtml(e)}</span>`).join('')}</div>
        ${ins.tempSummary ? `<p class="pm-summary">${escHtml(ins.tempSummary)}</p>` : ''}
        <div class="pm-foot">Measures intensity, not direction. Computed from ${fmt(approved)} comments, ${MIN_COMMENTS_AI} minimum.</div>`;
    }

    return `<div class="panel">
      <div class="panel-hd">
        ${aiLabel('Passion meter, AI generated')}
        ${methodLink()}
      </div>
      ${body}
    </div>`;
}

export function debateDigest(pid: string): string {
    const ins = LIVE.insights[pid];
    if (!ins || (!ins.digestSupport && !ins.digestOppose)) return '';
    return `<div class="panel digest">
      <div class="panel-hd">
        ${aiLabel('Debate digest, AI generated summary')}
        ${methodLink()}
      </div>
      <div class="digest-cols">
        <div class="digest-col digest-sup">
          <div class="digest-title">What supporters argue</div>
          <p>${escHtml(ins.digestSupport || 'No supporter comments to summarize yet.')}</p>
        </div>
        <div class="digest-col digest-opp">
          <div class="digest-title">What critics argue</div>
          <p>${escHtml(ins.digestOppose || 'No critic comments to summarize yet.')}</p>
        </div>
      </div>
    </div>`;
}

export function briefingPanel(pid: string, loading: boolean): string {
    const ins = LIVE.insights[pid];
    if (loading && !ins?.briefing) {
        return `<div class="panel briefing">
          <div class="panel-hd">${aiLabel('AI generated briefing, grounded in search')}</div>
          <p class="briefing-body">Generating a current briefing from search results. This takes a few seconds.</p>
        </div>`;
    }
    if (!ins?.briefing) return '';
    const when = ins.briefingAt ? timeAgo(ins.briefingAt).toUpperCase() : '';
    return `<div class="panel briefing">
      <div class="panel-hd">
        ${aiLabel('AI generated briefing, grounded in search')}
        ${when ? `<span class="mlabel">Generated ${when}</span>` : ''}
      </div>
      <p class="briefing-body">${escHtml(ins.briefing)}</p>
      <button class="quiet-link" onclick="openMethod()">What this is and is not</button>
    </div>`;
}
