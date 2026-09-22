/**
 * Derived values — the single place wealth and income are computed.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * An earlier version of this app had five separate inputs that each described
 * some overlapping part of the same money: a net-worth scalar, a savings
 * figure, an equity position, an "other assets" number, and a set of
 * retirement account balances. Each tab read a different subset, none of them
 * reconciled, and the same person could get different answers depending on
 * which screen they were looking at.
 *
 * The fix is structural rather than careful: there is now exactly one
 * balance sheet, and net worth is a FUNCTION of it rather than a number
 * anyone types. Once there is only one adder, double-counting stops being a
 * bug you have to remember not to write.
 *
 * Every model reads through these selectors. Nothing should reach into
 * `balanceSheet` and start summing on its own.
 */

/* ── Compensation ─────────────────────────────────────────────────────── */

/**
 * Total annual compensation.
 *
 * Splitting this out matters because the three components behave differently:
 * base is reliable, bonus swings with the year, and equity swings with the
 * share price — which is the same price driving your concentration risk.
 */
export const totalComp = c => (c?.base ?? 0) + (c?.bonus ?? 0) + (c?.equityAnnual ?? 0);

/** Share of pay that depends on the stock price. */
export const equityCompShare = c => {
  const total = totalComp(c);
  return total > 0 ? (c.equityAnnual ?? 0) / total : 0;
};

/* ── Individual asset classes ─────────────────────────────────────────── */

export const liquidAssets = bs => (bs.cash ?? 0) + (bs.brokerage?.value ?? 0);

export const retirementTotal = bs => {
  const r = bs.retirement ?? {};
  return (r.preTax ?? 0) + (r.roth ?? 0) + (r.afterTax ?? 0);
};

const holdingValue = (h, key) => (h[key] ?? 0) * (h.price ?? 0);

/**
 * Vested equity is yours today and counts toward net worth.
 *
 * Unvested equity deliberately does NOT — it is compensation you have not
 * received yet, contingent on staying. Counting it would flatter your balance
 * sheet with money you could still walk away from, which is exactly the
 * wrong bias when deciding whether to leave for two years of school.
 */
export const vestedEquityValue = bs =>
  (bs.equityHoldings ?? []).reduce((s, h) => s + holdingValue(h, "vested"), 0);

export const unvestedEquityValue = bs =>
  (bs.equityHoldings ?? []).reduce((s, h) => s + holdingValue(h, "unvested"), 0);

export const totalEquityValue = bs => vestedEquityValue(bs) + unvestedEquityValue(bs);

export const unrealisedEquityGain = bs =>
  (bs.equityHoldings ?? []).reduce(
    (s, h) => s + (h.vested ?? 0) * Math.max(0, (h.price ?? 0) - (h.costBasis ?? 0)),
    0
  );

/* ── Property ─────────────────────────────────────────────────────────── */

/** Equity in property: what it would fetch, less what is still owed. */
export const propertyEquity = bs =>
  (bs.properties ?? []).reduce(
    (s, p) => s + ((p.value ?? 0) - (p.mortgageBalance ?? 0)),
    0
  );

export const propertyValue = bs =>
  (bs.properties ?? []).reduce((s, p) => s + (p.value ?? 0), 0);

export const mortgageDebt = bs =>
  (bs.properties ?? []).reduce((s, p) => s + (p.mortgageBalance ?? 0), 0);

/**
 * Net monthly cash flow from property.
 *
 * Negative for a home you live in — the mortgage goes out and no rent comes
 * in. That is correct and worth seeing: a primary residence is an asset on
 * the balance sheet and a drain on monthly cash, and only one of those shows
 * up when you ask whether you can afford a loan payment.
 */
export const propertyMonthlyCashFlow = bs =>
  (bs.properties ?? []).reduce(
    (s, p) => s + (p.monthlyRent ?? 0) - (p.monthlyExpenses ?? 0) - (p.monthlyPayment ?? 0),
    0
  );

export const propertyAnnualCashFlow = bs => propertyMonthlyCashFlow(bs) * 12;

/* ── Other assets and debts ───────────────────────────────────────────── */

