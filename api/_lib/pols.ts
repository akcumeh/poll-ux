import { POLS } from '../../src/data/politicians.js';

export interface PolInfo {
    name: string;
    party: string;
    role: string;
    state: string;
}

const BY_ID: Record<string, PolInfo> = Object.fromEntries(
    POLS.map(p => [p.id, { name: p.name, party: p.party, role: p.role, state: p.state }]),
);

export function getPol(id: unknown): PolInfo | null {
    if (typeof id !== 'string') {
        return null;
    }
    return BY_ID[id] ?? null;
}
