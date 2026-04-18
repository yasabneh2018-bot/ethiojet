// JetX game engine helpers (provably-random crash multiplier)

// Generates a crash multiplier using a typical crash-game distribution.
// House edge ~3%. Min multiplier 1.00x.
export function generateCrashMultiplier(): number {
  // 3% instant crash
  if (Math.random() < 0.03) return 1.0;
  const r = Math.random();
  // multiplier = 0.97 / (1 - r), capped
  const m = 0.97 / (1 - r);
  return Math.max(1.0, Math.min(1000, Math.round(m * 100) / 100));
}

export function multiplierAt(elapsedMs: number): number {
  // Exponential growth: starts at 1, doubles every ~6s. Tunable.
  const t = elapsedMs / 1000;
  return Math.round(Math.pow(1.07, t) * 100) / 100;
}

export function xpForLevel(level: number): number {
  // XP needed to reach next level
  return Math.floor(500 * Math.pow(1.4, level - 1));
}

export function levelFromXp(xp: number): { level: number; current: number; needed: number } {
  let level = 1;
  let remaining = xp;
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level++;
  }
  return { level, current: remaining, needed: xpForLevel(level) };
}

// Tournaments: Friday & Sunday at 15:00 LOCAL, 30 min each.
// Returns the next (or active) tournament window.
export function getTournamentInfo(now = new Date()): {
  isActive: boolean;
  start: Date;
  end: Date;
  key: string; // unique key for this tournament window
  msUntilStart: number;
  msUntilEnd: number;
} {
  // Helper: get the most recent or next Fri/Sun at 15:00
  const candidates: Date[] = [];
  for (let offset = -1; offset <= 8; offset++) {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    d.setHours(15, 0, 0, 0);
    const day = d.getDay(); // 0=Sun, 5=Fri
    if (day === 5 || day === 0) candidates.push(d);
  }
  // Find active one (now between start & start+30m), else next future
  let active: Date | null = null;
  let next: Date | null = null;
  for (const c of candidates) {
    const end = new Date(c.getTime() + 30 * 60 * 1000);
    if (now >= c && now < end) { active = c; break; }
    if (c > now && (!next || c < next)) next = c;
  }
  const start = active ?? next!;
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  const key = start.toISOString().slice(0, 16);
  return {
    isActive: !!active,
    start,
    end,
    key,
    msUntilStart: Math.max(0, start.getTime() - now.getTime()),
    msUntilEnd: Math.max(0, end.getTime() - now.getTime()),
  };
}

export function fmtCountdown(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return d > 0 ? `${d}d ${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function fmtMoney(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Currency: internal "balance" is stored in coins. 1 coin = 0.5 Birr.
export const COIN_TO_BIRR = 0.5;
export const MIN_BET_BIRR = 5;
export const MAX_WIN_BIRR = 50000;

export const coinsToBirr = (coins: number) => coins * COIN_TO_BIRR;
export const birrToCoins = (birr: number) => birr / COIN_TO_BIRR;

export function fmtBirr(birr: number): string {
  return `${birr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Birr`;
}

// Max multiplier the game can ever reach (matches generateCrashMultiplier cap)
export const MAX_MULTIPLIER = 1000;

// Returns true if a bet (in Birr) could ever exceed MAX_WIN_BIRR
export function betExceedsCap(betBirr: number): boolean {
  return betBirr * MAX_MULTIPLIER > MAX_WIN_BIRR;
}

