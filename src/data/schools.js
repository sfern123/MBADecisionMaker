/**
 * School library.
 *
 * HOW TO READ / MAINTAIN THIS FILE
 * --------------------------------
 * Every row carries its own provenance. Nothing here is invented:
 *
 *   coaPerYear   Annual cost of attendance (tuition + fees + living), for a
 *                single non-resident student living off campus.
 *   programYears Length of the degree. This matters a lot -- a one-year
 *                European MBA has roughly half the opportunity cost of a
 *                two-year US MBA, and the simulator models that directly.
 *   medianBase / medianSigning
 *                From published employment reports. `compVerified: false`
 *                means we could not confirm current figures, and the app
 *                shows a warning instead of quietly guessing.
 *   dataWarning  Set when a source figure looks internally inconsistent.
 *
 * These numbers go stale every single year. Treat them as a starting point,
 * then replace them with the real figures from your admit letter and the
 * school's own employment report. Every field is editable in the UI.
 */

export const SCHOOL_DATA_AS_OF = "2025-26 academic year";

export const SOURCES = {
  coaUS:
    "https://www.clearadmit.com/real-numbers-of-mba-admissions/cost-of-mba-programs-in-the-u-s/",
  compUS:
    "https://poetsandquants.com/2026/05/31/high-low-mba-salaries-bonuses-at-the-top-100-u-s-b-schools/",
  insead:
    "https://www.insead.edu/master-programmes/master-business-administration/financing",
  lbs: "https://www.mba.today/guide/fees-europe",
};

// Reference total first-year comp used to normalise salaryIndex to ~1.00.
export const SALARY_INDEX_BASE = 200000;

const usSchool = (o) => ({
  currency: "USD",
  programYears: 2,
  coaSource: SOURCES.coaUS,
  compSource: SOURCES.compUS,
  coaAsOf: "2025-26",
  compAsOf: "Class of 2025",
  compVerified: true,
  ...o,
});

