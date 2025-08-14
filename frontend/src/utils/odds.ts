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