export const otherAssetsTotal = bs =>
  (bs.otherAssets ?? []).reduce((s, a) => s + (a.value ?? 0), 0);

/** Debts excluding mortgages, which are already netted inside propertyEquity. */
export const nonMortgageDebt = bs =>
  (bs.debts ?? []).reduce((s, d) => s + (d.balance ?? 0), 0);

/**
 * Monthly payments on existing debts.
 *
 * These compete directly with a student-loan payment. A car payment and a
 * credit-card minimum do not disappear because you enrolled, so they belong
 * in any honest affordability calculation.
 */
export const monthlyDebtPayments = bs =>
  (bs.debts ?? []).reduce((s, d) => s + (d.monthlyPayment ?? 0), 0);

/* ── The totals ───────────────────────────────────────────────────────── */

/**
 * Net worth. Derived, never typed.
 *
 * Mortgages are netted within propertyEquity, so adding nonMortgageDebt here
 * does not double-subtract them.
 */
export const netWorth = bs =>
  liquidAssets(bs)
  + retirementTotal(bs)
  + vestedEquityValue(bs)
  + propertyEquity(bs)
  + otherAssetsTotal(bs)
  - nonMortgageDebt(bs);

/** Assets that could realistically be turned into tuition money. */
export const availableForTuition = bs => liquidAssets(bs) + vestedEquityValue(bs);

/** A labelled breakdown for the UI, skipping anything empty. */
export function netWorthBreakdown(bs) {
  const rows = [
    { key: "cash", label: "Cash", value: bs.cash ?? 0 },
    { key: "brokerage", label: "Brokerage", value: bs.brokerage?.value ?? 0 },
    { key: "retirement", label: "Retirement accounts", value: retirementTotal(bs) },
    { key: "equity", label: "Company equity (vested)", value: vestedEquityValue(bs) },
    { key: "property", label: "Property equity", value: propertyEquity(bs) },
    { key: "other", label: "Other assets", value: otherAssetsTotal(bs) },
    { key: "debts", label: "Other debts", value: -nonMortgageDebt(bs) },
  ];
  return rows.filter(r => r.value !== 0);
}

/* ── Mapping onto the other models ────────────────────────────────────── */

/**
 * Projects the balance sheet onto the five buckets the FIRE model draws
 * down, in its withdrawal order.
 *
 * Vested equity and other assets land in `taxable` because that is how they
 * behave on withdrawal — sellable, with gains taxed. Unvested equity is
 * excluded for the same reason it is excluded from net worth.
 */
export const fireAccounts = bs => ({
  preTax: bs.retirement?.preTax ?? 0,
  taxFree: bs.retirement?.roth ?? 0,
  afterTax: bs.retirement?.afterTax ?? 0,
  taxable: (bs.brokerage?.value ?? 0) + vestedEquityValue(bs) + otherAssetsTotal(bs),
  cash: bs.cash ?? 0,
});

/** Cost basis for the combined taxable bucket above. */
export const fireTaxableBasis = bs =>
  (bs.brokerage?.costBasis ?? 0)
  + (bs.equityHoldings ?? []).reduce((s, h) => s + (h.vested ?? 0) * (h.costBasis ?? 0), 0)
  + otherAssetsTotal(bs);

export const hasEquityHoldings = bs => (bs.equityHoldings ?? []).some(h => (h.vested ?? 0) + (h.unvested ?? 0) > 0);
export const hasProperties = bs => (bs.properties ?? []).length > 0;
export const hasDebts = bs => (bs.debts ?? []).length > 0;

/* ── Inflation ────────────────────────────────────────────────────────── */

/**
 * Converts a future nominal amount into today's purchasing power.
 *
 * Without this, a projection that ends at "$2.4M in 15 years" invites you to
 * compare it against a salary you earn now, and those are not the same units.
 * Both branches of every comparison get inflated equally, so the ranking
 * rarely changes — but the magnitudes, and the point where two lines cross,
 * very much do.
 */
export const toRealDollars = (nominal, year, inflation) =>
  nominal / Math.pow(1 + inflation, year);

export const deflator = (year, inflation) => 1 / Math.pow(1 + inflation, year);
