import { normalRandom } from "./random.js";
import { capitalGainsTax } from "./tax.js";

/**
 * Geometric Brownian motion with fat tails.
 *
 * Plain GBM understates how often equities move violently, which matters a
 * great deal when the question is "can I afford for this to go wrong". The
 * jump terms add occasional crashes and melt-ups so the downside percentiles
 * are not quietly optimistic.
 *
 * Returns a multiplier path starting at 1.0.
 */
export function pricePath(rng, steps, drift, vol, stepsPerYear = 12) {
  const dt = 1 / stepsPerYear;
  const path = [1.0];
  const crashProb = 0.02 * dt * 4;
  const boomProb = 0.03 * dt * 4;

  for (let i = 0; i < steps; i++) {
    let ret;
    if (rng() < crashProb) ret = -0.15 - rng() * 0.25;
    else if (rng() < boomProb) ret = 0.15 + rng() * 0.20;
    else ret = drift * dt + normalRandom(rng) * vol * Math.sqrt(dt);
    path.push(path[path.length - 1] * (1 + ret));
  }
  return path;
}

/** After-tax proceeds from selling vested shares today. */
export function saleProceeds(equity, { otherIncome, stateRate, flatCapGainsRate }) {
  const shares = Math.min(equity.sharesToSell, equity.vestedShares);
  const gross = shares * equity.price;
  const gain = Math.max(0, shares * (equity.price - equity.costBasis));
  const { tax, rate } = capitalGainsTax(gain, {
    longTerm: equity.saleIsLongTerm,
    otherIncome,
    stateRate,
    flatRate: flatCapGainsRate,
  });
  return { shares, gross, gain, tax, rate, net: gross - tax };
}

/** Remaining principal after `paymentsMade` scheduled payments. */
export function remainingBalance(principal, annualRate, termMonths, paymentsMade) {
  if (principal <= 0) return 0;
  const n = Math.min(Math.max(paymentsMade, 0), termMonths);
  const r = annualRate / 12;
  if (r === 0) return principal * (1 - n / termMonths);
  const pmt = (principal * r * Math.pow(1 + r, termMonths)) / (Math.pow(1 + r, termMonths) - 1);
  return Math.max(0, principal * Math.pow(1 + r, n) - pmt * ((Math.pow(1 + r, n) - 1) / r));
}

export const equityValue = e => (e.vestedShares + e.unvestedShares) * e.price;
export const vestedValue = e => e.vestedShares * e.price;
export const unrealizedGain = e => e.vestedShares * Math.max(0, e.price - e.costBasis);
export const hasEquity = e => e && (e.vestedShares > 0 || e.unvestedShares > 0);
