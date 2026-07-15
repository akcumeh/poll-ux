import type { PageId } from '../types.js';

export const PAGES: Record<PageId, string> = {
    home: 'pg-home',
    polls: 'pg-polls',
    lb: 'pg-lb',
    rg: 'pg-rg',
    detail: 'pg-detail',
    pulse: 'pg-pulse',
};

export const RENDERERS: Record<PageId, () => void> = {
    home: () => {},
    polls: () => {},
    lb: () => {},
    rg: () => {},
    detail: () => {},
    pulse: () => {},
};

const NAV_IDS: PageId[] = ['home', 'polls', 'lb', 'rg', 'pulse'];

export function go(id: PageId): void {
    Object.values(PAGES).forEach(pid => {
        const el = document.getElementById(pid); if (el) el.classList.remove('on');
    });
    const pg = document.getElementById(PAGES[id]); if (pg) pg.classList.add('on');
    const navActive: PageId = id === 'detail' ? 'polls' : id;
    NAV_IDS.forEach(n => {
        (['nl-' + n, 'mn-' + n]).forEach(eid => {
            const el = document.getElementById(eid);
            if (el) el.className = n === navActive ? 'on' : '';
        });
    });
    if (id !== 'detail' && new URLSearchParams(location.search).has('pol')) {
        history.pushState({}, '', location.pathname);
    }
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
        viewport.setAttribute('content', id === 'detail'
            ? 'width=device-width, initial-scale=1.0, maximum-scale=1'
            : 'width=device-width, initial-scale=1.0');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (RENDERERS[id]) RENDERERS[id]();
}

export function refresh(): void {
    const a = document.querySelector('.page.on');
    if (a) {
        const id = a.id.replace('pg-', '') as PageId;
        if (RENDERERS[id]) RENDERERS[id]();
    }
}

export function toggleMnav(): void {
    const h = document.getElementById('hbg')!, m = document.getElementById('mnav')!;
    h.classList.toggle('open'); m.classList.toggle('open');
    h.setAttribute('aria-expanded', String(m.classList.contains('open')));
}

export function closeMnav(): void {
    document.getElementById('hbg')!.classList.remove('open');
    document.getElementById('mnav')!.classList.remove('open');
}
