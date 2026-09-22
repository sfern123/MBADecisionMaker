/**
 * Loan rule presets.
 *
 * The US federal picture changes on 1 July 2026: the OBBBA eliminates Grad
 * PLUS, which historically let graduate students borrow up to the full cost
 * of attendance. After that date the unsubsidised Stafford cap is the whole
 * federal entitlement and everything above it has to come from private
 * lenders -- which is why credit score suddenly drives the cost of an MBA.
 *
 * Both regimes ship here because applicants matriculating before and after
 * the cutover face genuinely different maths. The custom preset exists for
 * anyone outside the US system entirely.
 *
 * VERIFY THESE RATES. Federal student-loan rates reset annually each 1 July,
 * and private APRs depend on the lender and on you.
 */

export const LOAN_PRESETS = [
  {
    id: "us-post-obbba",
    label: "US federal -- from July 2026 (post-OBBBA)",
    description:
      "Grad PLUS eliminated. Federal borrowing is capped at the unsubsidised limit of $20,500/yr; everything beyond that is private debt priced off your credit.",
    federalPerYear: 20500,
    federalLifetimeCap: 100000,
    federalRate: 0.0894,
    termMonths: 120,
    graceMonths: 6,
    currency: "USD",
  },
  {
    id: "us-pre-obbba",
    label: "US federal -- before July 2026 (Grad PLUS available)",
    description:
      "Grad PLUS could cover cost of attendance minus other aid, so most students borrowed federally rather than privately -- at a higher rate but with federal protections.",
    federalPerYear: 200000,
    federalLifetimeCap: 400000,
    federalRate: 0.0905,
    termMonths: 120,
    graceMonths: 6,
    currency: "USD",
  },
  {
    id: "custom",
    label: "Custom / non-US",
    description:
      "Set every parameter yourself. Use this for non-US programmes, employer sponsorship, family loans, or any lender quote you already hold.",
    federalPerYear: 0,
    federalLifetimeCap: 0,
    federalRate: 0.05,
    termMonths: 120,
    graceMonths: 6,
    currency: "USD",
  },
];

export const getPreset = id => LOAN_PRESETS.find(p => p.id === id) ?? LOAN_PRESETS[0];

/** Credit score -> private APR. Indicative only; a real quote beats this. */
export const DEFAULT_APR_TIERS = [
  { minScore: 640, apr: 0.115 },
  { minScore: 680, apr: 0.095 },
  { minScore: 700, apr: 0.085 },
  { minScore: 720, apr: 0.075 },
  { minScore: 740, apr: 0.065 },
  { minScore: 780, apr: 0.058 },
];

export const CURRENCIES = [
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "CAD", symbol: "C$", label: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", label: "Australian Dollar" },
  { code: "INR", symbol: "₹", label: "Indian Rupee" },
  { code: "SGD", symbol: "S$", label: "Singapore Dollar" },
];

export const TERM_OPTIONS = [
  { months: 60, label: "5 years" },
  { months: 120, label: "10 years" },
  { months: 180, label: "15 years" },
  { months: 240, label: "20 years" },
  { months: 300, label: "25 years" },
];

/**
 * What you give up by skipping federal loans.
 *
 * Note there is deliberately no "no federal" preset in the list above:
 * whether you use federal borrowing is a single boolean on the funding
 * record, and the presets only describe which federal *rules* apply once you
 * do. Two places encoding the same fact is how they end up disagreeing.
 *
 * Purely on monthly cost, private borrowing often wins — a good credit score
 * can beat the federal rate outright. That comparison is incomplete, because
 * the federal protections below have no private equivalent and only matter in
 * the situations you cannot plan for. The UI shows this list whenever federal
 * borrowing is switched off, so the choice is made with both columns visible.
 */
export const FEDERAL_PROTECTIONS = [
  {
    label: "Income-driven repayment",
    detail: "Federal payments can scale down with your income. Private payments are fixed regardless of what happens to your career.",
  },
  {
    label: "Deferment and forbearance",
    detail: "Formal options to pause payments during unemployment or hardship. Private lenders may offer something similar, at their discretion.",
  },
  {
    label: "Loan forgiveness programmes",
    detail: "Public Service Loan Forgiveness and similar schemes only ever apply to federal loans. Refinancing federal debt privately forfeits this permanently.",
  },
  {
    label: "Death and disability discharge",
    detail: "Federal loans are discharged. Private loans may fall to a cosigner or your estate.",
  },
  {
    label: "Fixed rate, guaranteed",
    detail: "The federal rate is set at disbursement and cannot change. Private loans may be variable.",
  },
];
