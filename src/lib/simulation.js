import { mulberry32, normalRandom, weightedChoice, normalizeWeights } from "./random.js";
import { monthlyPayment, npvOfRepayment, allocateTranches, aprForScore } from "./finance.js";
import { summarize, histogram, mean, percentile } from "./stats.js";
import { totalCoa, salaryIndex } from "../data/schools.js";

// Income is floored so a bad draw can't produce an absurd salary.
const INCOME_FLOOR = 50000;

/** Total federal borrowing available across the whole programme. */
export function federalCapacity(loan, programYears) {
  return Math.min(loan.federalPerYear * programYears, loan.federalLifetimeCap);
}

/** The private APR in force, whether quoted directly or proxied from score. */
export function effectiveApr(cfg) {
  return cfg.useDirectApr ? cfg.directApr : aprForScore(cfg.creditScore, cfg.aprTiers);
}

/**
 * Deterministic financing picture: what the programme costs, what is covered
 * without borrowing, and how the remainder is allocated across debt sources.
 *
 * The waterfall runs cheapest-first:
 *
 *   cost → scholarship → cash → equity sale → employer → family
 *        → federal (if used) → private (absorbs the rest)
 *
 * Federal is a *choice*, not a given. Someone may be ineligible, may be
 * outside the US, or may deliberately skip it. When it is switched off the
 * private tranche simply absorbs that share — the arithmetic is unremarkable,
 * but what you give up (income-driven repayment, forbearance, forgiveness,
 * death and disability discharge) is not, and the UI says so rather than
 * treating this as a neutral toggle.
 */
export function resolveFinancing(cfg, overrides = {}) {
  const school = overrides.school ?? cfg.school;
  const scholarship = overrides.scholarship ?? cfg.scholarship ?? 0;
  const savingsDeployed = overrides.savingsDeployed ?? cfg.savingsDeployed ?? 0;
  const equityProceeds = overrides.equityProceeds ?? 0;
  const programYears = school.programYears ?? 2;

  const funding = { ...(cfg.funding ?? {}), ...(overrides.funding ?? {}) };
  const employer = funding.employer?.amount ?? 0;
  const family = funding.family ?? { amount: 0, rate: 0, termYears: 10 };
  const useFederal = overrides.useFederal ?? funding.useFederal ?? true;

  const cost = totalCoa(school, cfg.coaEscalation);

  // Non-debt sources, applied before anything is borrowed.
  const covered = scholarship + savingsDeployed + equityProceeds + employer;
  const need = Math.max(0, cost - covered);

  const loan = { ...cfg.loan, ...(overrides.loan ?? {}) };
  const privateRate = overrides.privateRate ?? effectiveApr(cfg);
  const federalCap = useFederal ? federalCapacity(loan, programYears) : 0;

  const alloc = allocateTranches(need, [
    {
      id: "family", label: "Family loan",
      cap: family.amount ?? 0, rate: family.rate ?? 0,
      termMonths: (family.termYears ?? 10) * 12,
    },
    {
      id: "federal", label: "Federal",
      cap: federalCap, rate: loan.federalRate, termMonths: loan.termMonths,
    },
    {
      id: "private", label: "Private",
      cap: Infinity, rate: privateRate, termMonths: loan.termMonths,
    },
  ]);

  const byId = id => alloc.tranches.find(t => t.id === id) ?? { amount: 0, monthlyPayment: 0 };
  const fed = byId("federal");
  const priv = byId("private");
  const fam = byId("family");

  const npvAt = rate =>
    alloc.tranches.reduce(
      (s, t) => s + npvOfRepayment(t.amount, t.rate, t.termMonths, rate, loan.graceMonths),
      0
    );

  return {
    ...alloc,
    need,
    cost,
    scholarship,
    savingsDeployed,
    equityProceeds,
    employer,
    covered,
    programYears,
    privateRate,
    useFederal,

    // Named accessors kept so existing sections keep working unchanged.
    federal: fed.amount,
    private: priv.amount,
    familyLoan: fam.amount,
    federalPmt: fed.monthlyPayment,
    privatePmt: priv.monthlyPayment,

    npvAtDiscount: npvAt(cfg.discountRate),
    npvAtMarket: npvAt(cfg.marketReturn),
  };
}

