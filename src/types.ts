export type Zone = 'Southwest' | 'Southeast' | 'South-South' | 'Northwest' | 'Northeast' | 'North Central';
export type Party = 'APC' | 'PDP' | 'Labour' | 'NNPP' | 'APGA' | 'Independent' | 'ADC';
export type PoliticianType = 'National' | 'Governor' | 'Senator';
export type VoteDirection = 's' | 'o' | 'u';
export type PageId = 'home' | 'polls' | 'lb' | 'rg' | 'detail' | 'pulse';
export type SortMode = 'trending' | 'supported' | 'opposed' | 'polarising' | 'alpha';
export type CommentStatus = 'approved' | 'held' | 'pending';
export type ModerationLabel = 'clean' | 'abusive' | 'spam' | 'incitement';

export interface Politician {
  id: string;
  name: string;
  abbr: string;
  party: Party;
  type: PoliticianType;
  role: string;
  state: string;
  region: Zone;
  bio: string;
  seeds: { s: number; o: number };
}

export interface VoteCounts {
  s: number;
  o: number;
  u: number;
}

export interface CountStore {
  [id: string]: VoteCounts;
}

export interface UserVoteStore {
  [id: string]: VoteDirection;
}

export interface Comment {
  id: string;
  voter: string;
  text: string;
  sentiment: VoteDirection | 'neutral';
  ts: number;
  status: CommentStatus;
  mine?: boolean;
}

export interface CommentStore {
  [id: string]: Comment[];
}

export interface PctResult {
  sp: number;
  op: number;
  up: number;
}

export interface ZoneDefinition {
  name: Zone;
  states: string;
  stateCount: number;
}

export interface ZoneStats {
  zone: Zone;
  s: number;
  o: number;
  u: number;
  total: number;
}

export interface PolZoneStats {
  politicianId: string;
  zone: Zone;
  s: number;
  o: number;
  u: number;
  total: number;
}

export interface AiInsights {
  politicianId: string;
  temperature: number | null;
  emotions: string[];
  tempSummary: string | null;
  digestSupport: string | null;
  digestOppose: string | null;
  briefing: string | null;
  briefingAt: number | null;
  computedAt: number | null;
  commentCount: number;
}

export interface CastVoteResult {
  ok: boolean;
  error?: 'cooldown' | 'daily_limit' | 'unknown';
  retryAfterSeconds?: number;
}
