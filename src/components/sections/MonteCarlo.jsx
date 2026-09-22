import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { C, MONO, tooltipStyle } from "../../theme.js";
import { SectionTitle, MetricCard, Card, Grid, DataTable } from "../ui.jsx";

export default function MonteCarlo({ f, core, profile, pathSummary }) {
  const { wealth, dti, income, stressProb, obligations } = core;
  const threshold = profile.stressThreshold * 100;
  const hasOther = (obligations?.existingDebt ?? 0) + (obligations?.property ?? 0) > 0;

  return (
    <>
      <SectionTitle id="montecarlo">
        2 · Monte Carlo simulation (n = {profile.sims.toLocaleString()})
      </SectionTitle>

      <Grid cols="repeat(auto-fit, minmax(210px, 1fr))" style={{ marginBottom: 18 }}>
        <MetricCard
          label="Repayment stress probability"
          value={f.pct(stressProb)}
          sub={`Chance payment exceeds ${threshold.toFixed(0)}% of year-1 net income`}
          color={stressProb > 0.5 ? C.red : stressProb > 0.25 ? C.orange : C.green}
        />
        <MetricCard
          label="Expected 10-year net wealth"
          value={f.compact(wealth.mean)}
          sub={`P5 ${f.compact(wealth.p5)} · P95 ${f.compact(wealth.p95)}`}
          color={C.green}
        />
        <MetricCard
          label="Median year-1 debt burden"
          value={f.pct(dti.p50)}
          sub={hasOther
            ? `All obligations, not just the loan. Worst decile: ${f.pct(dti.p90)}`
            : `Worst decile: ${f.pct(dti.p90)}`}
          color={dti.p50 > profile.stressThreshold ? C.orange : C.green}
        />
        <MetricCard
          label="Median year-1 income"
          value={f.money(income.p50)}
          sub={`P5 ${f.money(income.p5)} · P95 ${f.money(income.p95)}`}
        />
      </Grid>

      {hasOther && (
        <Card
          title="What the monthly burden is made of"
          subtitle="A student-loan payment does not arrive in isolation. Debts you already carry compete for the same income, which is why the affordability figures above count all of them."
          style={{ marginBottom: 18 }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "stretch" }}>
            {[
              ["Student loan", obligations.loan, C.accent],
              ["Existing debts", obligations.existingDebt, C.orange],
              ["Property (net outflow)", obligations.property, C.yellow],
            ].filter(([, v]) => v > 0).map(([label, v, col]) => (
              <div key={label} style={{ flex: "1 1 150px", background: C.bg, border: `1px solid ${col}44`, borderRadius: 8, padding: "10px 13px" }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: C.muted }}>{label}</div>
                <div style={{ fontFamily: MONO, fontSize: 17, fontWeight: 700, color: col }}>{f.money(v)}<span style={{ fontSize: 11, color: C.faint }}>/mo</span></div>
              </div>
            ))}
            <div style={{ flex: "1 1 150px", background: C.panel, border: `1px solid ${C.red}66`, borderRadius: 8, padding: "10px 13px" }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: C.muted }}>Total committed</div>
              <div style={{ fontFamily: MONO, fontSize: 17, fontWeight: 700, color: C.red }}>{f.money(obligations.total)}<span style={{ fontSize: 11, color: C.faint }}>/mo</span></div>
            </div>
          </div>
        </Card>
      )}

      <Card
        title="Career mix being simulated"
        subtitle="Each run draws one path from this mix, then applies that path's own growth and volatility. Change the mix in Settings → Career paths."
        style={{ marginBottom: 18 }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {pathSummary.map(p => (
            <div key={p.id} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 11px", fontSize: 11 }}>
              <span style={{ color: C.text }}>{p.label}</span>
              <span style={{ color: C.accent, marginLeft: 7, fontWeight: 700 }}>{(p.prob * 100).toFixed(0)}%</span>
              <span style={{ color: C.faint, marginLeft: 7 }}>{f.compact(p.year1)} yr 1</span>
            </div>
          ))}
        </div>
      </Card>

      <Grid cols="1fr 1fr" gap={16} style={{ marginBottom: 18 }}>
        <Card
          title="Distribution: 10-year net wealth"
          subtitle="Cumulative after-tax income over 10 post-graduation years, minus total loan repayment. Each bar counts how many simulated outcomes landed in that bucket. A long right tail means one of your selected paths carries lumpy upside. The axis is trimmed to the middle 98% so extreme runs don't flatten the chart — they are still counted in the end bars."
        >
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={core.wealthHist} margin={{ left: 0, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.borderSoft} />
              <XAxis dataKey="value" tickFormatter={v => f.compact(v)} tick={{ fontSize: 9, fill: C.faint }} interval={Math.max(1, Math.floor(core.wealthHist.length / 6))} />
              <YAxis tick={{ fontSize: 9, fill: C.faint }} />
              <Tooltip {...tooltipStyle} formatter={v => [v, "Simulations"]} labelFormatter={v => f.compact(v)} />
              <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                {core.wealthHist.map((d, i) => (
                  <Cell key={i} fill={d.value < wealth.p5 ? C.red + "88" : d.value > wealth.p95 ? C.green + "88" : C.accent + "66"} />
                ))}
              </Bar>
              <ReferenceLine x={wealth.p50} stroke={C.yellow} strokeDasharray="5 3" label={{ value: "Median", fill: C.yellow, fontSize: 10 }} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card
          title="Distribution: year-1 payment burden"
          subtitle={`Monthly loan payment as a share of first-year after-tax income. Green sits below your ${threshold.toFixed(0)}% comfort threshold; red exceeds it. Which side a run lands on depends on the career draw and on how much debt your funding inputs leave behind.`}
        >
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={core.dtiHist} margin={{ left: 0, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.borderSoft} />
              <XAxis dataKey="value" tickFormatter={v => v.toFixed(0) + "%"} tick={{ fontSize: 9, fill: C.faint }} interval={Math.max(1, Math.floor(core.dtiHist.length / 7))} />
              <YAxis tick={{ fontSize: 9, fill: C.faint }} />
              <Tooltip {...tooltipStyle} formatter={v => [v, "Simulations"]} labelFormatter={v => v.toFixed(1) + "% of net income"} />
              <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                {core.dtiHist.map((d, i) => (
                  <Cell key={i} fill={d.value <= threshold ? C.green + "77" : C.red + "77"} />
                ))}
              </Bar>
              <ReferenceLine x={threshold} stroke={C.yellow} strokeWidth={2} label={{ value: `${threshold.toFixed(0)}% threshold`, fill: C.yellow, fontSize: 10, position: "top" }} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </Grid>

      <Card title="Percentile summary" subtitle="Monthly payment is fixed by your loan terms, so it has no distribution — only the career-driven outcomes vary." style={{ marginBottom: 18 }}>
        <DataTable
          headers={["Metric", "P5 (worst)", "P25", "P50 (median)", "P75", "P95 (best)", "Mean"]}
          rows={[
            ["Payment burden yr 1", f.pct(dti.p5), f.pct(dti.p25), f.pct(dti.p50), f.pct(dti.p75), f.pct(dti.p95), f.pct(dti.mean)],
            ["Year-1 income", f.money(income.p5), f.money(income.p25), f.money(income.p50), f.money(income.p75), f.money(income.p95), f.money(income.mean)],
            ["Net wealth 10yr", f.compact(wealth.p5), f.compact(wealth.p25), f.compact(wealth.p50), f.compact(wealth.p75), f.compact(wealth.p95), f.compact(wealth.mean)],
          ]}
        />
      </Card>
    </>
  );
}
