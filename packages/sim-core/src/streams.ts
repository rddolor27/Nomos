// Streams 1-255 stay tools/worldgen's (rng.py), and LOOK is its stream. Agent and ledger streams start from separate
// salts, so a focus change can never shift another layer's draw (R4 architecture §3.7).
export const LOOK = 11;
export const AGENT_SALT = 0x100;
export const LEDGER_SALT = 0x200;
export const CULTURE = AGENT_SALT + 1;
export const SPAWN = AGENT_SALT + 2;
export const WANDER = AGENT_SALT + 3;

export function layerOf(stream: number): 'world' | 'agent' | 'ledger' {
  if (stream < AGENT_SALT) return 'world';
  return stream < LEDGER_SALT ? 'agent' : 'ledger';
}
