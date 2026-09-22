import { getSchool } from "../data/schools.js";
import { CAREER_PATHS } from "../data/careerPaths.js";
import { getPreset, DEFAULT_APR_TIERS } from "../data/loanPresets.js";
import { LADDER_TEMPLATE, DEFAULT_MBA_ACCELERATION, DEFAULT_FOUNDER_OPTION, COMP_TIERS } from "../data/ladder.js";
import {
  totalComp, netWorth, liquidAssets, availableForTuition,
  fireAccounts, fireTaxableBasis, monthlyDebtPayments, propertyAnnualCashFlow,
} from "./derived.js";

export const PROFILE_VERSION = 2;

/** A blank balance sheet. Every section is empty until the user adds to it. */
export const emptyBalanceSheet = () => ({
  cash: 0,
  brokerage: { value: 0, costBasis: 0 },
  retirement: { preTax: 0, roth: 0, afterTax: 0 },
  equityHoldings: [],
  properties: [],
  otherAssets: [],
  debts: [],
});

export const newEquityHolding = (n = 1) => ({
  id: `eq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  label: n > 1 ? `Company stock ${n}` : "Company stock",
  price: 100,
  vested: 0,
  unvested: 0,
  costBasis: 60,
  vestingYears: 4,
  drift: 0.10,
  vol: 0.28,
  growthPresetId: "largecap",
  sharesToSell: 0,
  saleIsLongTerm: true,
});

export const newProperty = (n = 1) => ({
  id: `prop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  label: n > 1 ? `Property ${n}` : "Home",
  isPrimary: n === 1,
  value: 0,
  appreciation: 0.03,
  mortgageBalance: 0,
  mortgageRate: 0.065,
  monthlyPayment: 0,
  monthlyRent: 0,
  monthlyExpenses: 0,
});

