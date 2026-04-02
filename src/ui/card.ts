import type { Politician, VoteDirection } from '../types.js';
import { getC, getUV, getCm } from '../lib/storage.js';
import { fmt, pct, ini, timeAgo, tagClass, escHtml } from '../lib/helpers.js';
import { castVote } from '../api/votes.js';
import { addComment } from '../api/comments.js';
import { POLS } from '../data/politicians.js';
import { showToast } from '../ui/toast.js';
import { refresh } from '../ui/nav.js';

// Track open comment forms
export const openForms: Record<string, boolean> = {};
export const openComments: Record<string, boolean> = {};

export function card(pol: Politician): string {
    const c = getC(), uv = getUV(), cm = getCm();
    const cv = c[pol.id] || { s: 0, o: 0 };
    const { sp, op } = pct(cv.s, cv.o);
    const voted = uv[pol.id], total = cv.s + cv.o;
    const comments = cm[pol.id] || [];
    const showForm = !!openForms[pol.id];
    const showCmts = !!openComments[pol.id];
    const barW = total === 0 ? 0 : sp;

    const commentsList = showCmts && comments.length > 0 ? `
    <div class="comment-list">
      ${comments.slice(-5).map(c => `
        <div class="comment-item">
          <div class="comment-avatar">${c.voter.charAt(0)}</div>
          <div class="comment-body">
            <div class="comment-meta">
              <span class="comment-voter">${c.voter}</span>
              <span class="comment-time">${timeAgo(c.ts)}</span>
              <span class="${c.sentiment === 's' ? 'comment-sent-up' : 'comment-sent-down'}">${c.sentiment === 's' ? '↑ Support' : '↓ Oppose'}</span>
            </div>
            <p class="comment-text">${escHtml(c.text)}</p>
          </div>
        </div>
      `).join('')}
    </div>` : '';

    const commentForm = showForm ? `
    <div class="comment-form">
      <textarea class="comment-textarea" id="ctxt-${pol.id}" rows="3"
        placeholder="Share your perspective on ${pol.name.split(' ')[0]}…"
        oninput="document.getElementById('cc-${pol.id}').textContent=this.value.length+'/280'"
        maxlength="280"></textarea>
      <div class="comment-form-footer">
        <span class="char-count" id="cc-${pol.id}">0/280</span>
        <button class="comment-post-btn" onclick="doComment('${pol.id}')">Post</button>
      </div>
    </div>` : '';

    // Suppress unused variable warning — op is used in the HTML template for completeness
    void op;

    return `<div class="pcard" id="pc-${pol.id}">
    <div class="pcard-hd">
      <div class="av" style="background:${pol.color}">${ini(pol.name)}</div>
      <div class="pcard-info">
        <div class="pcard-name" title="${pol.name}">${pol.name}</div>
        <div class="pcard-tags">
          <span class="tag ${tagClass(pol.party)}">${pol.party}</span>
          <span class="tag type">${pol.type}</span>
        </div>
        <div class="pcard-role">${pol.role} · ${pol.state}</div>
      </div>
    </div>
    <p class="pcard-bio">${pol.bio}</p>
    <div class="vbar-wrap">
      <div class="vbar-track"><div class="vbar-fill" style="width:${barW}%"></div></div>
      <div class="vnums">
        <span class="vn-s">${total === 0 ? 'No votes yet' : fmt(cv.s) + ' support' + (total > 0 ? ' · ' + sp + '%' : '')}</span>
        <span class="vn-o">${total > 0 ? fmt(cv.o) + ' oppose' : ''}</span>
      </div>
    </div>
    <div class="vbtns">
      <button class="vbtn ${voted === 's' ? 'vs' : ''}" onclick="doVote('${pol.id}','s',event)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
        ${voted === 's' ? 'Supported ✓' : 'Support'}
      </button>
      <button class="vbtn ${voted === 'o' ? 'vo' : ''}" onclick="doVote('${pol.id}','o',event)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/><path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>
        ${voted === 'o' ? 'Opposed ✓' : 'Oppose'}
      </button>
    </div>
    <div class="comment-divider">
      <button class="comment-toggle" onclick="toggleComments('${pol.id}')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        ${comments.length} comment${comments.length !== 1 ? 's' : ''}
      </button>
      <button class="comment-add-btn" onclick="toggleForm('${pol.id}')">+ Add comment</button>
    </div>
    ${commentForm}
    ${commentsList}
    <button class="ai-btn" onclick="aiInfo('${pol.id}',event)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M12 16v-4M12 8h.01"/></svg>
      Ask AI about ${pol.name.split(' ')[0]}
    </button>
  </div>`;
}

export function doVote(pid: string, t: VoteDirection, e: Event): void {
    e.stopPropagation();
    const el = document.getElementById('pc-' + pid);
    if (el) { el.classList.add('blip'); setTimeout(() => el.classList.remove('blip'), 200) }
    castVote(pid, t);
}

export function toggleComments(pid: string): void {
    openComments[pid] = !openComments[pid];
    refresh();
}

export function toggleForm(pid: string): void {
    openForms[pid] = !openForms[pid];
    if (openForms[pid]) openComments[pid] = true;
    refresh();
    if (openForms[pid]) {
        setTimeout(() => { const el = document.getElementById('ctxt-' + pid); if (el) (el as HTMLTextAreaElement).focus() }, 50);
    }
}

export function doComment(pid: string): void {
    const el = document.getElementById('ctxt-' + pid) as HTMLTextAreaElement | null;
    if (!el || !el.value.trim()) return;
    addComment(pid, el.value);
    openForms[pid] = false;
    openComments[pid] = true;
}

export function aiInfo(pid: string, e: Event): void {
    e.stopPropagation();
    const pol = POLS.find(p => p.id === pid); if (!pol) return;
    const prompt = `Give me a current, factual briefing on Nigerian politician ${pol.name} (${pol.role}, ${pol.party}). Include:
1. Their current role and status as of today
2. Most recent major news or political activity (last 3-6 months)
3. Biggest political achievement or legacy
4. Current controversies or challenges they face
5. Their public approval perception in Nigeria right now
6. What they are likely to do politically in the next 12 months
Be concise, factual, and neutral.`;
    const copy = (txt: string) => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(txt).then(() => showToast('Prompt copied — paste into Claude.ai 🤖', '#a78bfa')).catch(() => fbCopy(txt));
        } else fbCopy(txt);
    };
    copy(prompt);
}

export function fbCopy(txt: string): void {
    const el = document.createElement('textarea'); el.value = txt;
    el.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(el);
    el.focus(); el.select();
    try { document.execCommand('copy'); showToast('Copied! Paste into Claude.ai 🤖', '#a78bfa') }
    catch (err) { showToast('Could not copy — try again', '#ef4444') }
    document.body.removeChild(el);
}
