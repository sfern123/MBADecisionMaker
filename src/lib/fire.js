import { mulberry32, normalRandom } from "./random.js";
import { percentile, mean } from "./stats.js";
import { incomeTax, capitalGainsTax } from "./tax.js";

/**
 * Account types, in the order they get drawn down.
 *
 * Withdrawal order matters a lot: spending taxable money first lets the
 * sheltered accounts keep compounding, and leaves the tax-free account as a
 * buffer for the years you need a large withdrawal without pushing yourself
 * into a higher bracket.
 *
 * The labels are generic with US equivalents noted, so this is usable
 * outside a 401(k)/IRA system.
 */
export const ACCOUNT_TYPES = [
  { id: "taxable", label: "Taxable brokerage", note: "Gains taxed at capital-gains rates", order: 1 },
  { id: "cash", label: "Cash / savings", note: "Already taxed; no further liability", order: 2 },
  { id: "afterTax", label: "After-tax contributions", note: "US: after-tax 401(k). Basis is free, gains taxed", order: 3 },
  { id: "preTax", label: "Tax-deferred", note: "US: traditional 401(k)/IRA. Taxed as income on withdrawal", order: 4 },
  { id: "taxFree", label: "Tax-free", note: "US: Roth. Withdrawals untaxed", order: 5 },
];

/** A return draw with occasional crashes and melt-ups, not a clean normal. */
function annualReturn(rng, avg, vol) {
  if (rng() < 0.04) return -0.25 - rng() * 0.20;
  if (rng() < 0.06) return 0.25 + rng() * 0.15;
  return avg + normalRandom(rng) * vol;
}

/**
 * The number you need invested to fund `spending` at a given withdrawal
 * rate, net of any income you'll have anyway (pension, social security,
 * part-time work).
 */
export function fireNumber({ annualSpending, withdrawalRate, otherRetirementIncome = 0 }) {
  const fromPortfolio = Math.max(0, annualSpending - otherRetirementIncome);
  return withdrawalRate > 0 ? fromPortfolio / withdrawalRate : Infinity;
}

/**
 * Coast FIRE: the balance that, left completely alone, compounds to your
 * FIRE number by the target age. Hitting it means you can stop saving —
 * a much nearer milestone than full independence, and often the more
 * decision-relevant one when weighing two years of zero income.
 */
export function coastNumber({ target, realReturn, yearsToTarget }) {
  if (yearsToTarget <= 0) return target;
  return target / Math.pow(1 + realReturn, yearsToTarget);
}

/**
 * Accumulation and drawdown Monte Carlo.
 *
 * Accumulation runs to the horizon, recording when the portfolio first
 * clears an inflation-adjusted FIRE target. Drawdown then spends from that
 * portfolio in tax-aware order and reports how often the money lasts.
 */