export const newDebt = (n = 1) => ({
  id: `debt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  label: n > 1 ? `Debt ${n}` : "Other debt",
  balance: 0,
  rate: 0.07,
  monthlyPayment: 0,
});

export const newOtherAsset = (n = 1) => ({
  id: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  label: n > 1 ? `Other asset ${n}` : "Other asset",
  value: 0,
  growthRate: 0.05,
});

/**
 * Neutral starting point.
 *
 * Nothing here describes a real person. These are placeholders chosen to be
 * plausible-but-obviously-generic, so a new user replaces them during intake.
 */
export function makeDefaultProfile() {
  const preset = getPreset("us-post-obbba");
  return {
    version: PROFILE_VERSION,
    onboarded: false,

    // How much of the app to expose. Chosen at intake, switchable any time.
    detailLevel: "simple",

    // Programme
    schoolId: "hbs",
    customSchool: null,
    compareSchoolIds: ["hbs", "gsb", "wharton", "booth"],
    coaEscalation: 0.04,

    // ── Compensation, split three ways ──
    // These behave differently under uncertainty: base is reliable, bonus
    // swings with the year, equity swings with the share price. Simple mode
    // puts everything in `base`.
    compensation: { base: 110000, bonus: 0, equityAnnual: 0 },

    // ── The balance sheet: the one source of truth for wealth ──
    // Net worth is derived from this, never typed. See state/derived.js.
    balanceSheet: emptyBalanceSheet(),

    // ── Funding the degree ──
    funding: {
      useFederal: true,
      cashDeployed: 0,
      scholarship: { perYear: 0, years: 2, renewalProbability: 1 },
      family: { amount: 0, rate: 0, termYears: 10 },
      employer: { amount: 0, clawbackYears: 2 },
    },

    // Borrowing
    loanPresetId: preset.id,
    loan: {
      federalPerYear: preset.federalPerYear,
      federalLifetimeCap: preset.federalLifetimeCap,
      federalRate: preset.federalRate,
      termMonths: preset.termMonths,
      graceMonths: preset.graceMonths,
    },
    creditScore: 720,
    useDirectApr: false,
    directApr: 0.085,
    aprTiers: DEFAULT_APR_TIERS.map(t => ({ ...t })),
    currency: "USD",

    // Behaviour and assumptions
    taxRate: 0.32,
    savingsRate: 0.20,
    noMbaGrowth: 0.04,
    internshipIncome: 15000,

    // Market and modelling
    marketReturn: 0.08,
    discountRate: 0.04,
    horizon: 15,
    stressThreshold: 0.20,
    seed: 42,
    sims: 3000,

    // Present results in today's purchasing power rather than raw future
    // dollars, which overstate every long projection.
    showRealDollars: true,

    // Career mix: the most common MBA destinations, rather than presuming
    // anything about this particular user's background.
    pathWeights: { consulting: 40, techpm: 30, ibanking: 30 },

    // Tax detail. The flat rate drives headline sections; bracket maths is
    // used where it genuinely changes the answer (gains, retirement).
    statePresetId: "none",
    stateRate: 0,
    useBracketTax: true,
    flatCapGainsRate: null,

    // Equity modelling knobs
    indexVol: 0.16,
    diversifyPct: 0.25,
    equityHorizonYears: 10,
    equityAfterTaxTerminal: true,

    // Career ladder
    ladder: LADDER_TEMPLATE.map(l => ({ ...l })),
    mbaAcceleration: { ...DEFAULT_MBA_ACCELERATION },
    founderOption: { ...DEFAULT_FOUNDER_OPTION },
    compTiers: [...COMP_TIERS],
    ladderYears: 20,
    noMbaVol: 0.03,

    // Retirement
    currentAge: 28,
    annualSpending: 65000,
    withdrawalRate: 0.04,
    inflation: 0.03,
    portfolioVolatility: 0.15,
    coastTargetAge: 60,
    otherRetirementIncome: 0,
    retirementIncomeStartAge: 67,
    contributions: { preTax: 0, taxFree: 0, afterTax: 0 },
  };
}

/**
 * Upgrades a v1 profile to v2.
 *
 * v1 stored wealth in five unrelated fields. This folds them into the single
 * balance sheet without losing anything: the old net-worth scalar becomes a
 * generic asset the user can later break apart, and the retirement accounts,
 * equity position, and savings figure move to their proper homes.
 *
 * Without this, `useProfile` would see a version mismatch and silently throw
 * away every saved scenario.
 */
export function migrateV1toV2(old) {
  const base = makeDefaultProfile();
  const bs = emptyBalanceSheet();

  bs.cash = old.totalSavings ?? 0;
  bs.retirement = {
    preTax: old.accounts?.preTax ?? 0,
    roth: old.accounts?.taxFree ?? 0,
    afterTax: old.accounts?.afterTax ?? 0,
  };
  bs.brokerage = {
    value: old.accounts?.taxable ?? 0,
    costBasis: old.taxableBasis ?? 0,
  };
  if (old.accounts?.cash) bs.cash += old.accounts.cash;

  if (old.equity && (old.equity.vestedShares > 0 || old.equity.unvestedShares > 0)) {
    bs.equityHoldings = [{
      ...newEquityHolding(),
      label: old.equity.label ?? "Company stock",
      price: old.equity.price ?? 100,
      vested: old.equity.vestedShares ?? 0,
      unvested: old.equity.unvestedShares ?? 0,
      costBasis: old.equity.costBasis ?? 60,
      vestingYears: old.equity.vestingYears ?? 4,
      drift: old.equity.drift ?? 0.10,
      vol: old.equity.vol ?? 0.28,
      sharesToSell: old.equity.sharesToSell ?? 0,
      saleIsLongTerm: old.equity.saleIsLongTerm ?? true,
    }];
  }

  // v1's five wealth fields overlapped in ways that were never well defined —
  // `otherAssets` meant "everything besides the equity position", which plainly
  // intersects `currentNetWorth`. Rather than guess, treat the old net-worth
  // scalar as the authoritative total and add only the shortfall, so an upgrade
  // can never silently inflate someone's wealth.
  if (old.otherAssets > 0) {
    bs.otherAssets.push({ ...newOtherAsset(), label: "Investments", value: old.otherAssets });
  }
  const itemised =
    bs.cash + bs.brokerage.value
    + bs.retirement.preTax + bs.retirement.roth + bs.retirement.afterTax
    + (bs.equityHoldings[0] ? bs.equityHoldings[0].vested * bs.equityHoldings[0].price : 0)
    + (old.otherAssets > 0 ? old.otherAssets : 0);
  const residual = Math.max(0, (old.currentNetWorth ?? 0) - itemised);
  if (residual > 0) {
    bs.otherAssets.push({ ...newOtherAsset(), label: "Other net worth", value: residual });
  }

  return {
    ...base,
    ...old,
    version: PROFILE_VERSION,
    detailLevel: bs.equityHoldings.length ? "detailed" : "simple",
    compensation: { base: old.currentComp ?? 110000, bonus: 0, equityAnnual: old.equity?.annualRefresh ?? 0 },
    balanceSheet: bs,
    funding: {
      ...base.funding,
      useFederal: (old.loan?.federalPerYear ?? 0) > 0,
      cashDeployed: old.savingsDeployed ?? 0,
      scholarship: { perYear: (old.scholarship ?? 0) / 2, years: 2, renewalProbability: 1 },
    },
    // Drop the superseded v1 fields so nothing reads them by accident.
    currentComp: undefined,
    currentNetWorth: undefined,
    totalSavings: undefined,
    savingsDeployed: undefined,
    scholarship: undefined,
    equity: undefined,
    otherAssets: undefined,
    accounts: undefined,
    taxableBasis: undefined,
  };
}

/**
 * Merges the shipped career-path library with the user's per-path edits and
 * any paths they added themselves, then attaches the chosen weights. Both the
 * editor and the simulation read through this, so what you see in Settings is
 * exactly what gets simulated.
 */
export function resolvePaths(profile) {
  const overrides = profile.pathOverrides ?? {};
  return CAREER_PATHS.concat(profile.customPaths ?? []).map(p => ({
    ...p,
    ...(overrides[p.id] ?? {}),
    weight: profile.pathWeights[p.id] ?? 0,
  }));
}

/**
 * Expands the stored profile into the config the simulation functions want.
 *
 * This is where the derived selectors get applied once, so no model has to
 * know how net worth or total compensation are assembled.
 */
export function toSimConfig(profile) {
  const school =
    profile.schoolId === "custom" && profile.customSchool
      ? profile.customSchool
      : getSchool(profile.schoolId);

  const paths = resolvePaths(profile).filter(p => p.weight > 0);
  const active = paths.length ? paths : [{ ...CAREER_PATHS[0], weight: 1 }];

  // Expected first-year comp across the chosen mix — the base the career
  // ladder climbs from on the MBA branch.
  const totalWeight = active.reduce((s, p) => s + p.weight, 0) || 1;
  const mbaBaseComp = active.reduce((s, p) => s + (p.weight / totalWeight) * p.year1, 0);

  const bs = profile.balanceSheet ?? emptyBalanceSheet();
  const scholarshipTotal =
    (profile.funding?.scholarship?.perYear ?? 0) * (profile.funding?.scholarship?.years ?? 0);

  // The equity models operate on a single position at a time. Project the
  // first holding into the shape they expect.
  //
  // `annualRefresh` is sourced from `compensation.equityAnnual` rather than
  // being its own input. That is the fix for the old double-count: a stock
  // grant is compensation AND it becomes shares, so it has to be entered once
  // and flow to both, not typed twice in two places that never agreed.
  const holdings = bs.equityHoldings ?? [];
  const primary = holdings[0] ?? null;
  const equity = primary
    ? {
        label: primary.label,
        price: primary.price,
        vestedShares: primary.vested,
        unvestedShares: primary.unvested,
        costBasis: primary.costBasis,
        vestingYears: primary.vestingYears,
        annualRefresh: profile.compensation?.equityAnnual ?? 0,
        drift: primary.drift,
        vol: primary.vol,
        growthPresetId: primary.growthPresetId,
        sharesToSell: primary.sharesToSell ?? 0,
        saleIsLongTerm: primary.saleIsLongTerm ?? true,
      }
    : { price: 100, vestedShares: 0, unvestedShares: 0, costBasis: 60, vestingYears: 4,
        annualRefresh: 0, drift: 0.10, vol: 0.28, sharesToSell: 0, saleIsLongTerm: true };

  // Everything invested that is NOT the primary holding — the diversification
  // baseline the concentration figures are measured against.
  const otherHoldingsValue = holdings
    .slice(1)
    .reduce((s, h) => s + (h.vested ?? 0) * (h.price ?? 0), 0);
  const otherAssets =
    liquidAssets(bs) + fireAccounts(bs).preTax + fireAccounts(bs).taxFree
    + fireAccounts(bs).afterTax + otherHoldingsValue
    + (bs.otherAssets ?? []).reduce((s, a) => s + (a.value ?? 0), 0)
    - (bs.cash ?? 0);

  return {
    ...profile,
    school,
    paths: active,
    mbaBaseComp,

    // Derived once, read everywhere. Nothing downstream re-sums the balance
    // sheet, which is what keeps the tabs agreeing with each other.
    currentComp: totalComp(profile.compensation),
    currentNetWorth: netWorth(bs),
    totalSavings: availableForTuition(bs),
    liquidAssets: liquidAssets(bs),
    savingsDeployed: profile.funding?.cashDeployed ?? 0,
    scholarship: scholarshipTotal,
    accounts: fireAccounts(bs),
    taxableBasis: fireTaxableBasis(bs),
    existingMonthlyDebt: monthlyDebtPayments(bs),
    propertyCashFlow: propertyAnnualCashFlow(bs),
    equity,
    otherAssets,
  };
}
