/**
 * Post-MBA career archetypes.
 *
 * Each path is a first-year total-compensation figure plus how it grows and
 * how noisy it is. `windfall` models lumpy, low-probability upside -- carried
 * interest, an equity event, a real-estate promote -- as DATA rather than as
 * a special case in the simulation code, so any path can have one.
 *
 *   year1      Expected total first-year comp (base + bonus + equity).
 *   growth     Expected annual compensation growth.
 *   vol        Annual volatility. Higher = wider range of outcomes.
 *   windfall   { label, probability, min, max, yearOffset } or null.
 *              yearOffset is years after graduation.
 *   grounded   true when the figure traces to a cited employment report or
 *              recruiter survey; false when it is a reasoned industry
 *              estimate. The UI surfaces this distinction.
 *
 * Every field is editable in the app, and you can add your own path. If you
 * have a real offer in hand, use that number -- it beats any average here.
 */

export const CAREER_DATA_AS_OF = "Class of 2025 / 2025-26 recruiting cycle";

export const CAREER_SOURCES = [
  "https://poetsandquants.com/2026/05/31/high-low-mba-salaries-bonuses-at-the-top-100-u-s-b-schools/",
  "https://www.bschools.org/blog/mba-salary-guide",
  "https://12twenty.com/blog/mba-salaries-placement-rates-2025",
];

export const CAREER_PATHS = [
  {
    id: "consulting", label: "Management Consulting", group: "Consulting",
    year1: 215000, growth: 0.10, vol: 0.08, windfall: null, grounded: true,
    note: "MBB/T2 associate. ~$190k base plus a $35-50k signing bonus; fast, predictable promotion ladder.",
  },
  {
    id: "ibanking", label: "Investment Banking", group: "Finance",
    year1: 265000, growth: 0.12, vol: 0.22, windfall: null, grounded: true,
    note: "Associate. ~$190-200k base plus a highly variable year-end bonus.",
  },
  {
    id: "pe", label: "Private Equity", group: "Finance",
    year1: 250000, growth: 0.12, vol: 0.24, grounded: false,
    windfall: { label: "Carried interest", probability: 0.30, min: 150000, max: 1200000, yearOffset: 8 },
    note: "Estimate -- PE comp is rarely published. Carry is the real prize and arrives late, if at all.",
  },
  {
    id: "vc", label: "Venture Capital", group: "Finance",
    year1: 200000, growth: 0.08, vol: 0.18, grounded: false,
    windfall: { label: "Carried interest", probability: 0.25, min: 100000, max: 1500000, yearOffset: 9 },
    note: "Estimate. Cash comp is modest relative to PE; the distribution is dominated by fund performance.",
  },
  {
    id: "techpm", label: "Tech -- Product Management", group: "Technology",
    year1: 210000, growth: 0.06, vol: 0.14, windfall: null, grounded: true,
    note: "Large-cap tech APM/PM. ~$175k base plus bonus and RSUs; equity value moves with the share price.",
  },
  {
    id: "techstrat", label: "Tech -- Strategy / BizOps", group: "Technology",
    year1: 180000, growth: 0.06, vol: 0.12, windfall: null, grounded: true,
    note: "Corporate strategy, BizOps, or chief-of-staff roles at established tech companies.",
  },
  {
    id: "startup", label: "Early-stage Startup Operator", group: "Technology",
    year1: 165000, growth: 0.09, vol: 0.26, grounded: false,
    windfall: { label: "Equity event", probability: 0.15, min: 50000, max: 800000, yearOffset: 6 },
    note: "Below-market cash for equity that is usually worth nothing and occasionally worth a lot.",
  },
  {
    id: "founder", label: "Founder / Entrepreneurship", group: "Entrepreneurial",
    year1: 85000, growth: 0.15, vol: 0.45, grounded: false,
    windfall: { label: "Exit", probability: 0.10, min: 250000, max: 4000000, yearOffset: 7 },
    note: "The widest distribution of any path: low salary, most outcomes near zero, a long right tail.",
  },
  {
    id: "genmgmt", label: "General Management / LDP", group: "Industry",
    year1: 150000, growth: 0.06, vol: 0.08, windfall: null, grounded: true,
    note: "Rotational leadership-development programmes at large corporates.",
  },
  {
    id: "corpfin", label: "Corporate Finance / FP&A", group: "Industry",
    year1: 145000, growth: 0.05, vol: 0.07, windfall: null, grounded: true,
    note: "In-house finance. The steadiest path here -- low volatility, modest growth.",
  },
  {
    id: "cpg", label: "CPG Brand Management / Marketing", group: "Industry",
    year1: 140000, growth: 0.06, vol: 0.07, windfall: null, grounded: true,
    note: "Brand management at consumer-goods companies. Strong work-life balance, lower ceiling.",
  },
  {
    id: "healthcare", label: "Healthcare & Biotech", group: "Industry",
    year1: 165000, growth: 0.06, vol: 0.11, windfall: null, grounded: false,
    note: "Estimate. Spans pharma commercial roles, provider strategy, and biotech corp-dev.",
  },
  {
    id: "energy", label: "Energy / Industrials", group: "Industry",
    year1: 155000, growth: 0.05, vol: 0.12, windfall: null, grounded: false,
    note: "Estimate. Compensation tracks commodity cycles more than most paths.",
  },
  {
    id: "realestate", label: "Real Estate", group: "Finance",
    year1: 165000, growth: 0.08, vol: 0.18, grounded: false,
    windfall: { label: "Promote / deal participation", probability: 0.22, min: 75000, max: 700000, yearOffset: 7 },
    note: "Estimate. Acquisitions and development roles often carry deal-level participation.",
  },
  {
    id: "socialimpact", label: "Nonprofit / Social Impact / Public Sector", group: "Mission",
    year1: 105000, growth: 0.04, vol: 0.06, windfall: null, grounded: false,
    note: "Estimate. Materially lower pay -- check whether loan-forgiveness programmes apply to you, since this model does not include them.",
  },
];

export const getPath = id => CAREER_PATHS.find(p => p.id === id);

export const blankCustomPath = (n = 1) => ({
  id: `custom-${n}-${Math.random().toString(36).slice(2, 7)}`,
  label: `Custom path ${n}`,
  group: "Custom",
  year1: 150000,
  growth: 0.06,
  vol: 0.12,
  windfall: null,
  grounded: false,
  isCustom: true,
  note: "Your own path. Use a real offer if you have one.",
});
