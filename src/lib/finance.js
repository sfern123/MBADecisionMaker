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

// Splits a financing need across a capped subsidised tranche (e.g. US federal
// loans) and an uncapped private tranche priced off the borrower's APR.
export function splitLoan(need, { federalCap, federalRate, privateRate, termMonths }) {
  const amount = Math.max(0, need);
  const federal = Math.min(amount, Math.max(0, federalCap));
  const priv = Math.max(0, amount - federal);

  const federalPmt = monthlyPayment(federal, federalRate, termMonths);
  const privatePmt = monthlyPayment(priv, privateRate, termMonths);
  const totalPmt = federalPmt + privatePmt;
  const totalRepaid = totalPmt * termMonths;

  return {
    need: amount,
    federal,
    private: priv,
    federalPmt,
    privatePmt,
    totalPmt,
    totalRepaid,
    interestCost: totalRepaid - amount,
    weightedRate: amount > 0 ? (federal * federalRate + priv * privateRate) / amount : 0,
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
