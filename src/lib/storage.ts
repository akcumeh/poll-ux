import type { CountStore, UserVoteStore, CommentStore, Zone } from '../types.js';
import { POLS } from '../data/politicians.js';

export const SK = 'pollux_c2';
export const UK = 'pollux_uv1';
export const CK = 'pollux_cm2';
export const HK = 'pollux_usr1';
export const UID_KEY = 'pollux_uid';
export const LV_KEY = 'pollux_lv1';
export const RG_KEY = 'pollux_region1';
export const HELD_KEY = 'pollux_held1';

function readJson<T>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(key);
        if (raw) {
            return JSON.parse(raw);
        }
    } catch (e) {
        // ignore
    }
    return fallback;
}

function writeJson(key: string, value: unknown): void {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        // ignore
    }
}

export function getC(): CountStore {
    const stored = readJson<CountStore | null>(SK, null);
    if (stored) {
        return stored;
    }
    const initial: CountStore = {};
    POLS.forEach(p => {
        initial[p.id] = { s: 0, o: 0, u: 0 };
    });
    saveC(initial);
    return initial;
}

export function saveC(c: CountStore): void {
    writeJson(SK, c);
}

export function getUV(): UserVoteStore {
    return readJson(UK, {});
}

export function saveUV(v: UserVoteStore): void {
    writeJson(UK, v);
}

export function getCm(): CommentStore {
    return readJson(CK, {});
}

export function saveCm(c: CommentStore): void {
    writeJson(CK, c);
}

export function getLV(): Record<string, number> {
    return readJson(LV_KEY, {});
}

export function saveLV(lv: Record<string, number>): void {
    writeJson(LV_KEY, lv);
}

export interface RegionChoice {
    state: string | null;
    zone: Zone | null;
    skipped: boolean;
}

export function getRegion(): RegionChoice | null {
    return readJson(RG_KEY, null);
}

export function saveRegion(r: RegionChoice): void {
    writeJson(RG_KEY, r);
}

export function getHeld(): CommentStore {
    return readJson(HELD_KEY, {});
}

export function saveHeld(h: CommentStore): void {
    writeJson(HELD_KEY, h);
}

export function getHandle(): string {
    try {
        const existing = localStorage.getItem(HK);
        if (existing) {
            return existing;
        }
        const adj = ['Candid', 'Astute', 'Civic', 'Vigilant', 'Informed', 'Earnest', 'Honest', 'Active'];
        const handle = adj[Math.floor(Math.random() * adj.length)] + '_Voter' + Math.floor(Math.random() * 9999);
        localStorage.setItem(HK, handle);
        return handle;
    } catch (e) {
        return 'Anonymous_Voter';
    }
}

export function getUID(): string {
    try {
        const existing = localStorage.getItem(UID_KEY);
        if (existing) {
            return existing;
        }
        const id = 'anon_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
        localStorage.setItem(UID_KEY, id);
        return id;
    } catch (e) {
        return 'anon_fallback';
    }
}
