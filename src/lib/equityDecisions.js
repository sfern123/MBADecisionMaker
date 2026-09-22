import { mulberry32 } from "./random.js";
import { percentile, mean, histogram } from "./stats.js";
import { pricePath, saleProceeds, remainingBalance } from "./equity.js";
import { capitalGainsTax } from "./tax.js";
import { resolveFinancing } from "./simulation.js";

/**
 * Sell equity now to cut tuition debt, or hold it and borrow more?
 *
 * The loan side is deterministic; only the share price is uncertain. So the
 * question reduces to: does the stock out-grow the interest you'd avoid?
 * The answer is a distribution, not a verdict, which is why this returns
 * percentiles and a win probability rather than a recommendation.
 *
 * Delta = (invested payment savings) + (lower remaining balance)
 *         − (value of the shares you gave up)
 */
export function runSellVsHold(cfg, opts = {}) {
  const nSim = opts.nSim ?? 1500;
  const horizonYears = opts.horizonYears ?? 10;
  const afterTaxTerminal = opts.afterTaxTerminal ?? true;
  const { equity, taxRate, marketReturn, stateRate, flatCapGainsRate, currentComp } = cfg;

  const sale = saleProceeds(equity, {
    otherIncome: currentComp,
    stateRate,
    flatCapGainsRate,
  });

  const schoolMonths = Math.round((cfg.school.programYears ?? 2) * 12);
  const { termMonths, graceMonths, federalRate } = cfg.loan;
  const repayStart = schoolMonths + graceMonths;
  const totalMonths = schoolMonths + horizonYears * 12;

  const hold = resolveFinancing(cfg, { savingsDeployed: cfg.savingsDeployed });
  const sell = resolveFinancing(cfg, { savingsDeployed: cfg.savingsDeployed + sale.net });

  // Deterministic loan side, month by month.
  const rm = marketReturn / 12;
  let invested = 0, contributed = 0;
  const loanByMonth = [];
  for (let m = 1; m <= totalMonths; m++) {
    invested *= 1 + rm;
    if (m > repayStart) {
      const k = m - repayStart;
      if (k <= termMonths) {
        const diff = hold.totalPmt - sell.totalPmt;
        invested += diff;
        contributed += diff;
      }
    }
    const k = Math.max(0, m - repayStart);
    const balHold = remainingBalance(hold.federal, federalRate, termMonths, k)
      + remainingBalance(hold.private, hold.privateRate, termMonths, k);
    const balSell = remainingBalance(sell.federal, federalRate, termMonths, k)
      + remainingBalance(sell.private, sell.privateRate, termMonths, k);
    loanByMonth.push({ invested, contributed, balanceAdvantage: balHold - balSell });
  }

  // Stochastic equity side.
  const yearIdx = Array.from({ length: Math.floor(totalMonths / 12) }, (_, i) => (i + 1) * 12 - 1);
  const deltasByYear = yearIdx.map(() => []);
  const finalDeltas = [], finalPrices = [];

  const embeddedRate = capitalGainsTax(1000, {
    longTerm: true, otherIncome: currentComp, stateRate, flatRate: flatCapGainsRate,
  }).rate;

  for (let i = 0; i < nSim; i++) {
    const rng = mulberry32((cfg.seed ?? 42) + i * 19);
    const path = pricePath(rng, totalMonths, equity.drift, equity.vol);

    yearIdx.forEach((mIdx, yi) => {
      const price = equity.price * path[mIdx + 1];
      const { invested: D, contributed: Cn, balanceAdvantage } = loanByMonth[mIdx];
      let delta = D + balanceAdvantage - sale.shares * price;

      if (afterTaxTerminal) {
        // The hold branch is still carrying an unrealised tax liability;
        // the sell branch's reinvested savings have their own embedded gain.
        delta += sale.shares * Math.max(0, price - equity.costBasis) * embeddedRate;
        delta -= Math.max(0, D - Cn) * embeddedRate;
      }

      deltasByYear[yi].push(delta);
      if (yi === yearIdx.length - 1) { finalDeltas.push(delta); finalPrices.push(price); }
    });
  }

  const band = deltasByYear.map((arr, i) => ({
    year: i + 1,
    p10: percentile(arr, 10), p25: percentile(arr, 25), p50: percentile(arr, 50),
    p75: percentile(arr, 75), p90: percentile(arr, 90),
    winProb: arr.filter(d => d > 0).length / arr.length,
  }));

  const alt = saleProceeds({ ...equity, saleIsLongTerm: !equity.saleIsLongTerm }, {
    otherIncome: currentComp, stateRate, flatCapGainsRate,
  });

  return {
    sale, alternativeTreatment: alt, hold, sell, band,
    schoolYears: cfg.school.programYears ?? 2,
    hist: finalDeltas.length ? histogram(finalDeltas, 33) : [],
    p10: percentile(finalDeltas, 10), p25: percentile(finalDeltas, 25),
    p50: percentile(finalDeltas, 50), p75: percentile(finalDeltas, 75),
    p90: percentile(finalDeltas, 90), mean: mean(finalDeltas),
    winProb: finalDeltas.filter(d => d > 0).length / Math.max(1, finalDeltas.length),
    priceP10: percentile(finalPrices, 10),
    priceP50: percentile(finalPrices, 50),
    priceP90: percentile(finalPrices, 90),
    borrowingAvoided: hold.need - sell.need,
    interestAvoided: hold.totalRepaid - sell.totalRepaid,
    paymentReduction: hold.totalPmt - sell.totalPmt,
  };
}

