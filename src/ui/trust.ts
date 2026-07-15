import type { VoteCounts, VoteDirection, Comment } from '../types.js';
import { getUV, getCm, getRegion, saveRegion } from '../lib/storage.js';
import { LIVE, cooldownRemaining, commentBlockRemaining } from '../lib/live.js';
import { MIN_COMMENTS_AI, COMMENT_MAX_LENGTH, BRIEFING_REFRESH_SHOW_MS, currentHourStart } from '../lib/constants.js';
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
                    'You have not voted on them yet';
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
      <div class="cooldown-hd">Easy does it</div>
      <div class="cooldown-bd">You just changed this vote. You can change it again in about ${secs} seconds.</div>
    </div>`;
}

export function aiLabel(text: string): string {
    return `<span class="mlabel violet">${text}</span>`;
}

export function methodLink(label = 'How?'): string {
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

export function openRegionPrompt(): void {
    const root = document.getElementById('modal-root');
    if (!root) return;
    root.innerHTML = `<div class="modal-overlay" onclick="regionSkip()">
      <div class="modal" onclick="event.stopPropagation()">
        <div class="mlabel" style="margin-bottom:10px">Which state do you vote from?</div>
        <p class="modal-body">Totally optional. It powers the Regions page and nobody can trace it back to you. Skip it and your votes still count nationally.</p>
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
      <div class="mlabel" style="margin-bottom:14px">Which state do you vote from?</div>
      <p class="panel-body">Totally optional. It powers the Regions page and nobody can trace it back to you. Skip it and your votes still count nationally.</p>
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

export function regionFooterLink(): string {
    return `<p class="region-footer">
      <button class="quiet-link" onclick="openRegionPromptUI()">Add the state you vote from, it powers the Regions page</button>
    </p>`;
}

