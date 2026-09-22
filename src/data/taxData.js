/**
 * Tax reference data.
 *
 * Shipped for the US because that is where most of the loan machinery in
 * this app applies. Everything is editable, and a flat-rate mode exists so
 * the simulator still works outside the US.
 *
 * Source: IRS Revenue Procedure 2025-32, via the Tax Foundation's 2026
 * bracket summary — https://taxfoundation.org/data/all/federal/2026-tax-brackets/
 * Retrieved September 2026. Brackets change every year; check before relying
 * on these.
 */

export const TAX_YEAR = 2026;
export const TAX_SOURCE = "https://taxfoundation.org/data/all/federal/2026-tax-brackets/";

/** 2026 federal ordinary-income brackets, single filer. `upTo` is inclusive. */
export const FEDERAL_BRACKETS_SINGLE = [
  { upTo: 12400, rate: 0.10 },
  { upTo: 50400, rate: 0.12 },
  { upTo: 105700, rate: 0.22 },
  { upTo: 201775, rate: 0.24 },
  { upTo: 256225, rate: 0.32 },
  { upTo: 640600, rate: 0.35 },
  { upTo: Infinity, rate: 0.37 },
];

/** 2026 long-term capital gains brackets, single filer. */
export const LTCG_BRACKETS_SINGLE = [
  { upTo: 49450, rate: 0.00 },
  { upTo: 545500, rate: 0.15 },
  { upTo: Infinity, rate: 0.20 },
];

export const STANDARD_DEDUCTION_SINGLE = 16100;

/** Net Investment Income Tax: 3.8% above this modified AGI threshold. */
export const NIIT = { rate: 0.038, threshold: 200000 };

/**
 * Approximate combined top marginal state + local income tax rates.
 *
 * These are flat approximations of a progressive reality, chosen because
 * shipping full bracket tables for fifty states would be more precision than
 * this model can honestly support. At MBA-level incomes the top marginal rate
 * is usually the one that binds. Override it if you know yours.
 */
export const STATE_PRESETS = [
  { id: "none", label: "No state income tax (TX, FL, WA, NV, TN…)", rate: 0 },
  { id: "ca", label: "California", rate: 0.103 },
  { id: "nyc", label: "New York City (state + city)", rate: 0.107 },
  { id: "nys", label: "New York State (outside NYC)", rate: 0.0685 },
  { id: "ma", label: "Massachusetts", rate: 0.05 },
  { id: "il", label: "Illinois", rate: 0.0495 },
  { id: "pa", label: "Pennsylvania (state + Philadelphia)", rate: 0.0707 },
  { id: "nj", label: "New Jersey", rate: 0.0897 },
  { id: "mi", label: "Michigan", rate: 0.0425 },
  { id: "nc", label: "North Carolina", rate: 0.0425 },
  { id: "ga", label: "Georgia", rate: 0.0539 },
  { id: "custom", label: "Custom rate", rate: 0.05 },
];

export const getStatePreset = id => STATE_PRESETS.find(s => s.id === id) ?? STATE_PRESETS[0];