export function runFire(cfg, opts = {}) {
  const nSim = opts.nSim ?? 1200;
  const accumYears = opts.accumYears ?? 40;
  const drawYears = opts.drawYears ?? 35;
  const {
    currentAge, currentComp, compGrowth, taxRate,
    accounts, contributions, taxableBasis,
    annualSpending, withdrawalRate, marketReturn, volatility, inflation,
    otherRetirementIncome, retirementIncomeStartAge,
    stateRate, useBracketTax, coastTargetAge, seed = 42,
  } = cfg;

  const target = fireNumber({ annualSpending, withdrawalRate, otherRetirementIncome });
  const realReturn = Math.max(0.001, marketReturn - inflation);
  const coast = coastNumber({
    target, realReturn,
    yearsToTarget: Math.max(1, coastTargetAge - currentAge),
  });

  const startingTotal = Object.values(accounts).reduce((a, b) => a + b, 0);
  const fireYears = [];
  const survived = [];
  const effRates = [];
  const byYear = Array.from({ length: accumYears }, () => []);
  const breakdown = Array.from({ length: accumYears }, () => ({ taxable: [], cash: [], afterTax: [], preTax: [], taxFree: [] }));

  for (let i = 0; i < nSim; i++) {
    const rng = mulberry32(seed + i * 13);
    const a = { ...accounts };
    let basis = taxableBasis;
    let comp = currentComp;
    let fireYear = null;

    // ── Accumulation ──
    for (let yr = 0; yr < accumYears; yr++) {
      const r = annualReturn(rng, marketReturn, volatility);
      a.preTax *= 1 + r;
      a.taxFree *= 1 + r;
      a.afterTax *= 1 + r;
      a.taxable *= 1 + r;
      a.cash *= 1 + r * 0.25;

      const preTaxC = Math.min(contributions.preTax, comp * 0.8);
      a.preTax += preTaxC;
      a.taxFree += contributions.taxFree;
      a.afterTax += contributions.afterTax;

      const netIncome = (comp - preTaxC) * (1 - taxRate);
      const leftover = Math.max(0, netIncome - annualSpending - contributions.taxFree - contributions.afterTax);
      a.taxable += leftover;
      basis += leftover;

      const total = a.preTax + a.taxFree + a.afterTax + a.taxable + a.cash;
      const inflatedTarget = target * Math.pow(1 + inflation, yr + 1);
      if (fireYear === null && total >= inflatedTarget) fireYear = yr + 1;

      byYear[yr].push(total);
      for (const k of ["taxable", "cash", "afterTax", "preTax", "taxFree"]) breakdown[yr][k].push(a[k]);

      comp *= 1 + compGrowth + normalRandom(rng) * 0.02;
    }
    fireYears.push(fireYear ?? accumYears + 1);

    // ── Drawdown, starting from the portfolio as it actually ended up ──
    const rng2 = mulberry32(seed * 7 + i * 11);
    const d = { ...a };
    let dBasis = basis;
    let age = currentAge + (fireYear ?? accumYears);
    let alive = true;
    const rates = [];

    for (let yr = 0; yr < drawYears; yr++) {
      age++;
      const r = annualReturn(rng2, marketReturn, volatility);
      for (const k of ["preTax", "taxFree", "afterTax", "taxable"]) d[k] *= 1 + r;
      d.cash *= 1 + r * 0.25;

      const external = age >= retirementIncomeStartAge
        ? otherRetirementIncome * Math.pow(1 + inflation, yr) : 0;
      const spend = annualSpending * Math.pow(1 + inflation, yr);
      let need = Math.max(0, spend - external);
      if (need <= 0) { rates.push(0); continue; }

      let ordinary = 0, gains = 0;

      // Taxable first: only the gain portion is taxed.
      if (need > 0 && d.taxable > 0) {
        const take = Math.min(need, d.taxable);
        const gainFrac = d.taxable > 0 ? Math.max(0, 1 - dBasis / d.taxable) : 0;
        gains += take * gainFrac;
        dBasis = Math.max(0, dBasis - take * (1 - gainFrac));
        d.taxable -= take; need -= take;
      }
      if (need > 0 && d.cash > 0) { const t = Math.min(need, d.cash); d.cash -= t; need -= t; }
      if (need > 0 && d.afterTax > 0) {
        const t = Math.min(need, d.afterTax);
        ordinary += t * 0.4; // only the growth portion is taxable
        d.afterTax -= t; need -= t;
      }
      if (need > 0 && d.preTax > 0) {
        const t = Math.min(need, d.preTax);
        ordinary += t; d.preTax -= t; need -= t;
      }
      if (need > 0 && d.taxFree > 0) { const t = Math.min(need, d.taxFree); d.taxFree -= t; need -= t; }

      if (need > 1) { alive = false; break; }

      const taxableExternal = external * 0.85; // most retirement income is partly taxable
      const tax = useBracketTax
        ? incomeTax(ordinary + taxableExternal, { stateRate })
          + capitalGainsTax(gains, { longTerm: true, otherIncome: ordinary + taxableExternal, stateRate }).tax
        : (ordinary + taxableExternal + gains) * taxRate;

      // Pay the tax bill out of whatever is left.
      let owed = tax;
      for (const k of ["taxable", "cash", "preTax", "taxFree"]) {
        if (owed <= 0) break;
        const t = Math.min(owed, d[k]);
        d[k] -= t; owed -= t;
      }
      if (owed > 1) { alive = false; break; }

      rates.push(spend + tax > 0 ? tax / (spend + tax) : 0);
    }

    survived.push(alive);
    if (rates.length) effRates.push(mean(rates.filter(x => x > 0)));
  }

  const medianFireYear = percentile(fireYears, 50);
  const trajectory = Array.from({ length: Math.min(accumYears, 35) }, (_, i) => ({
    year: i + 1,
    age: currentAge + i + 1,
    p10: percentile(byYear[i], 10),
    p25: percentile(byYear[i], 25),
    p50: percentile(byYear[i], 50),
    p75: percentile(byYear[i], 75),
    p90: percentile(byYear[i], 90),
    target: target * Math.pow(1 + inflation, i + 1),
  }));

  const mixIdx = Math.min(Math.max(medianFireYear - 1, 0), accumYears - 1);
  const mixAtFire = Object.fromEntries(
    ["taxable", "cash", "afterTax", "preTax", "taxFree"]
      .map(k => [k, percentile(breakdown[mixIdx][k], 50)])
  );

  return {
    target, coast, startingTotal, trajectory, mixAtFire,
    medianFireYear,
    medianFireAge: currentAge + medianFireYear,
    fireBy: {
      10: fireYears.filter(y => y <= 10).length / nSim,
      15: fireYears.filter(y => y <= 15).length / nSim,
      20: fireYears.filter(y => y <= 20).length / nSim,
    },
    survivalRate: survived.filter(Boolean).length / survived.length,
    avgEffectiveTaxRate: mean(effRates),
    alreadyCoasting: startingTotal >= coast,
  };
}
