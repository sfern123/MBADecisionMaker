// Seeded PRNG so every run of the simulation is reproducible: the same inputs
// always produce the same chart, which keeps the UI stable while sliders move.
export function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box-Muller transform: standard normal from two uniforms.
export function normalRandom(rng) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export function weightedChoice(rng, items, probs) {
  const r = rng();
  let cum = 0;
  for (let i = 0; i < items.length; i++) {
    cum += probs[i];
    if (r < cum) return items[i];
  }
  return items[items.length - 1];
}

// Turns arbitrary user weights into probabilities summing to 1. Falls back to
// a uniform split so a config where every weight is 0 still simulates.
export function normalizeWeights(weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return weights.map(() => 1 / Math.max(1, weights.length));
  return weights.map(w => w / total);
}