export const SCHOOLS = [
  usSchool({ id: "hbs", name: "Harvard Business School", short: "Harvard", coaPerYear: 126536, medianBase: 180889, medianSigning: 36740 }),
  usSchool({ id: "gsb", name: "Stanford GSB", short: "Stanford", coaPerYear: 135771, medianBase: 190109, medianSigning: 35888 }),
  usSchool({ id: "wharton", name: "Wharton (UPenn)", short: "Wharton", coaPerYear: 132404, medianBase: 179909, medianSigning: 39756 }),
  usSchool({ id: "booth", name: "Chicago Booth", short: "Booth", coaPerYear: 129403, medianBase: 172309, medianSigning: 35847 }),
  usSchool({ id: "kellogg", name: "Northwestern Kellogg", short: "Kellogg", coaPerYear: 128852, medianBase: 167151, medianSigning: 34658 }),
  usSchool({ id: "sloan", name: "MIT Sloan", short: "Sloan", coaPerYear: 138310, medianBase: 173132, medianSigning: 40192 }),
  usSchool({ id: "cbs", name: "Columbia Business School", short: "Columbia", coaPerYear: 137571, medianBase: 173816, medianSigning: 41016 }),
  usSchool({ id: "tuck", name: "Dartmouth Tuck", short: "Tuck", coaPerYear: 135329, medianBase: 168328, medianSigning: 36638 }),
  usSchool({ id: "stern", name: "NYU Stern", short: "Stern", coaPerYear: 135840, medianBase: 168970, medianSigning: 41007 }),
  usSchool({ id: "haas", name: "UC Berkeley Haas", short: "Haas", coaPerYear: 133655, medianBase: 164930, medianSigning: 35829 }),
  usSchool({ id: "darden", name: "UVA Darden", short: "Darden", coaPerYear: 121275, medianBase: 162578, medianSigning: 36906 }),
  usSchool({ id: "yale", name: "Yale SOM", short: "Yale", coaPerYear: 123936, medianBase: 161523, medianSigning: 36677 }),
  usSchool({ id: "johnson", name: "Cornell Johnson", short: "Cornell", coaPerYear: 119994, medianBase: 158426, medianSigning: 39795 }),
  usSchool({ id: "ross", name: "Michigan Ross", short: "Ross", coaPerYear: 111725, medianBase: 159272, medianSigning: 33386 }),
  usSchool({ id: "anderson", name: "UCLA Anderson", short: "Anderson", coaPerYear: 133655, medianBase: 153566, medianSigning: 34027 }),
  usSchool({ id: "tepper", name: "Carnegie Mellon Tepper", short: "Tepper", coaPerYear: 116428, medianBase: 154846, medianSigning: 38610 }),

  // COA confirmed; current employment-report compensation not confirmed from a
  // primary source, so these fall back to the user's own career mix unscaled.
  usSchool({ id: "fuqua", name: "Duke Fuqua", short: "Fuqua", coaPerYear: 114952, medianBase: null, medianSigning: 37180, compVerified: false }),
  usSchool({ id: "kenan", name: "UNC Kenan-Flagler", short: "UNC", coaPerYear: 102960, medianBase: null, medianSigning: null, compVerified: false }),
  usSchool({ id: "goizueta", name: "Emory Goizueta", short: "Emory", coaPerYear: 115722, medianBase: null, medianSigning: null, compVerified: false }),
  usSchool({ id: "mcdonough", name: "Georgetown McDonough", short: "Georgetown", coaPerYear: 111487, medianBase: null, medianSigning: null, compVerified: false }),
  usSchool({ id: "foster", name: "UW Foster", short: "Foster", coaPerYear: 100044, medianBase: null, medianSigning: 39917, compVerified: false }),
  usSchool({ id: "owen", name: "Vanderbilt Owen", short: "Vanderbilt", coaPerYear: 111149, medianBase: null, medianSigning: null, compVerified: false }),
  usSchool({ id: "kelley", name: "Indiana Kelley", short: "Kelley", coaPerYear: 83940, medianBase: null, medianSigning: null, compVerified: false }),
  usSchool({ id: "jones", name: "Rice Jones", short: "Rice", coaPerYear: 79116, medianBase: null, medianSigning: null, compVerified: false }),
  usSchool({
    id: "mccombs", name: "UT Austin McCombs", short: "McCombs", coaPerYear: 122428,
    medianBase: null, medianSigning: null, compVerified: false,
    dataWarning: "Source lists $122,428 for 2025-26 vs $84,604 the prior year. That jump probably reflects a resident/non-resident change rather than a real increase -- check the school's figure for your residency status.",
  }),
  usSchool({
    id: "marshall", name: "USC Marshall", short: "Marshall", coaPerYear: 89769,
    medianBase: null, medianSigning: null, compVerified: false,
    dataWarning: "Source lists $89,769 for 2025-26 vs $122,922 the prior year. Verify directly with the school before relying on this.",
  }),

  // Non-US programmes. Figures are in local currency with NO FX conversion --
  // the app just swaps the symbol, so don't compare these against the USD rows
  // without converting yourself.
  {
    id: "insead", name: "INSEAD", short: "INSEAD", currency: "EUR",
    programYears: 1, coaPerYear: 143000,
    medianBase: 111400, medianSigning: 0, compVerified: false,
    coaSource: SOURCES.insead, compSource: SOURCES.insead,
    coaAsOf: "2026 intake", compAsOf: "recent employment report",
    dataWarning: "One-year programme. COA is the midpoint of a published EUR137k-149k all-in range; median salary is approximate. Amounts are in EUR and are not FX-converted.",
  },
  {
    id: "lbs", name: "London Business School", short: "LBS", currency: "GBP",
    programYears: 1.6, coaPerYear: 97000,
    medianBase: null, medianSigning: null, compVerified: false,
    coaSource: SOURCES.lbs, compSource: SOURCES.lbs,
    coaAsOf: "2025-26", compAsOf: null,
    dataWarning: "LBS runs 15-21 months; modelled here as 1.6 years. COA is approximated from GBP109,700 tuition plus estimated London living costs. Amounts are in GBP and are not FX-converted.",
  },
];

export const CUSTOM_SCHOOL = {
  id: "custom",
  name: "Custom school",
  short: "Custom",
  currency: "USD",
  programYears: 2,
  coaPerYear: 110000,
  medianBase: null,
  medianSigning: null,
  compVerified: false,
  coaSource: null,
  compSource: null,
  coaAsOf: null,
  compAsOf: null,
  isCustom: true,
};

export const ALL_SCHOOLS = [...SCHOOLS, CUSTOM_SCHOOL];

export const getSchool = id =>
  ALL_SCHOOLS.find(s => s.id === id) ?? ALL_SCHOOLS[0];

/**
 * Total cost across the whole programme. Year two typically costs a few
 * percent more than year one, so callers pass an escalation rate rather than
 * us silently assuming one.
 */
export function totalCoa(school, escalation = 0.04) {
  const years = school.programYears ?? 2;
  let total = 0;
  for (let y = 0; y < Math.floor(years); y++) {
    total += school.coaPerYear * Math.pow(1 + escalation, y);
  }
  const partial = years - Math.floor(years);
  if (partial > 0) {
    total += school.coaPerYear * partial * Math.pow(1 + escalation, Math.floor(years));
  }
  return total;
}

/**
 * How this school's graduates are paid relative to the reference cohort.
 * Used to scale the user's own career-path mix. Returns exactly 1 when we
 * have no verified compensation data, so an unverified school never silently
 * moves the numbers.
 */
export function salaryIndex(school) {
  if (!school.compVerified || school.medianBase == null) return 1;
  const total = school.medianBase + (school.medianSigning ?? 0);
  return total / SALARY_INDEX_BASE;
}
