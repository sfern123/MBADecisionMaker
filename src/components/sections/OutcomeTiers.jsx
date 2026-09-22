import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { C, MONO, tooltipStyle } from "../../theme.js";
import { SectionTitle, MetricCard, Card, Grid, Slider, DataTable, Callout } from "../ui.jsx";

export default function OutcomeTiers({ f, tiers, profile, update }) {
  const { tierProbs, horizons, trajectory, noMba, mba } = tiers;
  const acc = profile.mbaAcceleration;

  const chartHorizon = horizons[horizons.length - 1];
  const tierChart = tierProbs.map(t => ({
    tier: f.compact(t.tier),
    "Without MBA": t[`noMba_${chartHorizon}`],
    "With MBA": t[`mba_${chartHorizon}`],
  }));

  return (
    <>
      <SectionTitle id="tiers">Where each path tends to land</SectionTitle>

      <Callout tone="warn" title="Read the acceleration assumption first" style={{ marginBottom: 18 }}>
        Both branches climb the <em>same</em> promotion ladder through the same
        code — the only differences are your starting compensation, the two
        years out, and how much faster the degree moves you up. That last
        number is the single most contestable input in this entire tool, and
        it decides the answer. It's a slider below rather than a hidden
        constant for exactly that reason. Reasonable people put it anywhere
        from 1.0 (no effect at all) to 2.0.
      </Callout>

      <div style={{ background: `linear-gradient(135deg, ${C.panel}, ${C.panelAlt})`, border: `1px solid ${C.accent2}33`, borderRadius: 14, padding: "20px 24px", marginBottom: 18 }}>
        <Grid cols="repeat(auto-fit, minmax(240px, 1fr))" gap={22}>
          <Slider label="Promotion acceleration from the MBA" value={acc.promoProbMultiplier}
            min={1} max={2.5} step={0.05}
            onChange={v => update({ mbaAcceleration: { ...acc, promoProbMultiplier: v } })}
            format={v => v.toFixed(2) + "×"}
            description="1.00× means the degree changes nothing about promotion odds. Set it where you actually believe it." />
          <Slider label="Years earlier you become eligible" value={acc.yearsEarlier}
            min={0} max={4} step={1}
            onChange={v => update({ mbaAcceleration: { ...acc, yearsEarlier: v } })}
            format={v => v + " yrs"}
            description="How much sooner each rung opens up post-MBA." />
          <Slider label="Simulation horizon" value={profile.ladderYears} min={10} max={30} step={1}
            onChange={v => update({ ladderYears: v })} format={v => v + " years"} />
          <Slider label="Founder likelihood after an MBA" value={profile.founderOption.annualProbMba}
            min={0} max={0.20} step={0.005}
            onChange={v => update({ founderOption: { ...profile.founderOption, annualProbMba: v } })}
            format={v => (v * 100).toFixed(1) + "%/yr"}
            description="Annual chance of leaving the ladder to start something." />
        </Grid>
      </div>

      <Grid cols="repeat(auto-fit, minmax(190px, 1fr))" style={{ marginBottom: 18 }}>
        <MetricCard label="Reach senior partner / C-suite" value={f.pct(mba.exec)}
          sub={`Without the MBA: ${f.pct(noMba.exec)}`} color={C.green} />
        <MetricCard label="Reach VP / partner or above" value={f.pct(mba.vpPlus)}
          sub={`Without: ${f.pct(noMba.vpPlus)}`} color={C.accent} />
        <MetricCard label="Median peak compensation" value={f.compact(mba.medianPeak)}
          sub={`Without: ${f.compact(noMba.medianPeak)}`} color={C.accent} />
        <MetricCard label="End up founding something" value={f.pct(mba.founder)}
          sub={`Without: ${f.pct(noMba.founder)}`} color={C.orange} />
        <MetricCard label="Median cumulative savings" value={f.compact(mba.medianWealth)}
          sub={`Without: ${f.compact(noMba.medianWealth)}`}
          color={mba.medianWealth > noMba.medianWealth ? C.green : C.red} />
      </Grid>

      <Grid cols="1fr 1fr" gap={16} style={{ marginBottom: 18 }}>
        <Card
          title={`Probability of clearing each pay level by year ${chartHorizon}`}
          subtitle="Share of simulated careers earning at least this much in that year."
        >
          <ResponsiveContainer width="100%" height={270}>
            <BarChart data={tierChart} margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.borderSoft} />
              <XAxis dataKey="tier" tick={{ fontSize: 10, fill: C.muted }} />
              <YAxis tickFormatter={v => (v * 100).toFixed(0) + "%"} tick={{ fontSize: 10, fill: C.faint }} domain={[0, 1]} />
              <Tooltip {...tooltipStyle} formatter={v => [f.pct(v)]} />
              <Bar dataKey="Without MBA" fill={C.orange + "99"} radius={[3, 3, 0, 0]} />
              <Bar dataKey="With MBA" fill={C.accent + "99"} radius={[3, 3, 0, 0]} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card
          title="Median compensation over time"
          subtitle="Solid lines are medians; dashed are the 90th percentile — the good-outcome case for each path."
        >
          <ResponsiveContainer width="100%" height={270}>
            <LineChart data={trajectory} margin={{ left: 12, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.borderSoft} />
              <XAxis dataKey="year" tick={{ fontSize: 10, fill: C.muted }} tickFormatter={v => `Yr ${v}`} />
              <YAxis tickFormatter={v => f.compact(v)} tick={{ fontSize: 10, fill: C.faint }} />
              <Tooltip {...tooltipStyle} formatter={(v, n) => [f.money(v), n]} labelFormatter={v => `Year ${v}`} />
              <Line type="monotone" dataKey="noMba" name="Without MBA" stroke={C.orange} strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="mba" name="With MBA" stroke={C.accent} strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="noMbaP90" name="Without, P90" stroke={C.orange + "77"} strokeWidth={1} strokeDasharray="4 3" dot={false} />
              <Line type="monotone" dataKey="mbaP90" name="With, P90" stroke={C.accent + "77"} strokeWidth={1} strokeDasharray="4 3" dot={false} />
              <Legend wrapperStyle={{ fontSize: 9 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </Grid>

      <Card title="Full tier table" subtitle="Probability of earning at least each amount, at each horizon." style={{ marginBottom: 18 }}>
        <DataTable
          headers={["Pay level", ...horizons.flatMap(h => [`Yr ${h} without`, `Yr ${h} with`])]}
          rows={tierProbs.map(t => [
            f.compact(t.tier),
            ...horizons.flatMap(h => [
              <span key={`n${h}`} style={{ color: C.orange, fontFamily: MONO }}>{f.pct(t[`noMba_${h}`])}</span>,
              <span key={`m${h}`} style={{ color: t[`mba_${h}`] > t[`noMba_${h}`] ? C.green : C.muted, fontFamily: MONO }}>{f.pct(t[`mba_${h}`])}</span>,
            ]),
          ])}
        />
      </Card>

      <Callout tone="danger" title="Treat these probabilities as illustrative">
        This is a structural model, not an empirical one. Nobody publishes
        reliable long-run promotion rates by degree, so the ladder multiples
        and promotion probabilities are reasoned defaults, not measured
        outcomes. They're useful for asking "how much acceleration would the
        degree need to provide for this to be worth it?" — which you can
        answer by moving the slider until the paths cross. They are not
        useful as a forecast of your career.
      </Callout>
    </>
  );
}
