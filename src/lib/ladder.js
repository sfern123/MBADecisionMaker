import { mulberry32, normalRandom } from "./random.js";

const FLOOR = 50000;

/**
 * Simulates one career as a climb up a promotion ladder, with an optional
 * entrepreneurial detour.
 *
 * Both the MBA and no-MBA branches run through this same function — the only
 * differences are the starting compensation, how much the degree accelerates
 * promotion, and the years spent in school earning nothing. Sharing the code
 * matters: it means the comparison isn't an artefact of two differently
 * written models.
 */
export function simulateCareer(rng, opts) {
  const {
    baseComp, years, ladder, growth, vol,
    promoMultiplier = 1, yearsEarlier = 0,
    schoolYears = 0, internshipIncome = 0,
    founder, founderProb = 0,
  } = opts;

  let comp = baseComp;
  let levelIdx = 0;
  let peakComp = 0;
  let isFounder = false;
  let exitValue = 0;
  let founderStartYear = -1;
  const compByYear = [];
  const levelByYear = [];

  for (let yr = 0; yr < years; yr++) {
    if (yr < schoolYears) {
      // In school: no salary. An internship between years counts.
      comp = yr === 1 && schoolYears > 1 ? internshipIncome : 0;
      compByYear.push(comp);
      levelByYear.push("In school");
      continue;
    }

    const careerYr = yr - schoolYears;

    if (isFounder) {
      if (exitValue === 0 && careerYr >= founderStartYear + 2) {
        const draw = rng();
        if (draw < founder.bigExitProb) {
          exitValue = founder.bigExitMin + rng() * (founder.bigExitMax - founder.bigExitMin);
        } else if (draw < founder.bigExitProb + founder.smallExitProb) {
          exitValue = founder.smallExitMin + rng() * (founder.smallExitMax - founder.smallExitMin);
        } else if (draw < founder.bigExitProb + founder.smallExitProb + founder.failProb) {
          // Failed: rejoin the ladder, roughly where peers are by now.
          isFounder = false;
          levelIdx = Math.max(1, levelIdx);
          comp = baseComp * ladder[levelIdx].multiple * 0.9;
        }
      }
      if (isFounder) comp *= 1 + 0.08 + normalRandom(rng) * 0.2;
    } else {
      // Promotion check against the next rung.
      const next = ladder[levelIdx + 1];
      if (next) {
        const eligibleAt = Math.max(0, next.afterYears - yearsEarlier);
        if (careerYr >= eligibleAt && rng() < next.prob * promoMultiplier) {
          levelIdx++;
          comp = Math.max(comp, baseComp * ladder[levelIdx].multiple);
        }
      }
      comp *= 1 + growth + normalRandom(rng) * vol;

      // Founder detour.
      if (founderProb > 0 && careerYr >= 2 && rng() < founderProb) {
        isFounder = true;
        founderStartYear = careerYr;
        comp = founder.salaryFloor + rng() * (founder.salaryCeiling - founder.salaryFloor);
      }
    }

    comp = Math.max(comp, FLOOR);
    peakComp = Math.max(peakComp, comp);
    compByYear.push(comp);
    levelByYear.push(isFounder ? "Founder" : ladder[levelIdx].label);
  }

  return {
    compByYear, levelByYear, peakComp,
    finalComp: comp,
    finalLevel: isFounder ? "Founder" : ladder[levelIdx].label,
    levelIdx,
    isFounder,
    exitValue,
    reachedExec: levelIdx >= ladder.length - 1,
    reachedVpPlus: levelIdx >= ladder.length - 2,
  };
}

/**
 * Runs both branches and reports how often each reaches a set of
 * compensation tiers and senior outcomes.
 */
export function runOutcomeTiers(cfg, opts = {}) {
  const nSim = opts.nSim ?? 3000;
  const years = opts.years ?? 20;
  const {
    ladder, tiers, acceleration, founder,
    currentComp, taxRate, savingsRate,
    mbaBaseComp, schoolYears, internshipIncome,
    noMbaGrowth, noMbaVol, mbaGrowth, mbaVol,
  } = cfg;

  const noMba = [], mba = [];

  for (let i = 0; i < nSim; i++) {
    noMba.push(simulateCareer(mulberry32(41 + i * 13), {
      baseComp: currentComp, years, ladder,
      growth: noMbaGrowth, vol: noMbaVol,
      promoMultiplier: 1, yearsEarlier: 0,
      founder, founderProb: founder.annualProbNoMba,
    }));

    mba.push(simulateCareer(mulberry32(7771 + i * 17), {
      baseComp: mbaBaseComp, years, ladder,
      growth: mbaGrowth, vol: mbaVol,
      promoMultiplier: acceleration.promoProbMultiplier,
      yearsEarlier: acceleration.yearsEarlier,
      schoolYears, internshipIncome,
      founder, founderProb: founder.annualProbMba,
    }));
  }

  const horizons = [5, 10, 15, 20].filter(h => h <= years);
  const share = (arr, fn) => arr.filter(fn).length / arr.length;

  const tierProbs = tiers.map(tier => {
    const row = { tier };
    for (const h of horizons) {
      row[`noMba_${h}`] = share(noMba, r => (r.compByYear[h - 1] ?? 0) >= tier);
      row[`mba_${h}`] = share(mba, r => (r.compByYear[h - 1] ?? 0) >= tier);
    }
    return row;
  });

  // Crude but consistent across both branches: a fixed share of after-tax pay.
  const cumWealth = r =>
    r.compByYear.reduce((s, c) => s + c * (1 - taxRate) * savingsRate, 0) + r.exitValue * 0.75;

  const summarise = arr => ({
    exec: share(arr, r => r.reachedExec),
    vpPlus: share(arr, r => r.reachedVpPlus),
    founder: share(arr, r => r.isFounder),
    anyExit: share(arr, r => r.exitValue > 0),
    medianPeak: median(arr.map(r => r.peakComp)),
    medianFinal: median(arr.map(r => r.compByYear[years - 1] ?? 0)),
    medianWealth: median(arr.map(cumWealth)),
  });

  const trajectory = Array.from({ length: years }, (_, yr) => ({
    year: yr + 1,
    noMba: median(noMba.map(r => r.compByYear[yr] ?? 0)),
    mba: median(mba.map(r => r.compByYear[yr] ?? 0)),
    noMbaP90: percentileOf(noMba.map(r => r.compByYear[yr] ?? 0), 90),
    mbaP90: percentileOf(mba.map(r => r.compByYear[yr] ?? 0), 90),
  }));

  return {
    tierProbs, horizons, trajectory,
    noMba: summarise(noMba),
    mba: summarise(mba),
    peaksNoMba: noMba.map(r => r.peakComp),
    peaksMba: mba.map(r => r.peakComp),
    wealthNoMba: noMba.map(cumWealth),
    wealthMba: mba.map(cumWealth),
  };
}

const median = arr => percentileOf(arr, 50);
function percentileOf(arr, p) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((s.length * p) / 100))];
}