/** Selected paths plus their normalised probabilities. */
function pathMix(cfg) {
  const active = cfg.paths.filter(p => (p.weight ?? 0) > 0);
  const list = active.length ? active : cfg.paths.slice(0, 1);
  return { list, probs: normalizeWeights(list.map(p => p.weight ?? 1)) };
}

/**
 * Draws a windfall for a path, if it has one and it hits this run. Replaces
 * the hardcoded "if path is VC" branches in the original -- any path can now
 * carry lumpy upside, including one the user defines.
 */
function drawWindfall(rng, path) {
  const w = path.windfall;
  if (!w || w.probability <= 0) return 0;
  if (rng() > w.probability) return 0;
  return w.min + rng() * Math.max(0, w.max - w.min);
}

/**
 * Core Monte Carlo: career outcome -> first-year debt service burden and
 * ten-year net wealth. `salaryScale` lets the school comparison re-run the
 * same engine with a different school's pay index.
 */
export function runCoreSim(cfg, opts = {}) {
  const nSim = opts.nSim ?? cfg.sims ?? 3000;
  const salaryScale = opts.salaryScale ?? salaryIndex(cfg.school);
  const financing = opts.financing ?? resolveFinancing(cfg, opts.overrides);
  const rng = mulberry32(opts.seed ?? cfg.seed ?? 42);
  const { list, probs } = pathMix(cfg);
  const horizon = opts.wealthYears ?? 10;

  // Existing debt service, plus any net monthly outflow on property. Both are
  // already-committed obligations that compete with a student-loan payment.
  const existingDebt = cfg.existingMonthlyDebt ?? 0;
  const propertyDrain = Math.max(0, -(cfg.propertyCashFlow ?? 0) / 12);
  const otherObligations = existingDebt + propertyDrain;
  const totalMonthlyObligations = financing.totalPmt + otherObligations;

  const wealth = [], dti = [], income = [];
  let stressCount = 0;

  for (let i = 0; i < nSim; i++) {
    const path = weightedChoice(rng, list, probs);

    let y1 = path.year1 * salaryScale * (1 + normalRandom(rng) * path.vol * 0.3);
    y1 = Math.max(y1, INCOME_FLOOR);
    income.push(y1);

    // Affordability is about ALL committed debt service, not just the new
    // loan. A car payment and a mortgage do not disappear because you
    // enrolled, and a payment that looks comfortable in isolation can be
    // unaffordable once what you already owe is counted.
    const netMonthly = (y1 * (1 - cfg.taxRate)) / 12;
    const ratio = netMonthly > 0 ? totalMonthlyObligations / netMonthly : 1;
    dti.push(ratio);
    if (ratio > cfg.stressThreshold) stressCount++;

    let cumulative = 0, comp = y1;
    for (let yr = 0; yr < horizon; yr++) {
      cumulative += comp * (1 - cfg.taxRate);
      comp *= 1 + path.growth + normalRandom(rng) * path.vol * 0.5;
      comp = Math.max(comp, INCOME_FLOOR);
      if (path.windfall && path.windfall.yearOffset === yr) {
        cumulative += drawWindfall(rng, path);
      }
    }

    wealth.push(cumulative - financing.totalRepaid);
  }

  return {
    financing,
    stressProb: stressCount / nSim,
    // Surfaced so the UI can show what the burden is actually made of.
    obligations: {
      loan: financing.totalPmt,
      existingDebt,
      property: propertyDrain,
      total: totalMonthlyObligations,
    },
    // Note: total repayment is deterministic given the inputs, so it has no
    // distribution -- reporting percentiles on it would be meaningless.
    totalRepaid: financing.totalRepaid,
    wealth: summarize(wealth),
    dti: summarize(dti),
    income: summarize(income),
    wealthHist: histogram(wealth, 35),
    dtiHist: histogram(dti.map(d => d * 100), 30),
  };
}

