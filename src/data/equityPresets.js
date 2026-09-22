/**
 * Growth presets for an equity holding.
 *
 * Deliberately generic. The original version of this tool hardcoded one
 * company's historical returns, which is exactly the assumption you should
 * not inherit from someone else — a single stock's past decade tells you
 * very little about your next one, and anchoring on it is how concentration
 * risk gets rationalised.
 *
 * These are asset-class reference points, not forecasts. If you want to model
 * your employer's stock on its own history, look up its figures and enter
 * them with the custom sliders.
 */
export const GROWTH_PRESETS = [
  {
    id: "index", label: "Broad index", drift: 0.07, vol: 0.16,
    desc: "Diversified equity index. The benchmark your concentrated position has to beat to be worth the risk.",
  },
  {
    id: "largecap", label: "Mature large-cap", drift: 0.10, vol: 0.28,
    desc: "An established public company. Higher expected return than the index, roughly double the volatility.",
  },
  {
    id: "growth", label: "High-growth public", drift: 0.16, vol: 0.38,
    desc: "A fast-growing public company. Wide outcomes in both directions.",
  },
  {
    id: "flat", label: "Stagnation", drift: 0.0, vol: 0.30,
    desc: "Volatility without drift. Worth checking — concentration hurts most when the stock goes nowhere.",
  },
];

export const getGrowthPreset = id => GROWTH_PRESETS.find(p => p.id === id) ?? GROWTH_PRESETS[0];

/** Neutral default holding. Zeroed out so the equity tabs stay hidden until used. */
export const DEFAULT_EQUITY = {
  label: "Company stock",
  ticker: "",
  price: 100,
  vestedShares: 0,
  unvestedShares: 0,
  costBasis: 60,
  vestingYears: 4,
  annualRefresh: 0,
  drift: 0.10,
  vol: 0.28,
  growthPresetId: "largecap",
  sharesToSell: 0,
  saleIsLongTerm: true,
};
