import { getSchool } from "../data/schools.js";
import { CAREER_PATHS } from "../data/careerPaths.js";
import { getPreset, DEFAULT_APR_TIERS } from "../data/loanPresets.js";

/**
 * Neutral starting point.
 *
 * Nothing in here describes a real person. These are placeholders chosen to
 * be plausible-but-obviously-generic so that a new user immediately replaces
 * them with their own figures during onboarding.
 */
export function makeDefaultProfile() {
  const preset = getPreset("us-post-obbba");
  return {
    version: 1,
    onboarded: false,

    // Programme
    schoolId: "hbs",
    customSchool: null,
    compareSchoolIds: ["hbs", "gsb", "wharton", "booth"],
    coaEscalation: 0.04,

    // Funding
    scholarship: 0,
    savingsDeployed: 0,
    totalSavings: 50000,

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

    // Personal finances
    currentComp: 110000,
    currentNetWorth: 25000,
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

    // Career mix: start from the two most common MBA destinations rather
    // than presuming anything about the user's background.
    pathWeights: { consulting: 40, techpm: 30, ibanking: 30 },
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

/** Expands the stored profile into the config the simulation functions want. */
export function toSimConfig(profile) {
  const school =
    profile.schoolId === "custom" && profile.customSchool
      ? profile.customSchool
      : getSchool(profile.schoolId);

  const paths = resolvePaths(profile).filter(p => p.weight > 0);

  return {
    ...profile,
    school,
    paths: paths.length ? paths : [{ ...CAREER_PATHS[0], weight: 1 }],
  };
}