/**
 * Four ways to handle vesting equity, scored on terminal wealth, worst
 * drawdown, and how concentrated you stay.
 *
 * Concentration is the point. A strategy can win on median wealth while
 * leaving you one earnings miss away from a serious problem, so the drawdown
 * and concentration columns matter as much as the wealth column.
 */
export function runEquityStrategies(cfg, opts = {}) {
  const nSim = opts.nSim ?? 900;
  const years = opts.years ?? 7;
  const { equity, otherAssets, currentComp, stateRate, flatCapGainsRate, marketReturn, indexVol, diversifyPct } = cfg;

  const strategies = [
    { id: "sellOnVest", label: "Sell on vest", desc: "Sell every share the moment it vests and buy the index. Maximum diversification, no timing decisions." },
    { id: "holdForLtcg", label: "Hold 12mo, then sell", desc: "Hold each lot until it qualifies for long-term rates, then diversify. Trades a year of concentration for a lower tax bill." },
    { id: "holdAll", label: "Hold everything", desc: "Never sell. Maximum exposure to one company's fortunes." },
    { id: "gradual", label: `Sell ${(diversifyPct * 100).toFixed(0)}% a year`, desc: "Trim a fixed share of the position annually regardless of price. Removes the timing decision without dumping everything at once." },
  ];

  const perQuarterVest = equity.vestingYears > 0 ? equity.unvestedShares / (equity.vestingYears * 4) : 0;
  const startingNw = equity.vestedShares * equity.price + otherAssets;

  return strategies.map((strat, si) => {
    const finals = [], drawdowns = [], taxes = [], concentrations = [];
    const yearly = Array.from({ length: years }, () => []);

    for (let s = 0; s < nSim; s++) {
      const rng = mulberry32((cfg.seed ?? 42) + s * 17 + si * 101);
      let shares = equity.vestedShares;
      let index = otherAssets;
      let lots = [{ shares: equity.vestedShares, basis: equity.costBasis, quarter: -4 }];
      let taxPaid = 0, peak = startingNw, maxDd = 0, quarter = 0;

      const stockP = pricePath(rng, years * 4, equity.drift, equity.vol, 4);
      const indexP = pricePath(rng, years * 4, marketReturn, indexVol, 4);

      for (let yr = 0; yr < years; yr++) {
        for (let q = 0; q < 4; q++) {
          quarter++;
          const price = equity.price * stockP[quarter];
          const idxRet = indexP[quarter] / indexP[quarter - 1] - 1;

          // New vesting is ordinary income, taxed on vest.
          const vesting = (yr < equity.vestingYears ? perQuarterVest : 0)
            + (equity.annualRefresh > 0 && yr >= 1 ? (equity.annualRefresh / equity.price) / 4 : 0);
          if (vesting > 0) {
            taxPaid += vesting * price * cfg.taxRate;
            lots.push({ shares: vesting, basis: price, quarter });
            shares += vesting;
          }

          const sellLots = which => {
            for (const lot of which) {
              if (lot.shares <= 0) continue;
              const gain = lot.shares * (price - lot.basis);
              const longTerm = quarter - lot.quarter >= 4;
              const t = gain > 0
                ? capitalGainsTax(gain, { longTerm, otherIncome: currentComp, stateRate, flatRate: flatCapGainsRate }).tax
                : 0;
              taxPaid += t;
              index += lot.shares * price - t;
              shares -= lot.shares;
              lot.shares = 0;
            }
            lots = lots.filter(l => l.shares > 0);
          };

          if (strat.id === "sellOnVest") sellLots(lots.filter(l => l.quarter === quarter));
          if (strat.id === "holdForLtcg") sellLots(lots.filter(l => quarter - l.quarter >= 4));
          if (strat.id === "gradual" && q === 0 && shares > 0) {
            const toSell = shares * diversifyPct;
            let remaining = toSell;
            for (const lot of lots) {
              if (remaining <= 0) break;
              const take = Math.min(lot.shares, remaining);
              const gain = take * (price - lot.basis);
              const longTerm = quarter - lot.quarter >= 4;
              const t = gain > 0
                ? capitalGainsTax(gain, { longTerm, otherIncome: currentComp, stateRate, flatRate: flatCapGainsRate }).tax
                : 0;
              taxPaid += t;
              index += take * price - t;
              shares -= take;
              lot.shares -= take;
              remaining -= take;
            }
            lots = lots.filter(l => l.shares > 0);
          }

          index *= 1 + idxRet;
          const nw = shares * price + index;
          if (nw > peak) peak = nw;
          const dd = peak > 0 ? (peak - nw) / peak : 0;
          if (dd > maxDd) maxDd = dd;
        }

        const eoyPrice = equity.price * stockP[(yr + 1) * 4];
        const eoyNw = shares * eoyPrice + index;
        yearly[yr].push(eoyNw);
        if (yr === years - 1) {
          finals.push(eoyNw);
          concentrations.push(eoyNw > 0 ? (shares * eoyPrice) / eoyNw : 0);
        }
      }

      drawdowns.push(maxDd);
      taxes.push(taxPaid);
    }

    return {
      ...strat,
      medianWealth: percentile(finals, 50),
      p10Wealth: percentile(finals, 10),
      p90Wealth: percentile(finals, 90),
      meanWealth: mean(finals),
      medianDrawdown: percentile(drawdowns, 50),
      worstDrawdown: percentile(drawdowns, 90),
      medianTax: percentile(taxes, 50),
      endConcentration: percentile(concentrations, 50),
      trajectory: yearly.map((arr, i) => ({ year: i + 1, value: percentile(arr, 50) })),
    };
  });
}
