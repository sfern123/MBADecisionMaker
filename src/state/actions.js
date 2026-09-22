/**
 * Write adapters.
 *
 * Reads go through `derived.js`; writes come through here. Components should
 * never reach into `balanceSheet` and reassemble it inline — that is how the
 * five-overlapping-inputs problem happened in the first place.
 *
 * Each function takes the current profile and returns a patch object suitable
 * for `update()`.
 */

import { netWorth, liquidAssets } from "./derived.js";
import { emptyBalanceSheet, newOtherAsset, newEquityHolding, newProperty, newDebt } from "./defaults.js";

const bsOf = p => p.balanceSheet ?? emptyBalanceSheet();
const patchBs = (p, patch) => ({ balanceSheet: { ...bsOf(p), ...patch } });

/* ── Compensation ─────────────────────────────────────────────────────── */

export const setComp = (p, patch) => ({
  compensation: { ...(p.compensation ?? {}), ...patch },
});

/* ── Simple mode ──────────────────────────────────────────────────────── */

/**
 * The bucket simple mode writes into.
 *
 * Simple mode is a *lens*, not a different data model: it shows one total and
 * adjusts a single catch-all entry to match, leaving any itemised assets
 * untouched. That is why switching between simple and detailed never loses
 * anything — there is no conversion step to lose it in.
 */
const SIMPLE_BUCKET = "simple-net-worth";

export function setSimpleNetWorth(p, target) {
  const bs = bsOf(p);
  const others = bs.otherAssets ?? [];
  const bucket = others.find(a => a.id === SIMPLE_BUCKET);

  // What everything *except* the catch-all already accounts for.
  const withoutBucket = { ...bs, otherAssets: others.filter(a => a.id !== SIMPLE_BUCKET) };
  const itemised = netWorth(withoutBucket);
  const remainder = Math.max(0, target - itemised);

  const rest = others.filter(a => a.id !== SIMPLE_BUCKET);
  const next = remainder > 0
    ? [...rest, { ...(bucket ?? newOtherAsset()), id: SIMPLE_BUCKET, label: "Savings & investments", value: remainder }]
    : rest;

  return patchBs(p, { otherAssets: next });
}

export const setCash = (p, value) => patchBs(p, { cash: Math.max(0, value) });

/* ── Detailed balance sheet ───────────────────────────────────────────── */

export const setBrokerage = (p, patch) =>
  patchBs(p, { brokerage: { ...(bsOf(p).brokerage ?? {}), ...patch } });

export const setRetirement = (p, patch) =>
  patchBs(p, { retirement: { ...(bsOf(p).retirement ?? {}), ...patch } });

/** Generic list helpers — equity holdings, properties, debts, other assets. */
const listAdd = (p, key, item) => patchBs(p, { [key]: [...(bsOf(p)[key] ?? []), item] });
const listUpdate = (p, key, id, patch) =>
  patchBs(p, { [key]: (bsOf(p)[key] ?? []).map(x => (x.id === id ? { ...x, ...patch } : x)) });
const listRemove = (p, key, id) =>
  patchBs(p, { [key]: (bsOf(p)[key] ?? []).filter(x => x.id !== id) });

export const addEquityHolding = p =>
  listAdd(p, "equityHoldings", newEquityHolding((bsOf(p).equityHoldings?.length ?? 0) + 1));
export const updateEquityHolding = (p, id, patch) => listUpdate(p, "equityHoldings", id, patch);
export const removeEquityHolding = (p, id) => listRemove(p, "equityHoldings", id);

export const addProperty = p =>
  listAdd(p, "properties", newProperty((bsOf(p).properties?.length ?? 0) + 1));
export const updateProperty = (p, id, patch) => listUpdate(p, "properties", id, patch);
export const removeProperty = (p, id) => listRemove(p, "properties", id);

export const addDebt = p => listAdd(p, "debts", newDebt((bsOf(p).debts?.length ?? 0) + 1));
export const updateDebt = (p, id, patch) => listUpdate(p, "debts", id, patch);
export const removeDebt = (p, id) => listRemove(p, "debts", id);

export const addOtherAsset = p =>
  listAdd(p, "otherAssets", newOtherAsset((bsOf(p).otherAssets?.length ?? 0) + 1));
export const updateOtherAsset = (p, id, patch) => listUpdate(p, "otherAssets", id, patch);
export const removeOtherAsset = (p, id) => listRemove(p, "otherAssets", id);

/** The first equity holding, which the single-position UI edits directly. */
export const primaryHolding = p => (bsOf(p).equityHoldings ?? [])[0] ?? null;

export function updatePrimaryHolding(p, patch) {
  const bs = bsOf(p);
  const list = bs.equityHoldings ?? [];
  if (!list.length) {
    return patchBs(p, { equityHoldings: [{ ...newEquityHolding(), ...patch }] });
  }
  return patchBs(p, { equityHoldings: list.map((h, i) => (i === 0 ? { ...h, ...patch } : h)) });
}

/* ── Funding ──────────────────────────────────────────────────────────── */

export const setFunding = (p, patch) => ({ funding: { ...(p.funding ?? {}), ...patch } });

export const setScholarshipTotal = (p, total) => {
  const s = p.funding?.scholarship ?? { years: 2 };
  const years = Math.max(1, s.years ?? 2);
  return setFunding(p, { scholarship: { ...s, perYear: total / years } });
};

export const scholarshipTotal = p => {
  const s = p.funding?.scholarship;
  return (s?.perYear ?? 0) * (s?.years ?? 0);
};

/** Cash put toward tuition, clamped to what is actually liquid. */
export const setCashDeployed = (p, value) =>
  setFunding(p, { cashDeployed: Math.max(0, Math.min(value, liquidAssets(bsOf(p)))) });

export const setUseFederal = (p, on) => setFunding(p, { useFederal: on });

/* ── Detail level ─────────────────────────────────────────────────────── */

/**
 * Pure UI switch — deliberately does not transform the balance sheet.
 *
 * Someone who fills in detail, flips to simple to glance at a total, then
 * flips back should find their itemisation intact.
 */
export const setDetailLevel = (p, level) => ({ detailLevel: level });

/* ── FIRE account editors ─────────────────────────────────────────────── */

/**
 * The FIRE tab presents five tax-treatment buckets; the balance sheet stores
 * the same money by asset type. This maps an edit in either place onto the
 * one underlying record, so changing your brokerage balance on the
 * independence tab updates your net worth on every other tab too.
 *
 * The `taxable` bucket aggregates brokerage, vested equity, and other assets
 * on read, so an edit there is applied to brokerage — the only component that
 * is unambiguously a plain investment account.
 */
export function setFireAccount(p, bucket, value) {
  const v = Math.max(0, value);
  switch (bucket) {
    case "preTax":   return setRetirement(p, { preTax: v });
    case "taxFree":  return setRetirement(p, { roth: v });
    case "afterTax": return setRetirement(p, { afterTax: v });
    case "cash":     return setCash(p, v);
    case "taxable":  return setBrokerage(p, { value: v });
    default:         return {};
  }
}

export const setTaxableBasis = (p, value) => setBrokerage(p, { costBasis: Math.max(0, value) });
