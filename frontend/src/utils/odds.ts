export type OddsFormat = 'american' | 'decimal' | 'fractional';

export function toDecimalOdds(input: string | number, format: OddsFormat): number {
  const val = typeof input === 'number' ? String(input) : input.trim();
  if (format === 'decimal') {
    const d = Number(val);
    if (!isFinite(d) || d <= 1) throw new Error('Decimal odds must be > 1');
    return d;
  }
  if (format === 'american') {
    const a = Number(val);
    if (!Number.isFinite(a) || !Number.isInteger(a) || a === 0) {
      throw new Error('American odds must be a non-zero integer');
    }
    return a > 0 ? 1 + a / 100 : 1 + 100 / Math.abs(a);
  }
  // fractional
  const parts = val.split('/');
  if (parts.length !== 2) throw new Error('Fractional odds must be in a/b form');
  const num = Number(parts[0]);
  const den = Number(parts[1]);
  if (!isFinite(num) || !isFinite(den) || den <= 0) {
    throw new Error('Fractional odds require a/b with b>0');
  }
  return 1 + num / den;
}

export function toImpliedProbabilityFromDecimal(decimalOdds: number): number {
  if (!isFinite(decimalOdds) || decimalOdds <= 1) {
    throw new Error('Decimal odds must be > 1');
  }
  return 1 / decimalOdds;
}

export function expectedValuePerUnit(decimalOdds: number, pTrue: number, stake = 1): number {
  if (!isFinite(decimalOdds) || decimalOdds <= 1) throw new Error('Decimal odds must be > 1');
  if (!isFinite(pTrue) || pTrue < 0 || pTrue > 1) throw new Error('True probability must be between 0 and 1');
  if (!isFinite(stake) || stake < 0) throw new Error('Stake must be >= 0');
  const netIfWin = (decimalOdds - 1) * stake;
  const netIfLose = stake;
  return pTrue * netIfWin - (1 - pTrue) * netIfLose;
}

export function isPositiveEv(decimalOdds: number, pTrue: number): boolean {
  return pTrue > 1 / decimalOdds;
}

// ---- Additional helpers for formatting/conversions ----
export function probabilityToDecimal(pTrue: number): number {
  if (!isFinite(pTrue) || pTrue <= 0 || pTrue >= 1) {
    throw new Error('Probability must be between 0 and 1 (exclusive)');
  }
  return 1 / pTrue;
}

export function decimalToAmerican(decimalOdds: number): number {
  if (!isFinite(decimalOdds) || decimalOdds <= 1) {
    throw new Error('Decimal odds must be > 1');
  }
  const profit = decimalOdds - 1;
  if (decimalOdds >= 2) {
    // positive American odds
    return Math.round(profit * 100);
  }
  // negative American odds
  return -Math.round(100 / profit);
}

export function decimalToFractional(decimalOdds: number, maxDenominator = 100): string {
  if (!isFinite(decimalOdds) || decimalOdds <= 1) {
    throw new Error('Decimal odds must be > 1');
  }
  const x = decimalOdds - 1; // fractional part profit
  // Continued fraction approximation to limit denominator
  let h1 = 1, h0 = 0;
  let k1 = 0, k0 = 1;
  let b = x;
  let a = Math.floor(b);
  let num = a, den = 1;
  for (let i = 0; i < 20; i++) {
    const tempH = a * h1 + h0;
    const tempK = a * k1 + k0;
    h0 = h1; k0 = k1;
    h1 = tempH; k1 = tempK;
    num = h1; den = k1;
    const frac = num / den;
    if (den > maxDenominator || Math.abs(frac - x) < 1e-6) break;
    b = 1 / (b - a);
    a = Math.floor(b);
  }
  // Simplify just in case
  const g = gcd(num, den);
  return `${Math.round(num / g)}/${Math.round(den / g)}`;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a), y = Math.abs(b);
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

export function formatAmerican(american: number): string {
  return american > 0 ? `+${american}` : `${american}`;
}
