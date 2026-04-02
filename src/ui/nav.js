export const PAGES = {
    home: 'pg-home',
    polls: 'pg-polls',
    lb: 'pg-lb',
    rg: 'pg-rg',
    about: 'pg-about'
};
// Filled in by main.ts after all page modules load — avoids circular imports
export const RENDERERS = {
    home: () => { },
    polls: () => { },
    lb: () => { },
    rg: () => { },
    about: () => { }
};
export function go(id) {
    Object.values(PAGES).forEach(pid => {
        const el = document.getElementById(pid);
        if (el)
            el.classList.remove('on');
    });
    const pg = document.getElementById(PAGES[id]);
    if (pg)
        pg.classList.add('on');
    ['home', 'polls', 'lb', 'rg', 'about'].forEach(n => {
        (['nl-' + n, 'mn-' + n]).forEach(eid => {
            const el = document.getElementById(eid);
            if (el)
                el.className = n === id ? 'on' : '';
        });
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (RENDERERS[id])
        RENDERERS[id]();
}
export function refresh() {
    const a = document.querySelector('.page.on');
    if (a) {
        const id = a.id.replace('pg-', '');
        if (RENDERERS[id])
            RENDERERS[id]();
    }
}
export function toggleMnav() {
    const h = document.getElementById('hbg'), m = document.getElementById('mnav');
    h.classList.toggle('open');
    m.classList.toggle('open');
    h.setAttribute('aria-expanded', String(m.classList.contains('open')));
}
export function closeMnav() {
    document.getElementById('hbg').classList.remove('open');
    document.getElementById('mnav').classList.remove('open');
}
