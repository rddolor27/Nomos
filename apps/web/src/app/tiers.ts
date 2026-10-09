import { TIER_AGENTS, type Tier } from '@nomos/sim-protocol';

export const VERDICT_SAMPLES = 120;
export const PHONE_PLUS_MAX_MS = 13.3;
export const VERDICT_KEY = 'nomos.tier-check.v1';

const VERDICT_PERCENTILE = 0.95;
const PHONE_PLUS_SCALE = TIER_AGENTS['phone-plus'] / TIER_AGENTS.phone;

function isTier(value: unknown): value is Tier {
  return typeof value === 'string' && Object.hasOwn(TIER_AGENTS, value);
}

function isPhoneTier(tier: Tier | null): tier is 'phone' | 'phone-plus' {
  return tier === 'phone' || tier === 'phone-plus';
}

export function deviceClass(
  nav: { userAgent: string; userAgentData?: { mobile: boolean } },
  coarsePointer: boolean,
): 'phone' | 'desktop' {
  const mobile = nav.userAgentData?.mobile || /Android|iPhone|iPad|iPod/.test(nav.userAgent) || coarsePointer;
  return mobile ? 'phone' : 'desktop';
}

export function tierFromQuery(search: string): Tier | null {
  const value = new URLSearchParams(search).get('tier');
  return isTier(value) ? value : null;
}

export function chooseTier(device: 'phone' | 'desktop', verdict: Tier | null, override: Tier | null): Tier {
  if (device === 'desktop') return override ?? 'desktop';
  if (isPhoneTier(override)) return override;
  return isPhoneTier(verdict) ? verdict : 'phone';
}

// The check runs at the phone tier, so its 95th-percentile tick is scaled to phone-plus's agent count (M0.5 plan, Task 7).
export function tierVerdict(tickMs: number[]): 'phone' | 'phone-plus' | null {
  if (tickMs.length < VERDICT_SAMPLES) return null;
  const sorted = [...tickMs].sort((a, b) => a - b);
  const percentile = sorted[Math.ceil(VERDICT_PERCENTILE * sorted.length) - 1];
  return percentile * PHONE_PLUS_SCALE <= PHONE_PLUS_MAX_MS ? 'phone-plus' : 'phone';
}

export function loadVerdict(storage: Storage | null, build: string): Tier | null {
  try {
    const saved = JSON.parse(storage?.getItem(VERDICT_KEY) ?? 'null') as { build?: unknown; tier?: unknown } | null;
    return saved?.build === build && isTier(saved.tier) ? saved.tier : null;
  } catch {
    // A store that throws, as in Safari's private mode, or a damaged entry means no verdict.
    return null;
  }
}

export function saveVerdict(storage: Storage | null, build: string, verdict: Tier): void {
  try {
    storage?.setItem(VERDICT_KEY, JSON.stringify({ build, tier: verdict }));
  } catch {
    // The next start just runs the check again.
  }
}