export function openRegionPromptUI(): void {
    openRegionPrompt();
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
          <div class="mlabel lime">The percentages</div>
          <p>Support, undecided and oppose are simple shares of everyone who has voted on that politician. You get one active vote per politician, and you can vote on as many politicians as you like, change your mind, or take a vote back anytime.</p>
        </div>
        <div class="method-sec">
          <div class="mlabel lime">Regional numbers</div>
          <p>A vote only counts toward a zone when the voter chose to share their state. Zones without enough votes show no percentage at all. We never estimate or fill in a missing number.</p>
        </div>
        <div class="method-sec">
          <div class="mlabel lime">AI features</div>
          <p>The Passion Meter, Debate Digest and briefings are written by Google Gemini from public comments and search results. They are always labeled as AI, and they are commentary about the conversation, never poll numbers.</p>
        </div>
        <div class="method-sec">
          <div class="mlabel lime">Honesty</div>
          <p>Voting is anonymous, so nobody has to sign up and nobody can be traced. The flip side is that we cannot verify who anyone is, so treat the numbers as a mood check, not a scientific poll. Rate limits and server checks stop rapid or duplicate voting.</p>
        </div>
      </div>
    </div>`;
}

export function closeMethod(): void {
    closeModal();
}

let heldTimer = 0;
let blockTimer = 0;

export function commentThread(pid: string): string {
    const nextExpiry = purgeExpiredHeld(pid);
    window.clearTimeout(heldTimer);
    if (nextExpiry > 0) {
        heldTimer = window.setTimeout(refresh, nextExpiry + 500);
    }
    const cm = getCm();
    const all = (cm[pid] || []).slice().sort((a, b) => a.ts - b.ts);
    const rows = all.map(c => commentRow(c)).join('');

    const blockedSecs = commentBlockRemaining(pid);
    window.clearTimeout(blockTimer);
    if (blockedSecs > 0) {
        blockTimer = window.setTimeout(refresh, blockedSecs * 1000 + 250);
    }
    const form = blockedSecs > 0
        ? `<div class="cform">
            <input class="cform-input" disabled placeholder="Okay, go blow off some steam for a minute, then you can try again.">
            <button class="btn-solid" disabled>Submit</button>
          </div>`
        : `<div class="cform">
            <input class="cform-input" id="ctxt-${pid}" maxlength="${COMMENT_MAX_LENGTH}"
              placeholder="Why do you support or oppose them? Say your own."
              onkeydown="if(event.key==='Enter'){submitCommentUI('${pid}')}">
            <button class="btn-solid" onclick="submitCommentUI('${pid}')">Submit</button>
          </div>`;

    return `<div class="cthread">
      <div class="cthread-hd">
        <h2 class="sec-title-sm">Comments</h2>
        <span class="cthread-note">All comments are anonymous and checked before they go live</span>
      </div>
      <div class="cthread-list">${rows || `<p class="cthread-empty">No comments yet. Be the first to say something.</p>`}</div>
      ${form}
      <div class="cform-meta"><span class="char-count" id="cc-${pid}"></span></div>
    </div>`;
}

function commentRow(c: Comment): string {
    const dirLabel = c.sentiment === 's' ? 'Supports' : c.sentiment === 'o' ? 'Opposes' : c.sentiment === 'u' ? 'Undecided' : 'Not voted yet';
    const dirCls = c.sentiment === 's' ? 'cdir-s' : c.sentiment === 'o' ? 'cdir-o' : c.sentiment === 'u' ? 'cdir-u' : 'cdir-n';
    const reported = !!LIVE.reported[c.id];

    let foot: string;
    if (c.status === 'pending') {
        foot = `<div class="crow-held-note">Awaiting review</div>`;
    } else if (c.status === 'held') {
        foot = `<div class="crow-rejected-note">Your comment may have violated our rules of conduct, so it will not be published. You can try a different comment in a minute, but choose your words carefully.</div>`;
    } else {
        foot = `<button class="crow-report ${reported ? 'on' : ''}" onclick="reportCommentUI('${c.id}')">${reported ? 'Reported. Thank you' : 'Report'}</button>`;
    }

    return `<div class="crow ${c.status !== 'approved' ? 'crow-held' : ''}">
      <div class="crow-meta">
        <div class="crow-av">${escHtml(c.voter.slice(0, 2).toUpperCase())}</div>
        <span class="crow-handle">${escHtml(c.voter)}</span>
        <span class="cdir ${dirCls}">${dirLabel}</span>
        <span class="crow-time">${timeAgo(c.ts)}</span>
      </div>
      <p class="crow-text">${escHtml(c.text)}</p>
      ${foot}
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
        <div class="pm-foot">Measures debate intensity. Aggregated from ${fmt(approved)} comments.</div>`;
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

const REFRESH_ICON = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>`;

let briefingBtnTimer = 0;

export function briefingPanel(pid: string, loading: boolean): string {
    const ins = LIVE.insights[pid];
    if (!ins?.briefing || !ins.briefingAt) {
        if (loading) {
            return `<div class="panel briefing">
              <div class="panel-hd">${aiLabel('AI generated briefing, grounded in search')}</div>
              <p class="briefing-body">Putting together a current briefing from search results. This takes a few seconds.</p>
            </div>`;
        }
        return '';
    }

    const age = Date.now() - ins.briefingAt;
    const hourStart = currentHourStart();
    const nextHour = hourStart + 60 * 60 * 1000;
    let refreshBtn = '';
    window.clearTimeout(briefingBtnTimer);
    if (age < BRIEFING_REFRESH_SHOW_MS) {
        briefingBtnTimer = window.setTimeout(refresh, BRIEFING_REFRESH_SHOW_MS - age + 250);
    } else if (ins.briefingAt >= hourStart) {
        const hourLabel = new Date(nextHour).toLocaleTimeString('en-NG', { hour: 'numeric' });
        briefingBtnTimer = window.setTimeout(refresh, nextHour - Date.now() + 1000);
        refreshBtn = `<button class="refresh-btn" disabled title="Please wait until ${hourLabel} to request a new briefing.">${REFRESH_ICON}</button>`;
    } else {
        refreshBtn = `<button class="refresh-btn" onclick="refreshBriefing()" title="Fetch a fresh briefing">${REFRESH_ICON}</button>`;
    }

    const when = age < 60 * 1000 ? '1M AGO' : timeAgo(ins.briefingAt).toUpperCase();
    return `<div class="panel briefing">
      <div class="panel-hd">
        ${aiLabel('AI generated briefing, grounded in search')}
        <span class="briefing-when">${refreshBtn}<span class="mlabel">Generated ${when}</span></span>
      </div>
      <p class="briefing-body">${escHtml(ins.briefing)}</p>
      <button class="quiet-link" onclick="openMethod()">What this is and is not</button>
    </div>`;
}