/** Runs the core sim across several schools for side-by-side comparison. */
export function runSchoolComparison(cfg, schools, nSim = 1200) {
  return schools.map((school, i) => {
    const financing = resolveFinancing(cfg, { school });
    const res = runCoreSim(cfg, {
      nSim,
      financing,
      salaryScale: salaryIndex(school),
      seed: (cfg.seed ?? 42) + 101 + i,
    });
    return {
      id: school.id,
      name: school.name,
      short: school.short,
      currency: school.currency,
      programYears: school.programYears,
      compVerified: school.compVerified,
      dataWarning: school.dataWarning,
      coa: financing.cost,
      debt: financing.need,
      repaid: financing.totalRepaid,
      monthly: financing.totalPmt,
      stress: res.stressProb,
      wealth: res.wealth.mean,
      wealthP5: res.wealth.p5,
      wealthP95: res.wealth.p95,
      downside: res.wealth.p10,
      // Mean over standard deviation: reward per unit of outcome dispersion.
      sharpe: res.wealth.std > 0 ? res.wealth.mean / res.wealth.std : 0,
    };
  });
}

/**
 * How much of available cash to put toward tuition. Whatever is held back
 * stays invested, so each strategy is scored on wealth PLUS the future value
 * of the liquidity it preserved.
 */
export function runStrategies(cfg, nSim = 900) {
  const configs = [
    { name: "Conservative", pct: 0.85, blurb: "Deploy most cash. Lowest payment, least flexibility." },
    { name: "Balanced", pct: 0.50, blurb: "Split the difference. Keeps a real emergency buffer." },
    { name: "Aggressive", pct: 0.20, blurb: "Borrow more, stay liquid. Bets on market returns." },
  ];
  const years = (cfg.school.programYears ?? 2) + cfg.loan.termMonths / 12;

  return configs.map((c, i) => {
    const cost = totalCoa(cfg.school, cfg.coaEscalation);
    const deployable = Math.max(0, cost - cfg.scholarship);
    const used = Math.min(cfg.totalSavings * c.pct, deployable);
    const liquid = cfg.totalSavings - used;

    const financing = resolveFinancing(cfg, { savingsDeployed: used });
    const res = runCoreSim(cfg, { nSim, financing, seed: (cfg.seed ?? 42) + 201 + i });
    const liquidFV = liquid * Math.pow(1 + cfg.marketReturn, years);

    return {
      name: c.name, blurb: c.blurb,
      savingsUsed: used, liquidity: liquid,
      debt: financing.need, repaid: financing.totalRepaid, monthly: financing.totalPmt,
      stress: res.stressProb,
      adjWealth: res.wealth.mean + liquidFV,
      downside: res.wealth.p5 + liquidFV,
    };
  });
}

/** Sweeps deployed savings to show how the picture responds. */
export function runSensitivity(cfg, nSim = 700) {
  const cost = totalCoa(cfg.school, cfg.coaEscalation);
  const ceiling = Math.max(cfg.totalSavings, Math.max(0, cost - cfg.scholarship));
  const steps = 7;

  return Array.from({ length: steps }, (_, i) => {
    const deployed = Math.round((ceiling * i) / (steps - 1) / 1000) * 1000;
    const financing = resolveFinancing(cfg, { savingsDeployed: deployed });
    const res = runCoreSim(cfg, { nSim, financing, seed: (cfg.seed ?? 42) + 301 + i });
    return {
      savings: deployed,
      repay: financing.totalRepaid,
      monthly: financing.totalPmt,
      debt: financing.need,
      stress: res.stressProb,
      wealth: res.wealth.mean,
    };
  });
}

/**
 * Deploy-to-tuition vs keep-invested, month by month.
 *
 * Path A pays down the loan up front. Path B borrows more and keeps the cash
 * in the market, draining the portfolio each month by the extra payment. The
 * portfolio either survives that drain or it doesn't -- that is the whole
 * question, and the loan APR is the hurdle rate.
 */
