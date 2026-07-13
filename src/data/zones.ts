import type { Zone, ZoneDefinition } from '../types.js';

export const ZONES: ZoneDefinition[] = [
    { name: 'Southwest', states: 'Lagos, Ogun, Oyo, Osun, Ekiti, Ondo', stateCount: 6 },
    { name: 'Southeast', states: 'Anambra, Enugu, Imo, Abia, Ebonyi', stateCount: 5 },
    { name: 'South-South', states: 'Rivers, Delta, Bayelsa, Edo, Cross River, Akwa Ibom', stateCount: 6 },
    { name: 'Northwest', states: 'Kano, Kaduna, Katsina, Zamfara, Kebbi, Sokoto, Jigawa', stateCount: 7 },
    { name: 'Northeast', states: 'Borno, Adamawa, Yobe, Gombe, Bauchi, Taraba', stateCount: 6 },
    { name: 'North Central', states: 'Kogi, Benue, Plateau, Kwara, Niger, Nasarawa, FCT', stateCount: 7 },
];

export const STATE_ZONES: { state: string; zone: Zone }[] = [
    { state: 'Abia', zone: 'Southeast' },
    { state: 'Adamawa', zone: 'Northeast' },
    { state: 'Akwa Ibom', zone: 'South-South' },
    { state: 'Anambra', zone: 'Southeast' },
    { state: 'Bauchi', zone: 'Northeast' },
    { state: 'Bayelsa', zone: 'South-South' },
    { state: 'Benue', zone: 'North Central' },
    { state: 'Borno', zone: 'Northeast' },
    { state: 'Cross River', zone: 'South-South' },
    { state: 'Delta', zone: 'South-South' },
    { state: 'Ebonyi', zone: 'Southeast' },
    { state: 'Edo', zone: 'South-South' },
    { state: 'Ekiti', zone: 'Southwest' },
    { state: 'Enugu', zone: 'Southeast' },
    { state: 'FCT Abuja', zone: 'North Central' },
    { state: 'Gombe', zone: 'Northeast' },
    { state: 'Imo', zone: 'Southeast' },
    { state: 'Jigawa', zone: 'Northwest' },
    { state: 'Kaduna', zone: 'Northwest' },
    { state: 'Kano', zone: 'Northwest' },
    { state: 'Katsina', zone: 'Northwest' },
    { state: 'Kebbi', zone: 'Northwest' },
    { state: 'Kogi', zone: 'North Central' },
    { state: 'Kwara', zone: 'North Central' },
    { state: 'Lagos', zone: 'Southwest' },
    { state: 'Nasarawa', zone: 'North Central' },
    { state: 'Niger', zone: 'North Central' },
    { state: 'Ogun', zone: 'Southwest' },
    { state: 'Ondo', zone: 'Southwest' },
    { state: 'Osun', zone: 'Southwest' },
    { state: 'Oyo', zone: 'Southwest' },
    { state: 'Plateau', zone: 'North Central' },
    { state: 'Rivers', zone: 'South-South' },
    { state: 'Sokoto', zone: 'Northwest' },
    { state: 'Taraba', zone: 'Northeast' },
    { state: 'Yobe', zone: 'Northeast' },
    { state: 'Zamfara', zone: 'Northwest' },
];

export function zoneOfState(state: string): Zone | null {
    const hit = STATE_ZONES.find(sz => sz.state === state);
    return hit ? hit.zone : null;
}
