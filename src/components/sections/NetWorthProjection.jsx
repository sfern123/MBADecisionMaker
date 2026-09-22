import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { C, MONO, tooltipStyle } from "../../theme.js";
import { SectionTitle, MetricCard, Card, Grid, Slider, DataTable, Callout } from "../ui.jsx";

export default function NetWorthProjection({ f, nw, profile, update, school }) {
  const { series, crossover, schoolYears, terminal, opportunityCost, totalInvestment, annualLoanPmt, financing } = nw;
  const mbaAhead = terminal.delta >= 0;
  const yr = v => (v <= schoolYears ? `Yr ${v}` : `+${v - schoolYears}`);

  return (
    <>
      <SectionTitle id="networth">8 · Going versus not going</SectionTitle>

      <div style={{ background: `linear-gradient(135deg, ${C.panel}, ${C.panelAlt})`, border: `1px solid ${C.accent2}44`, borderRadius: 14, padding: "22px 26px", marginBottom: 20 }}>
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", color: C.accent2, marginBottom: 16, fontWeight: 600 }}>
          Your comparison inputs
        </div>
        <Grid cols="repeat(auto-fit, minmax(250px, 1fr))" gap={24}>
          <Slider label="Current total comp" value={profile.currentComp} min={0} max={500000} step={5000}
            onChange={v => update({ currentComp: v })} format={f.money}
            description="Base + bonus + equity today. This is what you give up by going." />
          <Slider label="Current net worth" value={profile.currentNetWorth} min={-200000} max={2000000} step={10000}
            onChange={v => update({ currentNetWorth: v })} format={f.money}
            description="Assets minus debts. The starting point for both paths." />
          <Slider label="Savings rate" value={profile.savingsRate} min={0} max={0.6} step={0.01}
            onChange={v => update({ savingsRate: v })} format={v => (v * 100).toFixed(0) + "%"}
            description="Share of after-tax income you invest each year." />
          <Slider label="Comp growth if you don't go" value={profile.noMbaGrowth} min={0} max={0.15} step={0.005}
            onChange={v => update({ noMbaGrowth: v })} format={v => (v * 100).toFixed(1) + "%"}
            description="Annual raises on your current track. Be honest about the ceiling." />
          <Slider label="Investment return" value={profile.marketReturn} min={0.01} max={0.15} step={0.005}
            onChange={v => update({ marketReturn: v })} format={v => (v * 100).toFixed(1) + "%"}
            description="Applied to both paths equally." />
          <Slider label="Projection horizon" value={profile.horizon} min={5} max={30} step={1}
            onChange={v => update({ horizon: v })} format={v => v + " years"}
            description="How far out to project from today." />
        </Grid>
      </div>

      <Grid cols="repeat(auto-fit, minmax(200px, 1fr))" style={{ marginBottom: 16 }}>
        <MetricCard label="Opportunity cost" value={f.compact(opportunityCost)} sub={`${school.programYears} yrs of after-tax income forgone`} color={C.red} />
        <MetricCard label="Total investment" value={f.compact(totalInvestment)} sub={`Opportunity cost + ${f.compact(financing.cost)} of cost`} color={C.orange} />
        <MetricCard label="Debt service" value={f.money(annualLoanPmt)} sub={`Per year for ${profile.loan.termMonths / 12} years`} color={C.red} />
        <MetricCard label="Crossover" value={crossover ? `Year ${crossover}` : `Beyond ${profile.horizon} yrs`}
          sub={crossover ? `${crossover - schoolYears} yrs after graduating` : "Hasn't caught up in this window"}
          color={crossover ? C.green : C.red} />
        <MetricCard label={`Year ${profile.horizon} difference`} value={(mbaAhead ? "+" : "") + f.compact(terminal.delta)}
          sub={`Median outcome ${mbaAhead ? "ahead of" : "behind"} not going`} color={mbaAhead ? C.green : C.red} />
      </Grid>

      <Card
        title="Net worth trajectory"
        subtitle={`Orange is staying put: ${f.money(profile.currentComp)} growing at ${f.pct(profile.noMbaGrowth)}, saving ${(profile.savingsRate * 100).toFixed(0)}% of after-tax income. Blue is the median MBA outcome across ${profile.sims >= 1000 ? "the" : ""} simulated career draws, with the shaded band showing the P10-P90 range.`}
        style={{ marginBottom: 16 }}
      >
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={series} margin={{ left: 12, right: 12, top: 8 }}>
            <defs>
              <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.accent} stopOpacity={0.16} />
                <stop offset="100%" stopColor={C.accent} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={C.borderSoft} />
            <XAxis dataKey="year" tick={{ fontSize: 10, fill: C.muted }} tickFormatter={yr} />
            <YAxis tickFormatter={v => f.compact(v)} tick={{ fontSize: 10, fill: C.faint }} />
            <Tooltip {...tooltipStyle}
              labelFormatter={v => (v <= schoolYears ? `Year ${v} (in school)` : `Year ${v - schoolYears} after graduation`)}
              formatter={(v, n) => [f.compact(v), n]} />
            <Area type="monotone" dataKey="mbaP90" name="P90" stroke="none" fill="url(#bandGrad)" />
            <Line type="monotone" dataKey="noMba" name="Don't go" stroke={C.orange} strokeWidth={3} dot={false} />
            <Line type="monotone" dataKey="mbaP50" name="MBA median" stroke={C.accent} strokeWidth={3} dot={false} />
            <Line type="monotone" dataKey="mbaMean" name="MBA mean" stroke={C.accent2} strokeWidth={1.5} strokeDasharray="6 3" dot={false} />
            <Line type="monotone" dataKey="mbaP10" name="MBA P10" stroke={C.red + "88"} strokeWidth={1} strokeDasharray="4 4" dot={false} />
            {crossover && <ReferenceLine x={crossover} stroke={C.yellow} strokeWidth={2} strokeDasharray="6 3" label={{ value: "crossover", fill: C.yellow, fontSize: 10, position: "top" }} />}
            <ReferenceLine x={schoolYears} stroke={C.muted + "66"} strokeDasharray="3 3" label={{ value: "graduation", fill: C.muted, fontSize: 9, position: "insideTopRight" }} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      <Grid cols="3fr 2fr" gap={16} style={{ marginBottom: 18 }}>
        <Card title="Year by year" style={{ maxHeight: 380, overflowY: "auto" }}>
          <DataTable
            headers={["Year", "Don't go", "MBA P50", "MBA P10", "Difference"]}
            rows={series.map(d => {
              const delta = d.mbaP50 - d.noMba;
              return [
                <span key="y">{yr(d.year)} {d.year === crossover ? <span style={{ color: C.yellow }}>◄</span> : ""}</span>,
                <span key="n" style={{ color: C.orange, fontFamily: MONO }}>{f.compact(d.noMba)}</span>,
                <span key="m" style={{ color: C.accent, fontFamily: MONO }}>{f.compact(d.mbaP50)}</span>,
                <span key="p" style={{ color: C.red + "aa", fontFamily: MONO }}>{f.compact(d.mbaP10)}</span>,
                <span key="d" style={{ color: delta >= 0 ? C.green : C.red, fontFamily: MONO }}>
                  {delta >= 0 ? "+" : ""}{f.compact(delta)}
                </span>,
              ];
            })}
            highlight={i => series[i].year === crossover}
          />
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Card title="Income comparison">
            <DataTable
              headers={["", "Don't go", "MBA (expected)"]}
              rows={[
                ["Year 1", f.money(profile.currentComp), "0 (in school)"],
                [`Year ${schoolYears + 1}`, f.money(profile.currentComp * Math.pow(1 + profile.noMbaGrowth, schoolYears)), f.money(nw.expectedY1)],
                [`Year ${profile.horizon}`, f.money(nw.noMbaFinalComp), f.money(nw.mbaFinalComp)],
                [`Net worth yr ${profile.horizon}`, f.compact(terminal.noMba), f.compact(terminal.mbaP50)],
              ]}
            />
          </Card>

          <Callout tone={mbaAhead ? "good" : "danger"} title={mbaAhead ? "Positive at these assumptions" : "Hasn't paid off in this window"}>
            {mbaAhead
              ? <>The median MBA outcome leads by <strong style={{ color: C.green }}>{f.compact(terminal.delta)}</strong> at
                  year {profile.horizon}. The P10 downside lands at {f.compact(terminal.mbaP10)}
                  {terminal.mbaP10 < terminal.noMba
                    ? <>, still <span style={{ color: C.red }}>{f.compact(terminal.noMba - terminal.mbaP10)} behind</span> not going. Positive expected value, real downside — that's a bet, not a certainty.</>
                    : <>, also ahead of not going. The MBA wins across the range shown here.</>}</>
              : <>At {f.money(profile.currentComp)} growing {f.pct(profile.noMbaGrowth)}, your current
                  track is strong enough that {school.programYears} years of lost income plus the debt
                  isn't recovered within {profile.horizon} years. Lengthening the horizon, a larger
                  scholarship, or a more realistic growth rate on your current path would each change
                  this — try them and see which one actually moves it.</>}
          </Callout>

          <Card title="What this model assumes">
            <div style={{ fontSize: 11, color: C.faint, lineHeight: 1.7 }}>
              • The MBA path is stochastic; the no-MBA path is <strong style={{ color: C.muted }}>deterministic</strong> — no layoffs, no stalled promotions. That flatters staying put.<br />
              • Both paths save {(profile.savingsRate * 100).toFixed(0)}% of after-tax income at {f.pct(profile.marketReturn)}.<br />
              • Tax is a flat {(profile.taxRate * 100).toFixed(0)}% throughout, ignoring brackets and relocation.<br />
              • No loan forgiveness, employer sponsorship, or income-driven repayment.<br />
              • Nothing here prices the parts people actually cite afterwards: the network, the pivot, the two years out of the grind.
            </div>
          </Card>
        </div>
      </Grid>
    </>
  );
}
