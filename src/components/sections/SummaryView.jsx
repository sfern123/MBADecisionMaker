import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { C, MONO, tooltipStyle } from "../../theme.js";
import { SectionTitle, MetricCard, Card, Grid, DataTable, Callout } from "../ui.jsx";
import { hasEquity } from "../../lib/equity.js";

/**
 * Pulls the separate models onto one page and says plainly where they
 * agree, where they disagree, and which assumption each conclusion is
 * resting on.
 */
export default function SummaryView({ f, financing, core, nw, invest, tiers, fire, sellHold, schools, profile, onNavigate }) {
  const showEquity = hasEquity(profile.equity) && sellHold;
  const mbaAhead = nw.terminal.delta >= 0;

  const verdicts = [
    {
      key: "cost",
      question: "What does it cost?",
      answer: `${f.compact(financing.cost)} of attendance, ${f.compact(financing.need)} financed, ${f.money(financing.totalPmt)}/mo for ${profile.loan.termMonths / 12} years.`,
      detail: `Total repaid ${f.compact(financing.totalRepaid)}, of which ${f.compact(financing.interestCost)} is interest. Add ${f.compact(nw.opportunityCost)} of forgone income and the all-in figure is ${f.compact(nw.totalInvestment)}.`,
      tone: "info",
      tab: "financing",
    },
    {
      key: "stress",
      question: "Can you afford the payment?",
      answer: core.stressProb > 0.5
        ? `Probably strained — ${f.pct(core.stressProb)} of simulated outcomes exceed your comfort threshold.`
        : core.stressProb > 0.25
          ? `Mostly, but not always — ${f.pct(core.stressProb)} of outcomes exceed your threshold.`
          : `Comfortably in most outcomes — only ${f.pct(core.stressProb)} exceed your threshold.`,
      detail: `Median first-year burden is ${f.pct(core.dti.p50)} of after-tax income; the worst decile is ${f.pct(core.dti.p90)}. This moves most with your career mix and your scholarship.`,
      tone: core.stressProb > 0.5 ? "danger" : core.stressProb > 0.25 ? "warn" : "good",
      tab: "financing",
    },
    {
      key: "networth",
      question: "Does it beat not going?",
      answer: nw.crossover
        ? `On the median path, yes — it overtakes at year ${nw.crossover}, ${nw.crossover - nw.schoolYears} years after graduating.`
        : `Not within ${profile.horizon} years on the median path.`,
      detail: `At year ${profile.horizon}: ${f.compact(nw.terminal.mbaP50)} with the degree versus ${f.compact(nw.terminal.noMba)} without — a gap of ${f.compact(Math.abs(nw.terminal.delta))}. The P10 downside is ${f.compact(nw.terminal.mbaP10)}, which is the number worth checking you could live with.`,
      tone: mbaAhead ? "good" : "danger",
      tab: "career",
    },
    {
      key: "ladder",
      question: "How much does it accelerate the climb?",
      answer: `${f.pct(tiers.mba.exec)} reach the top rung versus ${f.pct(tiers.noMba.exec)} without — but only because you set acceleration to ${profile.mbaAcceleration.promoProbMultiplier.toFixed(2)}×.`,
      detail: `That multiplier is an assumption, not a measurement. Set it to 1.00× and the two paths differ only by starting salary and two lost years. It is the load-bearing input behind every conclusion on that tab.`,
      tone: "warn",
      tab: "career",
    },
  ];

  if (profile.savingsDeployed > 0) {
    verdicts.push({
      key: "deploy",
      question: "Cash toward tuition, or keep it invested?",
      answer: invest.winner === "invest"
        ? `Investing wins at ${f.pct(profile.marketReturn)} returns, ending with ${f.money(invest.terminalPortfolio)}.`
        : `Deploying wins — the portfolio can't cover the extra ${f.money(invest.pmtDiff)}/mo and runs out around year ${invest.depletedYear ?? "—"}.`,
      detail: `Your ${f.pct(financing.privateRate)} loan rate is the hurdle. That rate is certain; the market return is not, and the asymmetry matters more than the point estimate.`,
      tone: invest.winner === "invest" ? "good" : "alt",
      tab: "financing",
    });
  }

  if (showEquity) {
    verdicts.push({
      key: "equity",
      question: "Sell the equity to cut the loan?",
      answer: `Selling wins in ${f.pct(sellHold.winProb)} of simulated price paths; median outcome ${f.compact(sellHold.p50)}.`,
      detail: `It avoids ${f.compact(sellHold.borrowingAvoided)} of borrowing and ${f.compact(sellHold.interestAvoided)} of interest, for ${f.money(sellHold.sale.tax)} of tax today. The range runs from ${f.compact(sellHold.p10)} to ${f.compact(sellHold.p90)} — wide enough that the concentration question probably matters more than the expected value.`,
      tone: sellHold.winProb > 0.5 ? "good" : "warn",
      tab: "equity",
    });
  }

  if (fire) {
    verdicts.push({
      key: "fire",
      question: "What does it do to independence?",
      answer: fire.medianFireYear > fire.trajectory.length
        ? `Your number isn't reached within the projection window.`
        : `Median arrival around age ${fire.medianFireAge}, ${fire.medianFireYear} years out.`,
      detail: fire.alreadyCoasting
        ? `You're already past coast, so the school years pause your saving without pushing back your eventual date much.`
        : `You're ${f.compact(Math.max(0, fire.coast - fire.startingTotal))} short of coast. Reaching it before you matriculate would take most of the sting out of two years without income.`,
      tone: fire.alreadyCoasting ? "good" : "info",
      tab: "fire",
    });
  }

  const bestSchool = schools.length >= 2 ? schools.reduce((a, b) => (a.wealth > b.wealth ? a : b)) : null;

  // Where the models pull in different directions.
  const tensions = [];
  if (core.stressProb > 0.4 && mbaAhead) {
    tensions.push("The net-worth model says go; the payment-stress model says the first few years will be tight. Both can be true — a positive expected outcome does not make the cash-flow problem disappear.");
  }
  if (invest.winner === "invest" && core.stressProb > 0.4) {
    tensions.push("Keeping cash invested maximises expected wealth, but it also raises the monthly payment that's already straining. The optimisation and the safety margin point in opposite directions here.");
  }
  if (showEquity && sellHold.winProb < 0.5 && core.stressProb > 0.4) {
    tensions.push("Holding the equity has the higher expected value, yet selling would ease a payment burden the model already flags as stressful. Expected value is not the only thing being optimised when the downside is a cash-flow crisis.");
  }
  if (!mbaAhead && tiers.mba.exec > tiers.noMba.exec * 1.4) {
    tensions.push("The net-worth model says the degree doesn't pay back in this window, while the ladder model says it materially raises your odds of reaching the top. They're measuring different horizons — and the ladder model rests on an acceleration figure you chose.");
  }

  return (
    <>
      <SectionTitle id="summary">Everything in one place</SectionTitle>

      <Grid cols="repeat(auto-fit, minmax(200px, 1fr))" style={{ marginBottom: 20 }}>
        <MetricCard label="All-in cost" value={f.compact(nw.totalInvestment)} sub="Tuition, living, and forgone income" color={C.orange} />
        <MetricCard label="Monthly payment" value={f.money(financing.totalPmt)} sub={`For ${profile.loan.termMonths / 12} years after the grace period`} color={C.red} />
        <MetricCard label="Payment stress" value={f.pct(core.stressProb)} sub="Chance of exceeding your threshold"
          color={core.stressProb > 0.5 ? C.red : core.stressProb > 0.25 ? C.orange : C.green} />
        <MetricCard label="Crossover" value={nw.crossover ? `Year ${nw.crossover}` : "Not reached"}
          sub={nw.crossover ? `${nw.crossover - nw.schoolYears} yrs after graduating` : `Within ${profile.horizon} years`}
          color={nw.crossover ? C.green : C.red} />
        <MetricCard label={`Year ${profile.horizon} difference`} value={(mbaAhead ? "+" : "") + f.compact(nw.terminal.delta)}
          sub="Median, versus not going" color={mbaAhead ? C.green : C.red} />
      </Grid>

      <div style={{ marginBottom: 20 }}>
        {verdicts.map(v => (
          <div key={v.key} style={{
            background: C.panel,
            border: `1px solid ${{ good: C.green, warn: C.yellow, danger: C.red, info: C.accent, alt: C.accent2 }[v.tone]}44`,
            borderLeft: `3px solid ${{ good: C.green, warn: C.yellow, danger: C.red, info: C.accent, alt: C.accent2 }[v.tone]}`,
            borderRadius: 10, padding: "14px 18px", marginBottom: 10,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: C.muted, fontWeight: 600 }}>
                {v.question}
              </div>
              {onNavigate && (
                <button onClick={() => onNavigate(v.tab)}
                  style={{ background: "none", border: "none", color: C.accent, fontSize: 10, cursor: "pointer", textDecoration: "underline" }}>
                  open tab →
                </button>
              )}
            </div>
            <div style={{ fontSize: 14, color: C.text, margin: "6px 0 6px", fontWeight: 500 }}>{v.answer}</div>
            <div style={{ fontSize: 12, color: C.faint, lineHeight: 1.6 }}>{v.detail}</div>
          </div>
        ))}
      </div>

      {tensions.length > 0 && (
        <Callout tone="warn" title="Where the models disagree" style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {tensions.map((t, i) => <div key={i}>• {t}</div>)}
          </div>
        </Callout>
      )}

      {bestSchool && (
        <Card
          title="School comparison"
          subtitle="Expected outcome by programme, on cost and published median pay alone."
          style={{ marginBottom: 18 }}
        >
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={schools} margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.borderSoft} />
              <XAxis dataKey="short" tick={{ fontSize: 10, fill: C.muted }} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis tickFormatter={v => f.compact(v)} tick={{ fontSize: 10, fill: C.faint }} />
              <Tooltip {...tooltipStyle} formatter={v => [f.compact(v), "Expected wealth"]} />
              <Bar dataKey="wealth" radius={[4, 4, 0, 0]}>
                {schools.map(s => <Cell key={s.id} fill={s.id === bestSchool.id ? C.green + "cc" : C.accent + "66"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Card title="The assumptions everything rests on" style={{ marginBottom: 18 }}>
        <DataTable
          headers={["Assumption", "Current value", "Why it matters"]}
          rows={[
            ["MBA promotion acceleration", `${profile.mbaAcceleration.promoProbMultiplier.toFixed(2)}×`,
              "Decides the ladder model's entire answer. Unmeasurable, and chosen by you."],
            ["Investment return", f.pct(profile.marketReturn),
              "Drives every comparison against keeping money invested instead."],
            ["Effective tax rate", f.pct(profile.taxRate),
              "Scales all after-tax income, so it moves both branches together."],
            ["Growth without the MBA", f.pct(profile.noMbaGrowth),
              "The counterfactual. Easy to set pessimistically and flatter the degree."],
            ["Private loan APR", f.pct(financing.privateRate),
              profile.useDirectApr ? "From your quote." : "Estimated from a credit score — get real quotes."],
            ["Career mix", `${profile.paths?.length ?? 0} paths weighted`,
              "Sets expected post-MBA pay and how volatile it is."],
            ["Cost of attendance", f.compact(financing.cost),
              "From published data that changes every year. Check your admit letter."],
          ]}
        />
      </Card>

      <Callout tone="danger" title="One last thing">
        Every number on this page is downstream of assumptions you chose.
        The model is useful for finding which assumption a decision actually
        hinges on — move one slider at a time and watch what flips. It is not
        useful as an answer. Nothing here prices the reasons people usually
        give for going: the people they met, the career they switched into,
        the two years to think. Those don't fit in a spreadsheet and they are
        not therefore worth zero.
      </Callout>
    </>
  );
}
