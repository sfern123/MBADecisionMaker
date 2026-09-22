// Standard amortizing loan payment.
export function monthlyPayment(principal, annualRate, months) {
  if (principal <= 0 || months <= 0) return 0;
  const r = annualRate / 12;
  if (r === 0) return principal / months;
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

// Present value of the whole repayment stream, discounted at `discountRate`.
// `graceMonths` shifts the stream out to when repayment actually begins.
export function npvOfRepayment(principal, rate, months, discountRate, graceMonths = 6) {
  const pmt = monthlyPayment(principal, rate, months);
  const rm = discountRate / 12;
  let npv = 0;
  for (let t = 1; t <= months; t++) {
    npv += pmt / Math.pow(1 + rm, graceMonths + t);
  }
  return npv;
}

/**
 * Allocates a financing need across an ordered list of debt tranches.
 *
 * Order matters and is the caller's decision: you fill the cheapest capped
 * sources first and let the uncapped one absorb whatever is left. The last
 * tranche must be uncapped (`cap: Infinity`) or the allocation can come up
 * short.
 *
 * Each tranche: { id, label, cap, rate, termMonths }
 */
export function allocateTranches(need, tranches) {
  let remaining = Math.max(0, need);
  const filled = [];

  for (const t of tranches) {
    const amount = Math.min(remaining, Math.max(0, t.cap ?? Infinity));
    remaining -= amount;
    const pmt = monthlyPayment(amount, t.rate, t.termMonths);
    filled.push({
      ...t,
      amount,
      monthlyPayment: pmt,
      totalRepaid: pmt * t.termMonths,
      interest: pmt * t.termMonths - amount,
    });
  }

  const borrowed = filled.reduce((s, t) => s + t.amount, 0);
  const totalPmt = filled.reduce((s, t) => s + t.monthlyPayment, 0);
  const totalRepaid = filled.reduce((s, t) => s + t.totalRepaid, 0);

  return {
    tranches: filled,
    borrowed,
    unfunded: remaining,
    totalPmt,
    totalRepaid,
    interestCost: totalRepaid - borrowed,
    weightedRate: borrowed > 0
      ? filled.reduce((s, t) => s + t.amount * t.rate, 0) / borrowed
      : 0,
    // The longest term in play, so callers know how far payments stretch.
    maxTermMonths: filled.reduce((m, t) => (t.amount > 0 ? Math.max(m, t.termMonths) : m), 0),
  };
}

/**
 * Two-tranche convenience wrapper kept for the common case: one capped
 * subsidised source plus an uncapped private one.
 */
export function splitLoan(need, { federalCap, federalRate, privateRate, termMonths }) {
  const r = allocateTranches(need, [
    { id: "federal", label: "Federal", cap: federalCap, rate: federalRate, termMonths },
    { id: "private", label: "Private", cap: Infinity, rate: privateRate, termMonths },
  ]);
  const fed = r.tranches[0];
  const priv = r.tranches[1];

  return {
    need: Math.max(0, need),
    federal: fed.amount,
    private: priv.amount,
    federalPmt: fed.monthlyPayment,
    privatePmt: priv.monthlyPayment,
    totalPmt: r.totalPmt,
    totalRepaid: r.totalRepaid,
    interestCost: r.interestCost,
    weightedRate: r.weightedRate,
    tranches: r.tranches,
  };
}

// Maps a credit score onto an APR using an ordered tier table. Tiers are
// user-editable, so this walks the table rather than hardcoding thresholds.
export function aprForScore(score, tiers) {
  const sorted = [...tiers].sort((a, b) => b.minScore - a.minScore);
  for (const tier of sorted) {
    if (score >= tier.minScore) return tier.apr;
  }
  return sorted.length ? sorted[sorted.length - 1].apr : 0.1;
}