export function runInvestVsDeploy(cfg) {
  const programMonths = Math.round((cfg.school.programYears ?? 2) * 12);
  const { termMonths, graceMonths } = cfg.loan;
  const totalMonths = programMonths + graceMonths + termMonths;
  const deployAmt = cfg.savingsDeployed;

  const a = resolveFinancing(cfg, { savingsDeployed: deployAmt });
  const b = resolveFinancing(cfg, { savingsDeployed: 0 });
  const pmtDiff = b.totalPmt - a.totalPmt;
  const monthlyReturn = cfg.marketReturn / 12;
  const repayStart = programMonths + graceMonths;

  let portfolio = deployAmt;
  let depletedMonth = null;
  const yearly = [];

  for (let m = 1; m <= totalMonths; m++) {
    portfolio *= 1 + monthlyReturn;
    if (m > repayStart) portfolio -= pmtDiff;
    if (depletedMonth === null && portfolio <= 0 && m > repayStart) depletedMonth = m;

    if (m % 12 === 0) {
      const monthsRepaid = Math.max(0, Math.min(m - repayStart, termMonths));
      yearly.push({
        year: m / 12,
        portfolioRaw: portfolio,
        portfolioValue: Math.max(0, portfolio),
        cumPmtSaved: pmtDiff * monthsRepaid,
      });
    }
  }

  const terminal = yearly.length ? yearly[yearly.length - 1].portfolioRaw : 0;
  return {
    pathA: a, pathB: b, pmtDiff, yearly,
    terminalPortfolio: terminal,
    depletedYear: depletedMonth ? Math.ceil(depletedMonth / 12) : null,
    interestSaved: b.totalRepaid - a.totalRepaid,
    winner: terminal > 0 ? "invest" : "deploy",
    horizonYears: totalMonths / 12,
  };
}

/** The stress-versus-wealth tradeoff curve across deployment levels. */
export function runTradeoff(cfg, nSim = 500) {
  const cost = totalCoa(cfg.school, cfg.coaEscalation);
  const ceiling = Math.max(cfg.totalSavings, Math.max(0, cost - cfg.scholarship));
  const steps = 8;
  const years = (cfg.school.programYears ?? 2) + cfg.loan.termMonths / 12;

  const rows = Array.from({ length: steps }, (_, i) => {
    const deployed = Math.round((ceiling * i) / (steps - 1) / 1000) * 1000;
    const financing = resolveFinancing(cfg, { savingsDeployed: deployed });
    const res = runCoreSim(cfg, { nSim, financing, seed: (cfg.seed ?? 42) + 401 + i });
    const invest = runInvestVsDeploy({ ...cfg, savingsDeployed: deployed });
    return {
      savings: deployed,
      stress: res.stressProb,
      wealth: res.wealth.mean,
      portfolioSurplus: Math.max(0, invest.terminalPortfolio),
      investViable: invest.terminalPortfolio > 0,
      years,
    };
  });

  const sweetSpot = rows.find(r => r.stress < cfg.stressThreshold * 1.5) ?? null;
  return { rows, sweetSpot };
}

/**
 * Net-worth trajectory: go to school versus don't.
 *
 * The MBA branch is stochastic (career path and income volatility); the
 * no-MBA branch is deterministic, which flatters it slightly -- it assumes no
 * layoff, no stalled promotion. Worth remembering when reading the crossover.
 */
