/**
 * Career ladder template.
 *
 * The original version of this model hardcoded one company's levels (L5 IC,
 * L6 IC, Manager, Director, VP) with dollar figures attached. That only works
 * for one industry. Here the ladder is defined in MULTIPLES of a base
 * compensation, so the same structure describes a consulting partner track,
 * a banking MD track, or a corporate GM track — you supply the base and the
 * multiples scale from it.
 *
 * `afterYears` is the earliest you could reach the level; `prob` is the
 * annual chance of promotion once eligible. Every value is editable.
 */
export const LADDER_TEMPLATE = [
  { id: "ic", label: "Individual contributor", multiple: 1.00, afterYears: 0, prob: 1.00 },
  { id: "senior", label: "Senior / lead", multiple: 1.35, afterYears: 2, prob: 0.55 },
  { id: "manager", label: "Manager", multiple: 1.65, afterYears: 4, prob: 0.35 },
  { id: "director", label: "Director / principal", multiple: 2.40, afterYears: 7, prob: 0.22 },
  { id: "vp", label: "VP / partner", multiple: 3.60, afterYears: 11, prob: 0.12 },
  { id: "exec", label: "C-suite / senior partner", multiple: 5.50, afterYears: 15, prob: 0.07 },
];

/**
 * How much faster the ladder moves with an MBA.
 *
 * This is the single most contestable assumption in the whole tool: it is the
 * number that decides whether the degree "works". It is shipped as an
 * editable multiplier rather than buried in the code precisely because
 * reasonable people put it anywhere from 1.0 (no effect) to 2.0.
 */
export const DEFAULT_MBA_ACCELERATION = {
  promoProbMultiplier: 1.6,   // promotions are likelier each year
  yearsEarlier: 1,            // and become available sooner
};

/** Entrepreneurial detour: leaving the ladder to found something. */
export const DEFAULT_FOUNDER_OPTION = {
  annualProbNoMba: 0.02,
  annualProbMba: 0.05,
  salaryFloor: 80000,
  salaryCeiling: 130000,
  bigExitProb: 0.03,
  bigExitMin: 2000000,
  bigExitMax: 18000000,
  smallExitProb: 0.06,
  smallExitMin: 200000,
  smallExitMax: 900000,
  failProb: 0.14,
};

export const COMP_TIERS = [200000, 300000, 400000, 500000, 750000, 1000000, 1500000];
