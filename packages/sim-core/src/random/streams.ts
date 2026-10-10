// Streams 1-255 stay tools/worldgen's (rng.py), and LOOK is its stream. Agent and ledger streams start from separate
// salts, so a focus change can never shift another layer's draw (R4 architecture §3.7).
export const LOOK = 11;
export const AGENT_SALT = 0x100;
export const LEDGER_SALT = 0x200;
export const CULTURE = AGENT_SALT + 1;
export const SPAWN = AGENT_SALT + 2;
export const WANDER = AGENT_SALT + 3;
export const STRIDE = AGENT_SALT + 4;
export const FESTIVAL = AGENT_SALT + 5;
export const PERSON_NAME = AGENT_SALT + 6;
// One stream per economy folder that draws, so a change in one folder never shifts another's draws (M2.1).
export const FIRM_DRAW = AGENT_SALT + 7;
export const WAGE_DRAW = AGENT_SALT + 8;
export const LABOUR_DRAW = AGENT_SALT + 9;
export const SHOP_DRAW = AGENT_SALT + 10;
export const WEALTH_DRAW = AGENT_SALT + 11;
export const START_DRAW = AGENT_SALT + 12;
// Spawn's own, apart from populate's SPAWN: its draws key on (settlement, day), so a place on a day is one city (M2.2).
export const SPAWN_DRAW = AGENT_SALT + 13;

export function layerOf(stream: number): 'world' | 'agent' | 'ledger' {
  if (stream < AGENT_SALT) return 'world';
  return stream < LEDGER_SALT ? 'agent' : 'ledger';
}
