import { POLS } from '../data/politicians.js';
export const SK = 'pollux_c1';
export const UK = 'pollux_uv1';
export const CK = 'pollux_cm1';
export const HK = 'pollux_usr1';
export const UID_KEY = 'pollux_uid';
export function getC() {
    try {
        const d = localStorage.getItem(SK);
        if (d)
            return JSON.parse(d);
    }
    catch (e) { }
    const i = {};
    POLS.forEach(p => { i[p.id] = { s: 0, o: 0 }; });
    saveC(i);
    return i;
}
export function saveC(c) {
    try {
        localStorage.setItem(SK, JSON.stringify(c));
    }
    catch (e) { }
}
export function getUV() {
    try {
        return JSON.parse(localStorage.getItem(UK) || '{}');
    }
    catch (e) {
        return {};
    }
}
export function saveUV(v) {
    try {
        localStorage.setItem(UK, JSON.stringify(v));
    }
    catch (e) { }
}
export function getCm() {
    try {
        return JSON.parse(localStorage.getItem(CK) || '{}');
    }
    catch (e) {
        return {};
    }
}
export function saveCm(c) {
    try {
        localStorage.setItem(CK, JSON.stringify(c));
    }
    catch (e) { }
}
export function getHandle() {
    try {
        let h = localStorage.getItem(HK);
        if (h)
            return h;
        const adj = ['Candid', 'Astute', 'Civic', 'Vigilant', 'Informed', 'Earnest', 'Honest', 'Active'];
        h = adj[Math.floor(Math.random() * adj.length)] + '_Voter' + Math.floor(Math.random() * 9999);
        localStorage.setItem(HK, h);
        return h;
    }
    catch (e) {
        return 'Anonymous_Voter';
    }
}
export function getUID() {
    try {
        let id = localStorage.getItem(UID_KEY);
        if (id)
            return id;
        id = 'anon_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
        localStorage.setItem(UID_KEY, id);
        return id;
    }
    catch (e) {
        return 'anon_fallback';
    }
}
