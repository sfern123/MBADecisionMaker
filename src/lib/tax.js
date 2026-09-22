import {
  FEDERAL_BRACKETS_SINGLE, LTCG_BRACKETS_SINGLE,
  STANDARD_DEDUCTION_SINGLE, NIIT,
} from "../data/taxData.js";

/** Progressive tax on `income` given cumulative-threshold brackets. */
export function bracketTax(income, brackets) {
  if (income <= 0) return 0;
  let tax = 0, prev = 0;
  for (const b of brackets) {
    if (income <= prev) break;
    tax += (Math.min(income, b.upTo) - prev) * b.rate;
    prev = b.upTo;
  }
  return tax;
}

/** Marginal rate that applies to the next dollar of ordinary income. */
export function marginalRate(income, brackets) {
  let prev = 0;
  for (const b of brackets) {
    if (income <= b.upTo) return b.rate;
    prev = b.upTo;
  }
  return brackets[brackets.length - 1].rate;
}

/**
 * Tax on a capital gain, stacked on top of other income.
 *
 * Long-term gains sit above ordinary income in their own rate schedule, so
 * how much of the gain falls in the 0/15/20% bands depends on what you
 * already earn. Short-term gains are just ordinary income. NIIT applies to
 * both above the threshold.
 *
 * Pass `flatRate` to bypass all of this — useful outside the US, or when you
 * already know your all-in rate.
 */
export function capitalGainsTax(gain, { longTerm, otherIncome, stateRate, flatRate }) {
  if (gain <= 0) return { tax: 0, rate: 0, federal: 0, niit: 0, state: 0 };

  if (flatRate != null) {
    const tax = gain * flatRate;
    return { tax, rate: flatRate, federal: tax, niit: 0, state: 0 };
  }

  const taxableOther = Math.max(0, otherIncome - STANDARD_DEDUCTION_SINGLE);
  let federal;

  if (longTerm) {
    // Stack the gain on top of ordinary income within the LTCG schedule.
    federal = bracketTax(taxableOther + gain, LTCG_BRACKETS_SINGLE)
      - bracketTax(taxableOther, LTCG_BRACKETS_SINGLE);
  } else {
    federal = bracketTax(taxableOther + gain, FEDERAL_BRACKETS_SINGLE)
      - bracketTax(taxableOther, FEDERAL_BRACKETS_SINGLE);
  }

  const overThreshold = Math.max(0, taxableOther + gain - NIIT.threshold);
  const niit = Math.min(gain, overThreshold) * NIIT.rate;
  const state = gain * (stateRate ?? 0);
  const tax = federal + niit + state;

  return { tax, rate: tax / gain, federal, niit, state };
}

/** Total income tax on ordinary income: federal brackets plus a state rate. */
export function incomeTax(ordinary, { stateRate = 0, flatRate } = {}) {
  if (flatRate != null) return ordinary * flatRate;
  const taxable = Math.max(0, ordinary - STANDARD_DEDUCTION_SINGLE);
  return bracketTax(taxable, FEDERAL_BRACKETS_SINGLE) + taxable * stateRate;
}

/** Blended effective rate actually paid on a given income. */
export function effectiveRate(ordinary, opts = {}) {
  if (ordinary <= 0) return 0;
  return incomeTax(ordinary, opts) / ordinary;
}