export function runNetWorthProjection(cfg, nSim = 800) {
  const programYears = cfg.school.programYears ?? 2;
  const schoolYears = Math.ceil(programYears);
  const horizon = cfg.horizon;
  const financing = resolveFinancing(cfg);
  const annualLoanPmt = financing.totalPmt * 12;
  const repayYears = cfg.loan.termMonths / 12;
  const scale = salaryIndex(cfg.school);
  const { list, probs } = pathMix(cfg);
  const afterTax = c => c * (1 - cfg.taxRate);

  const perYear = Array.from({ length: horizon }, () => []);

  for (let s = 0; s < nSim; s++) {
    const rng = mulberry32((cfg.seed ?? 42) * 1000 + s);
    let nw = cfg.currentNetWorth - cfg.savingsDeployed;
    const path = weightedChoice(rng, list, probs);
    let comp = path.year1 * scale;

    for (let yr = 0; yr < horizon; yr++) {
      if (yr < schoolYears) {
        // In school: no salary, net worth just compounds. Internship income
        // between year one and two applies to multi-year programmes only.
        nw *= 1 + cfg.marketReturn;
        if (yr === 1 && programYears > 1) nw += cfg.internshipIncome;
      } else {
        const noise = yr === schoolYears ? 0 : normalRandom(rng) * path.vol * 0.3;
        const actual = Math.max(comp * (1 + noise), INCOME_FLOOR);
        const saved = afterTax(actual) * cfg.savingsRate;
        const inRepayment = yr >= schoolYears && yr < schoolYears + repayYears;
        nw = nw * (1 + cfg.marketReturn) + saved - (inRepayment ? annualLoanPmt : 0);
        comp *= 1 + path.growth + normalRandom(rng) * path.vol * 0.3;
        comp = Math.max(comp, INCOME_FLOOR);
      }

      if (path.windfall && yr === schoolYears + path.windfall.yearOffset) {
        nw += drawWindfall(rng, path);
      }
      perYear[yr].push(nw);
    }
  }

  const series = [];
  let noMbaNw = cfg.currentNetWorth;
  let noMbaComp = cfg.currentComp;
  let crossover = null;

  for (let yr = 0; yr < horizon; yr++) {
    const compThisYear = noMbaComp;
    noMbaNw = noMbaNw * (1 + cfg.marketReturn) + afterTax(noMbaComp) * cfg.savingsRate;
    noMbaComp *= 1 + cfg.noMbaGrowth;

    const p50 = percentile(perYear[yr], 50);
    if (crossover === null && yr >= schoolYears && p50 > noMbaNw) crossover = yr + 1;

    series.push({
      year: yr + 1,
      inSchool: yr < schoolYears,
      noMba: Math.round(noMbaNw),
      noMbaComp: Math.round(compThisYear),
      mbaP10: Math.round(percentile(perYear[yr], 10)),
      mbaP25: Math.round(percentile(perYear[yr], 25)),
      mbaP50: Math.round(p50),
      mbaP75: Math.round(percentile(perYear[yr], 75)),
      mbaP90: Math.round(percentile(perYear[yr], 90)),
      mbaMean: Math.round(mean(perYear[yr])),
    });
  }

  const last = series[series.length - 1];
  const expectedY1 = list.reduce((s, p, i) => s + probs[i] * p.year1, 0) * scale;
  const expectedGrowth = list.reduce((s, p, i) => s + probs[i] * p.growth, 0);

  return {
    series,
    crossover,
    schoolYears,
    financing,
    annualLoanPmt,
    opportunityCost: afterTax(cfg.currentComp) * programYears,
    totalInvestment: afterTax(cfg.currentComp) * programYears + financing.cost,
    terminal: {
      noMba: last.noMba,
      mbaP50: last.mbaP50,
      mbaP10: last.mbaP10,
      mbaMean: last.mbaMean,
      delta: last.mbaP50 - last.noMba,
    },
    expectedY1,
    expectedGrowth,
    noMbaFinalComp: cfg.currentComp * Math.pow(1 + cfg.noMbaGrowth, horizon),
    mbaFinalComp: expectedY1 * Math.pow(1 + expectedGrowth, Math.max(0, horizon - schoolYears)),
  };
}

/** APR sensitivity table for the private tranche. */
export function rateScenarios(cfg, financing) {
  const rates = [...new Set([...cfg.aprTiers.map(t => t.apr), effectiveApr(cfg)])].sort((a, b) => a - b);
  return rates.map(rate => {
    const fedPmt = monthlyPayment(financing.federal, cfg.loan.federalRate, cfg.loan.termMonths);
    const privPmt = monthlyPayment(financing.private, rate, cfg.loan.termMonths);
    const monthly = fedPmt + privPmt;
    const total = monthly * cfg.loan.termMonths;
    return { rate, monthly, total, interest: total - financing.need };
  });
}

/** What each credit tier would cost on the same private balance. */
export function creditScenarios(cfg, financing) {
  const worst = [...cfg.aprTiers].sort((a, b) => a.minScore - b.minScore)[0];
  const baseTotal = monthlyPayment(financing.private, worst.apr, cfg.loan.termMonths) * cfg.loan.termMonths;
  return [...cfg.aprTiers]
    .sort((a, b) => a.minScore - b.minScore)
    .map(tier => {
      const monthly = monthlyPayment(financing.private, tier.apr, cfg.loan.termMonths);
      const total = monthly * cfg.loan.termMonths;
      return { score: tier.minScore, apr: tier.apr, monthly, total, savings: baseTotal - total };
    });
}
