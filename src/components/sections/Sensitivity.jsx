import { LineChart, Line, ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { C, MONO, tooltipStyle } from "../../theme.js";
import { SectionTitle, Card, Grid, DataTable, Callout } from "../ui.jsx";

export default function Sensitivity({ f, sensitivity, tradeoff, profile }) {
  const { rows, sweetSpot } = tradeoff;

  return (
    <>
      <SectionTitle id="sensitivity">6 · Sensitivity analysis</SectionTitle>

      <Grid cols="1fr 1fr" gap={16} style={{ marginBottom: 22 }}>
        <Card
          title="Deployed savings → stress and monthly payment"
          subtitle="How the payment burden responds as you put more cash toward tuition."
        >
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={sensitivity} margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.borderSoft} />
              <XAxis dataKey="savings" tickFormatter={v => f.compact(v)} tick={{ fontSize: 10, fill: C.muted }} />
              <YAxis yAxisId="l" tickFormatter={v => (v * 100).toFixed(0) + "%"} tick={{ fontSize: 10, fill: C.faint }} domain={[0, 1]} />
              <YAxis yAxisId="r" orientation="right" tickFormatter={v => f.compact(v)} tick={{ fontSize: 10, fill: C.faint }} />
              <Tooltip {...tooltipStyle}
                labelFormatter={v => `Deploy ${f.money(v)}`}
                formatter={(v, n) => [n === "Stress" ? f.pct(v) : f.money(v), n]} />
              <Line yAxisId="l" dataKey="stress" name="Stress" stroke={C.red} strokeWidth={2} dot={{ r: 3 }} />
              <Line yAxisId="r" dataKey="monthly" name="Monthly payment" stroke={C.accent} strokeWidth={2} dot={{ r: 3 }} />
              <ReferenceLine yAxisId="l" y={profile.stressThreshold} stroke={C.green} strokeDasharray="5 3"
                label={{ value: "target", fill: C.green, fontSize: 10 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Sensitivity table">
          <DataTable
            headers={["Deployed", "Debt", "Monthly", "Total repaid", "Stress"]}
            rows={sensitivity.map(s => [
              f.money(s.savings), f.compact(s.debt), f.money(s.monthly), f.compact(s.repay),
              <span key="s" style={{ color: s.stress > 0.5 ? C.red : s.stress > 0.25 ? C.orange : C.green, fontFamily: MONO }}>
                {f.pct(s.stress)}
              </span>,
            ])}
            highlight={i => Math.abs(sensitivity[i].savings - profile.savingsDeployed) < 2000}
          />
        </Card>
      </Grid>

      {/* The bridge between "deploy more" and "stay invested" */}
      <div style={{ background: `linear-gradient(135deg, ${C.yellow}08, ${C.orange}04)`, border: `1px solid ${C.yellow}44`, borderRadius: 12, padding: 22, marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.yellow, marginBottom: 6 }}>
          The real question: stress versus wealth
        </div>
        <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 16 }}>
          The table above says deploy more to cut stress. The next section says
          keep it invested to grow wealth. Both are right — they measure
          different things. This chart puts them on one axis so you can find the
          level where stress is tolerable <em>and</em> you aren't giving up more
          return than you need to.
        </div>

        <Grid cols="1fr 1fr" gap={16}>
          <div>
            <div style={{ fontSize: 12, color: C.faint, marginBottom: 10, lineHeight: 1.5 }}>
              <span style={{ color: C.red }}>Bars</span> = stress probability (left, lower is better).{" "}
              <span style={{ color: C.green }}>Line</span> = what an invested portfolio would be worth
              at the end if you kept that cash in the market instead (right, higher is better).
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart data={rows} margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.borderSoft} />
                <XAxis dataKey="savings" tickFormatter={v => f.compact(v)} tick={{ fontSize: 9, fill: C.muted }} />
                <YAxis yAxisId="l" tickFormatter={v => (v * 100).toFixed(0) + "%"} tick={{ fontSize: 10, fill: C.faint }} domain={[0, 1]} />
                <YAxis yAxisId="r" orientation="right" tickFormatter={v => f.compact(v)} tick={{ fontSize: 10, fill: C.faint }} />
                <Tooltip {...tooltipStyle}
                  labelFormatter={v => `Deploy ${f.money(v)}`}
                  formatter={(v, n) => [n === "Stress" ? f.pct(v) : f.money(v), n]} />
                <Bar yAxisId="l" dataKey="stress" name="Stress" radius={[4, 4, 0, 0]}>
                  {rows.map((d, i) => (
                    <Cell key={i} fill={d.stress > 0.5 ? C.red + "66" : d.stress > 0.25 ? C.orange + "55" : C.green + "55"} />
                  ))}
                </Bar>
                <Line yAxisId="r" dataKey="portfolioSurplus" name="Portfolio if invested" stroke={C.green} strokeWidth={2.5} dot={{ r: 3, fill: C.green }} type="monotone" />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div>
            <div style={{ fontSize: 12, color: C.faint, marginBottom: 10 }}>
              Each row is a deployment level. Look for tolerable stress alongside a surviving portfolio.
            </div>
            <div style={{ maxHeight: 270, overflowY: "auto" }}>
              <DataTable
                headers={["Deploy", "Stress", "Portfolio left", "Read"]}
                rows={rows.map(d => [
                  f.money(d.savings),
                  <span key="s" style={{ color: d.stress > 0.5 ? C.red : d.stress > 0.25 ? C.orange : C.green, fontFamily: MONO }}>{f.pct(d.stress)}</span>,
                  <span key="p" style={{ color: d.investViable ? C.green : C.red, fontFamily: MONO }}>
                    {d.investViable ? f.money(d.portfolioSurplus) : "depleted"}
                  </span>,
                  <span key="v" style={{ fontSize: 10, fontFamily: "inherit" }}>
                    {d.stress > 0.5
                      ? <span style={{ color: C.red }}>High stress</span>
                      : d.stress > 0.25
                        ? <span style={{ color: C.orange }}>Moderate</span>
                        : d.investViable
                          ? <span style={{ color: C.green, fontWeight: 600 }}>✓ Comfortable</span>
                          : <span style={{ color: C.accent2 }}>Low stress</span>}
                  </span>,
                ])}
                highlight={i => sweetSpot != null && rows[i].savings === sweetSpot.savings}
              />
            </div>
          </div>
        </Grid>

        <Callout tone="warn" style={{ marginTop: 16 }} title="How to read this">
          {sweetSpot
            ? <>Stress first falls to a tolerable level at{" "}
                <strong style={{ color: C.text }}>{f.money(sweetSpot.savings)}</strong> deployed.{" "}
                {sweetSpot.investViable
                  ? <>At {f.pct(profile.marketReturn)} returns an invested portfolio would also survive at that level, so both strategies work and you have genuine flexibility. Deploying much more than this buys comfort you may not need.</>
                  : <>At {f.pct(profile.marketReturn)} returns the invested alternative doesn't survive here, so deploying is the stronger call — that money wouldn't have out-earned your loan rate anyway.</>}
              </>
            : <>Stress doesn't reach a comfortable level at any deployment level shown. That points to a structural gap rather than an allocation problem: a larger scholarship, a lower APR, a longer repayment term, or a lower-cost programme. Of those, the APR is usually the fastest to move.</>}
        </Callout>
      </div>
    </>
  );
}
