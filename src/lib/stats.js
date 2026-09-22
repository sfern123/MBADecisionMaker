export const mean = arr =>
  arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

export function percentile(arr, p) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((s.length * p) / 100))];
}

export function std(arr) {
  if (!arr.length) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}

/**
 * Returns { value, count } buckets ready to feed straight into a Recharts
 * <BarChart>.
 *
 * Uses a reduce rather than Math.min(...arr) because these arrays run to
 * thousands of entries and spreading them risks a call-stack overflow.
 *
 * `clip` bounds the axis to a percentile range and piles anything beyond it
 * into the end bins. Heavy-tailed distributions -- which is most of what this
 * app simulates -- otherwise get their whole axis stretched by one extreme
 * path, squashing the part you actually need to read. The tail is still
 * counted, just not allowed to set the scale.
 */
export function histogram(arr, bins = 30, clip = 1) {
  if (!arr.length) return [];

  let mn, mx;
  if (clip > 0 && arr.length > 50) {
    mn = percentile(arr, clip);
    mx = percentile(arr, 100 - clip);
  } else {
    mn = Infinity; mx = -Infinity;
    for (const v of arr) {
      if (v < mn) mn = v;
      if (v > mx) mx = v;
    }
  }
  if (!(mx > mn)) { mx = mn + 1; }

  const width = (mx - mn) / bins;
  const counts = Array(bins).fill(0);
  for (const v of arr) {
    let b = Math.floor((v - mn) / width);
    if (b >= bins) b = bins - 1;
    if (b < 0) b = 0;
    counts[b]++;
  }
  return counts.map((c, i) => ({ value: mn + (i + 0.5) * width, count: c }));
}

// Summary bundle used by nearly every section.
export const summarize = arr => ({
  mean: mean(arr),
  p5: percentile(arr, 5),
  p10: percentile(arr, 10),
  p25: percentile(arr, 25),
  p50: percentile(arr, 50),
  p75: percentile(arr, 75),
  p90: percentile(arr, 90),
  p95: percentile(arr, 95),
  std: std(arr),
});
