import { getC, getCm } from '../lib/storage.js';
import { POLS } from '../data/politicians.js';
import { RB } from '../data/regionalBias.js';
export function fmt(n) {
    if (n >= 1e6)
        return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3)
        return (n / 1e3).toFixed(1) + 'K';
    return String(n);
}
export function pct(s, o) {
    const t = s + o;
    if (!t)
        return { sp: 0, op: 0 };
    return { sp: Math.round(s / t * 100), op: Math.round(o / t * 100) };
}
export function ini(name) {
    return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}
export function timeAgo(ts) {
    const d = Date.now() - ts;
    if (d < 60000)
        return 'just now';
    if (d < 3600000)
        return Math.floor(d / 60000) + 'm ago';
    if (d < 86400000)
        return Math.floor(d / 3600000) + 'h ago';
    return Math.floor(d / 86400000) + 'd ago';
}
export function tagClass(p) {
    return { APC: 'apc', PDP: 'pdp', 'Labour': 'lp', 'Labour Party': 'lp', NNPP: 'nnpp', APGA: 'apga' }[p] || 'indep';
}
export function rpct(pid, zone) {
    const c = getC(), pol = POLS.find(p => p.id === pid);
    if (!pol)
        return 50;
    const cv = c[pid] || { s: 0, o: 0 };
    const { sp } = pct(cv.s, cv.o);
    const b = (RB[pid] && RB[pid][zone]) || 1.0;
    if (!cv.s && !cv.o)
        return 40 + Math.floor(Math.random() * 22);
    return Math.min(96, Math.max(4, Math.round(sp * b)));
}
export function escHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
export function totalComments() {
    const cm = getCm();
    return Object.values(cm).reduce((a, arr) => a + (arr ? arr.length : 0), 0);
}
