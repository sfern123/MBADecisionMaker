import { C } from "../../theme.js";

/**
 * Observations derived from the current inputs.
 *
 * Deliberately phrased as readings of the model rather than as advice -- the
 * simulation knows the numbers the user typed in, and nothing else about
 * their life.
 */
export default function Recommendations({ f, financing, core, schools, nw, invest, profile, tradeoff }) {
  const items = [];

  items.push(
    `At your current inputs — ${f.money(financing.scholarship)} scholarship, ${f.money(financing.savingsDeployed)} deployed, ` +
    `${profile.useDirectApr ? `${f.pct(profile.directApr)} quoted APR` : `a ${profile.creditScore} credit score`} — ` +
    `you'd finance ${f.money(financing.need)} and pay ${f.money(financing.totalPmt)} a month for ` +
    `${profile.loan.termMonths / 12} years, ${f.money(financing.interestCost)} of which is interest.`
  );

  if (core.stressProb > 0.5) {
    items.push(
      `Repayment stress probability is ${f.pct(core.stressProb)} — in most simulated career outcomes the payment ` +
      `exceeds ${(profile.stressThreshold * 100).toFixed(0)}% of your first-year net income. More scholarship, a lower APR, ` +
      `a longer term, or more cash deployed would each bring this down.`
    );
  } else if (core.stressProb > 0.25) {
    items.push(
      `Repayment stress probability is ${f.pct(core.stressProb)} — manageable in most outcomes, uncomfortable in a ` +
      `meaningful minority. Which career paths you weighted most heavily is what drives this.`
    );
  } else {
    items.push(`Repayment stress probability is ${f.pct(core.stressProb)}, comfortable across most simulated outcomes.`);
  }

  if (!profile.useDirectApr && financing.private > 0) {
    items.push(
      `${f.money(financing.private)} of this is private debt priced off your credit score. Before committing, get actual ` +
      `quotes from more than one lender — a real offer beats the estimate this tool makes from a score, in either direction.`
    );
  }

  if (schools.length >= 2) {
    const best = schools.reduce((a, b) => (a.wealth > b.wealth ? a : b));
    const worst = schools.reduce((a, b) => (a.wealth < b.wealth ? a : b));
    const spread = best.wealth - worst.wealth;
    items.push(
      `Across the schools you're comparing, ${best.name} scores highest on expected wealth (${f.compact(best.wealth)}, ` +
      `Sharpe ${best.sharpe.toFixed(2)}), ahead of ${worst.short} by ${f.compact(spread)}. That gap reflects cost and published ` +
      `median pay only — it says nothing about fit, location, or the specific roles you want.`
    );
  }

  if (profile.savingsDeployed > 0) {
    items.push(
      invest.winner === "invest"
        ? `On deploy-versus-invest, keeping the cash invested wins at ${f.pct(profile.marketReturn)} returns, ending with ` +
          `${f.money(invest.terminalPortfolio)}. That edge depends entirely on the return assumption holding — your ` +
          `${f.pct(financing.privateRate)} APR is a certainty, the market return is not.`
        : `On deploy-versus-invest, deploying wins: at ${f.pct(profile.marketReturn)} the portfolio can't cover the extra ` +
          `${f.money(invest.pmtDiff)}/mo and runs out by year ${invest.depletedYear ?? "—"}. You'd need sustained returns above ` +
          `${f.pct(financing.privateRate)} to justify borrowing more.`
    );
  } else if (profile.totalSavings > 0) {
    items.push(
      `You have ${f.money(profile.totalSavings)} available but none of it deployed. Section 5 compares how much of it to ` +
      `put toward tuition versus keep liquid — worth a look before you decide.`
    );
  }

  items.push(
    nw.crossover
      ? `On net worth, the median MBA path overtakes staying put at year ${nw.crossover} — ${nw.crossover - nw.schoolYears} years ` +
        `after graduating. The P10 outcome lands at ${f.compact(nw.terminal.mbaP10)}, so consider whether you could live with that case.`
      : `On net worth, the median MBA path hasn't overtaken staying put within ${profile.horizon} years. Your ` +
        `${f.money(profile.currentComp)} current comp is a high bar to clear. Extending the horizon or revisiting whether ` +
        `${f.pct(profile.noMbaGrowth)} growth is realistic on your current track would both change this.`
  );

  if (tradeoff?.sweetSpot) {
    items.push(
      `Stress first drops to a tolerable level at ${f.money(tradeoff.sweetSpot.savings)} deployed. Below that you're carrying ` +
      `avoidable payment risk; well above it you're buying comfort with money that could be compounding.`
    );
  }

  return (
    <div style={{ background: `linear-gradient(135deg, ${C.accent}12, ${C.accent2}06)`, border: `1px solid ${C.accent}`, borderRadius: 12, padding: 22, marginTop: 24 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: C.accent, marginBottom: 4 }}>
        What the model is telling you
      </div>
      <div style={{ fontSize: 11, color: C.faint, marginBottom: 16, lineHeight: 1.5 }}>
        These are readings of the numbers you entered, not recommendations. The
        model knows your inputs and nothing else about your situation.
      </div>
      {items.map((text, i) => (
        <div key={i} style={{ display: "flex", gap: 11, marginBottom: 11, alignItems: "flex-start" }}>
          <div style={{ background: C.accent, color: C.bg, width: 19, height: 19, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0, marginTop: 2 }}>
            {i + 1}
          </div>
          <div style={{ fontSize: 12.5, lineHeight: 1.6, color: C.text }}>{text}</div>
        </div>
      ))}
    </div>
  );
}
