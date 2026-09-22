import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { C, MONO, tooltipStyle } from "../../theme.js";
import { SectionTitle, MetricCard, Card, Grid, Slider, DataTable, Callout } from "../ui.jsx";
import { updatePrimaryHolding } from "../../state/actions.js";

const PALETTE = [C.green, C.accent, C.orange, C.accent2];

export default function EquityStrategy({ f, strategies, profile, update }) {
  const e = profile.equity;
  const setEquity = patch => update(updatePrimaryHolding(profile, patch));

  const vested = e.vestedShares * e.price;
  const total = vested + profile.otherAssets;
  const concentration = total > 0 ? vested / total : 0;

  const best = strategies.reduce((a, b) => (a.medianWealth > b.medianWealth ? a : b));
  const safest = strategies.reduce((a, b) => (a.worstDrawdown < b.worstDrawdown ? a : b));

  const trajectoryData = strategies[0].trajectory.map((_, i) => {
    const row = { year: i + 1 };
    strategies.forEach(s => { row[s.label] = s.trajectory[i].value; });
    return row;
  });

  return (
    <>
      <SectionTitle id="equitystrategy">What to do with vesting equity</SectionTitle>

      <Callout tone={concentration > 0.4 ? "danger" : "info"} style={{ marginBottom: 18 }}>
        {concentration > 0.4
          ? <><strong style={{ color: C.text }}>{f.pct(concentration)} of your liquid net worth sits in one company's stock.</strong>{" "}
              Your salary already depends on that company. A bad year there can hit your
              income and your savings at the same moment — which is precisely when
              you'd need the savings.</>
          : <>These four strategies are scored on terminal wealth, worst drawdown, and how
              concentrated you end up. The wealth column is not the only one that matters:
              a strategy can win on median outcome while leaving you badly exposed.</>}
      </Callout>

      <div style={{ background: `linear-gradient(135deg, ${C.panel}, ${C.panelAlt})`, border: `1px solid ${C.green}33`, borderRadius: 14, padding: "20px 24px", marginBottom: 18 }}>
        <Grid cols="repeat(auto-fit, minmax(240px, 1fr))" gap={22}>
          <Slider label="Unvested shares" value={e.unvestedShares} min={0} max={10000} step={50}
            onChange={v => setEquity({ unvestedShares: v })} format={v => v.toLocaleString()}
            description={`Still vesting — worth ${f.compact(e.unvestedShares * e.price)} at today's price.`} />
          <Slider label="Vesting period" value={e.vestingYears} min={1} max={6} step={1}
            onChange={v => setEquity({ vestingYears: v })} format={v => v + " yrs"} />
          <Slider label="Annual refresh grant" value={e.annualRefresh} min={0} max={500000} step={5000}
            onChange={v => setEquity({ annualRefresh: v })} format={f.money}
            description="New equity granted each year, in currency value." />
          <div style={{ fontSize: 11, color: C.faint, lineHeight: 1.6, paddingTop: 4 }}>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: C.muted, marginBottom: 5 }}>
              Other invested assets
            </div>
            <div style={{ fontFamily: MONO, fontSize: 19, fontWeight: 700, color: C.text }}>{f.money(profile.otherAssets)}</div>
            Everything outside this holding, taken from your balance sheet. Edit it in Settings &rarr; Balance sheet.
          </div>
          <Slider label="Annual trim rate" value={profile.diversifyPct} min={0.05} max={0.75} step={0.05}
            onChange={v => update({ diversifyPct: v })} format={v => (v * 100).toFixed(0) + "%"}
            description="Used by the gradual-diversification strategy." />
          <Slider label="Index volatility" value={profile.indexVol} min={0.08} max={0.30} step={0.01}
            onChange={v => update({ indexVol: v })} format={v => (v * 100).toFixed(0) + "%"}
            description="Volatility of the diversified alternative." />
        </Grid>
      </div>

      <Grid cols="repeat(auto-fit, minmax(200px, 1fr))" style={{ marginBottom: 18 }}>
        <MetricCard label="Current concentration" value={f.pct(concentration)}
          sub={`${f.compact(vested)} of ${f.compact(total)}`}
          color={concentration > 0.5 ? C.red : concentration > 0.3 ? C.orange : C.green} />
        <MetricCard label="Unrealised gain" value={f.compact(e.vestedShares * Math.max(0, e.price - e.costBasis))}
          sub="Taxable when you sell" color={C.orange} />
        <MetricCard label="Highest median wealth" value={best.label} sub={f.compact(best.medianWealth)} color={C.green} />
        <MetricCard label="Smallest worst-case drop" value={safest.label}
          sub={`${f.pct(safest.worstDrawdown)} peak-to-trough`} color={C.accent} />
      </Grid>

      <Card
        title="Strategy comparison"
        subtitle="Median outcome over the simulated horizon. Drawdown is the worst peak-to-trough fall along the way — the number that decides whether you could actually hold through it."
        style={{ marginBottom: 18 }}
      >
        <DataTable
          headers={["Strategy", "Median wealth", "P10", "P90", "Median drawdown", "Worst drawdown", "Tax paid", "Ends concentrated"]}
          rows={strategies.map(s => [
            <span key="n" style={{ fontWeight: s.id === best.id ? 700 : 400 }}>{s.label} {s.id === best.id ? "★" : ""}</span>,
            <span key="w" style={{ color: s.id === best.id ? C.green : C.text, fontFamily: MONO }}>{f.compact(s.medianWealth)}</span>,
            <span key="l" style={{ color: C.red + "cc", fontFamily: MONO }}>{f.compact(s.p10Wealth)}</span>,
            f.compact(s.p90Wealth),
            f.pct(s.medianDrawdown),
            <span key="d" style={{ color: s.worstDrawdown > 0.35 ? C.red : s.worstDrawdown > 0.22 ? C.orange : C.green, fontFamily: MONO }}>{f.pct(s.worstDrawdown)}</span>,
            f.compact(s.medianTax),
            <span key="c" style={{ color: s.endConcentration > 0.4 ? C.red : C.green, fontFamily: MONO }}>{f.pct(s.endConcentration)}</span>,
          ])}
          highlight={i => strategies[i].id === best.id}
        />
        <div style={{ fontSize: 11, color: C.faint, marginTop: 12, lineHeight: 1.7 }}>
          {strategies.map(s => (
            <div key={s.id}><strong style={{ color: C.muted }}>{s.label}:</strong> {s.desc}</div>
          ))}
        </div>
      </Card>

      <Grid cols="3fr 2fr" gap={16} style={{ marginBottom: 18 }}>
        <Card title="Median wealth path by strategy">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trajectoryData} margin={{ left: 12, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.borderSoft} />
              <XAxis dataKey="year" tick={{ fontSize: 10, fill: C.muted }} tickFormatter={v => `Yr ${v}`} />
              <YAxis tickFormatter={v => f.compact(v)} tick={{ fontSize: 10, fill: C.faint }} />
              <Tooltip {...tooltipStyle} formatter={(v, n) => [f.compact(v), n]} labelFormatter={v => `Year ${v}`} />
              {strategies.map((s, i) => (
                <Line key={s.id} type="monotone" dataKey={s.label} stroke={PALETTE[i % PALETTE.length]} strokeWidth={2} dot={false} />
              ))}
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card
          title="Risk taken for the return"
          subtitle="Worst drawdown by strategy. Read this next to the wealth column — extra wealth bought with a drawdown you'd panic-sell through isn't wealth you'd actually keep."
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={strategies} margin={{ left: 8, right: 8 }} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={C.borderSoft} />
              <XAxis type="number" tickFormatter={v => (v * 100).toFixed(0) + "%"} tick={{ fontSize: 10, fill: C.faint }} />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 9, fill: C.muted }} width={95} />
              <Tooltip {...tooltipStyle} formatter={v => [f.pct(v), "Worst drawdown"]} />
              <Bar dataKey="worstDrawdown" radius={[0, 4, 4, 0]}>
                {strategies.map((s, i) => (
                  <Cell key={i} fill={s.worstDrawdown > 0.35 ? C.red + "99" : s.worstDrawdown > 0.22 ? C.orange + "99" : C.green + "99"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </Grid>

      <Callout tone="warn" title="The honest caveat">
        This model gives every strategy the same expected return on the stock,
        so differences come from tax timing, diversification, and path
        dependence — not from any view on whether the shares are cheap. If you
        genuinely believe the stock will beat a diversified index after tax,
        holding wins and no simulation will tell you otherwise. The question
        worth sitting with is whether you'd buy this much of it today with
        cash, given your job already depends on the same company.
      </Callout>
    </>
  );
}
