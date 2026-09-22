import { ComposedChart, Area, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { C, MONO, tooltipStyle } from "../../theme.js";
import { SectionTitle, MetricCard, Card, Grid, Slider, DataTable, Callout, Toggle } from "../ui.jsx";
import { ACCOUNT_TYPES } from "../../lib/fire.js";

const MIX_COLORS = { taxable: C.green, cash: C.muted, afterTax: C.accent, preTax: C.orange, taxFree: C.accent2 };

export default function FireProjection({ f, fire, profile, update }) {
  const { target, coast, startingTotal, trajectory, mixAtFire, medianFireYear, medianFireAge,
    fireBy, survivalRate, avgEffectiveTaxRate, alreadyCoasting } = fire;

  const setAccount = (k, v) => update({ accounts: { ...profile.accounts, [k]: v } });
  const setContribution = (k, v) => update({ contributions: { ...profile.contributions, [k]: v } });

  const mixData = Object.entries(mixAtFire)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: ACCOUNT_TYPES.find(a => a.id === k)?.label ?? k, value: v, key: k }));

  return (
    <>
      <SectionTitle id="fire">Financial independence</SectionTitle>

      <Callout tone="info" style={{ marginBottom: 18 }}>
        Two years of no income and a large loan don't just delay retirement —
        they delay the compounding that gets you there. This projects when
        your portfolio could cover your spending, and how much the MBA debt
        service shifts that date. <strong style={{ color: C.text }}>Coast FIRE</strong> is
        usually the more decision-relevant milestone: the balance that, left
        completely alone, reaches your target on its own.
      </Callout>

      <div style={{ background: `linear-gradient(135deg, ${C.panel}, ${C.panelAlt})`, border: `1px solid ${C.green}33`, borderRadius: 14, padding: "20px 24px", marginBottom: 14 }}>
        <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.14em", color: C.green, marginBottom: 14, fontWeight: 600 }}>Profile</div>
        <Grid cols="repeat(auto-fit, minmax(230px, 1fr))" gap={22}>
          <Slider label="Current age" value={profile.currentAge} min={20} max={60} step={1}
            onChange={v => update({ currentAge: v })} format={v => v + " yrs"} />
          <Slider label="Annual spending in retirement" value={profile.annualSpending} min={20000} max={300000} step={5000}
            onChange={v => update({ annualSpending: v })} format={f.money}
            description="After tax, in today's money." />
          <Slider label="Safe withdrawal rate" value={profile.withdrawalRate} min={0.025} max={0.06} step={0.0025}
            onChange={v => update({ withdrawalRate: v })} format={v => (v * 100).toFixed(2) + "%"}
            description="4% is the common rule of thumb; it is a rule of thumb, not a guarantee." />
          <Slider label="Inflation" value={profile.inflation} min={0} max={0.07} step={0.0025}
            onChange={v => update({ inflation: v })} format={v => (v * 100).toFixed(2) + "%"} />
          <Slider label="Portfolio volatility" value={profile.portfolioVolatility} min={0.05} max={0.30} step={0.01}
            onChange={v => update({ portfolioVolatility: v })} format={v => (v * 100).toFixed(0) + "%"} />
          <Slider label="Coast target age" value={profile.coastTargetAge} min={40} max={75} step={1}
            onChange={v => update({ coastTargetAge: v })} format={v => "age " + v }
            description="When the untouched balance should reach your number." />
          <Slider label="Other retirement income" value={profile.otherRetirementIncome} min={0} max={120000} step={1000}
            onChange={v => update({ otherRetirementIncome: v })} format={f.money}
            description="State pension, social security, annuity, part-time work." />
          <Slider label="…starting at age" value={profile.retirementIncomeStartAge} min={50} max={75} step={1}
            onChange={v => update({ retirementIncomeStartAge: v })} format={v => "age " + v} />
        </Grid>
      </div>

      <div style={{ background: `linear-gradient(135deg, ${C.panel}, ${C.panelAlt})`, border: `1px solid ${C.accent}33`, borderRadius: 14, padding: "20px 24px", marginBottom: 18 }}>
        <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.14em", color: C.accent, marginBottom: 6, fontWeight: 600 }}>Accounts</div>
        <div style={{ fontSize: 11, color: C.faint, marginBottom: 14, lineHeight: 1.5 }}>
          Split matters because withdrawal order is a tax decision. US account
          names are noted, but the categories are generic — map your own
          accounts onto whichever tax treatment fits.
        </div>
        <Grid cols="repeat(auto-fit, minmax(230px, 1fr))" gap={22}>
          {ACCOUNT_TYPES.map(a => (
            <Slider key={a.id} label={a.label} value={profile.accounts[a.id] ?? 0}
              min={0} max={3000000} step={5000}
              onChange={v => setAccount(a.id, v)} format={f.money} description={a.note} />
          ))}
          <Slider label="Taxable account cost basis" value={profile.taxableBasis}
            min={0} max={Math.max(10000, profile.accounts.taxable)} step={5000}
            onChange={v => update({ taxableBasis: v })} format={f.money}
            description="A lower basis means more of a withdrawal is a taxable gain." />
        </Grid>

        <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 10, paddingTop: 16 }}>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: C.orange, marginBottom: 12, fontWeight: 600 }}>Annual contributions</div>
          <Grid cols="repeat(auto-fit, minmax(230px, 1fr))" gap={22}>
            <Slider label="Tax-deferred / yr" value={profile.contributions.preTax} min={0} max={50000} step={500}
              onChange={v => setContribution("preTax", v)} format={f.money}
              description="US 401(k) employee limit was $23,500 for 2025. Reduces taxable income." />
            <Slider label="Tax-free / yr" value={profile.contributions.taxFree} min={0} max={30000} step={500}
              onChange={v => setContribution("taxFree", v)} format={f.money}
              description="US Roth IRA limit was $7,000 for 2025; high earners may need a backdoor contribution." />
            <Slider label="After-tax / yr" value={profile.contributions.afterTax} min={0} max={50000} step={1000}
              onChange={v => setContribution("afterTax", v)} format={f.money}
              description="US: after-tax 401(k), the mega-backdoor route." />
          </Grid>
          <Toggle label="Use progressive bracket tax in retirement"
            checked={profile.useBracketTax}
            onChange={v => update({ useBracketTax: v })}
            hint="On: full bracket maths on withdrawals. Off: your flat effective rate. Bracket mode only reflects US rules." />
        </div>
      </div>

      <Grid cols="repeat(auto-fit, minmax(190px, 1fr))" style={{ marginBottom: 18 }}>
        <MetricCard label="Your number" value={f.compact(target)}
          sub={`${f.money(profile.annualSpending)}/yr at ${(profile.withdrawalRate * 100).toFixed(2)}%`} color={C.green} />
        <MetricCard label="Coast number" value={f.compact(coast)}
          sub={alreadyCoasting ? "You're already past it" : `${f.compact(Math.max(0, coast - startingTotal))} to go`}
          color={alreadyCoasting ? C.green : C.accent} />
        <MetricCard label="Median arrival" value={medianFireYear > trajectory.length ? "Beyond horizon" : `Age ${medianFireAge}`}
          sub={medianFireYear > trajectory.length ? "Not reached in this projection" : `${medianFireYear} years away`}
          color={medianFireYear > trajectory.length ? C.red : C.green} />
        <MetricCard label="Reach it within 15 yrs" value={f.pct(fireBy[15])}
          sub={`Within 10: ${f.pct(fireBy[10])} · within 20: ${f.pct(fireBy[20])}`} color={C.accent} />
        <MetricCard label="Money lasts" value={f.pct(survivalRate)}
          sub="Share of runs that don't run dry"
          color={survivalRate > 0.9 ? C.green : survivalRate > 0.75 ? C.orange : C.red} />
        <MetricCard label="Effective tax in retirement" value={f.pct(avgEffectiveTaxRate)}
          sub="Across the drawdown years" color={C.orange} />
      </Grid>

      <Card
        title="Portfolio trajectory against an inflation-adjusted target"
        subtitle="Shaded band is the P10–P90 range. The dashed line is your number, rising with inflation — which is why it's a moving finish line."
        style={{ marginBottom: 18 }}
      >
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={trajectory} margin={{ left: 12, right: 12, top: 8 }}>
            <defs>
              <linearGradient id="fireBand" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.green} stopOpacity={0.18} />
                <stop offset="100%" stopColor={C.green} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={C.borderSoft} />
            <XAxis dataKey="age" tick={{ fontSize: 10, fill: C.muted }} tickFormatter={v => `${v}`} />
            <YAxis tickFormatter={v => f.compact(v)} tick={{ fontSize: 10, fill: C.faint }} />
            <Tooltip {...tooltipStyle} labelFormatter={v => `Age ${v}`} formatter={(v, n) => [f.compact(v), n]} />
            <Area type="monotone" dataKey="p90" stroke="none" fill="url(#fireBand)" name="P90" />
            <Area type="monotone" dataKey="p10" stroke="none" fill={C.bg} name="P10" />
            <Line type="monotone" dataKey="p50" name="Median" stroke={C.green} strokeWidth={3} dot={false} />
            <Line type="monotone" dataKey="p25" name="P25" stroke={C.orange + "88"} strokeWidth={1} strokeDasharray="4 3" dot={false} />
            <Line type="monotone" dataKey="target" name="Target" stroke={C.yellow} strokeWidth={2} strokeDasharray="6 3" dot={false} />
            {medianFireAge <= trajectory[trajectory.length - 1].age && (
              <ReferenceLine x={medianFireAge} stroke={C.accent} strokeDasharray="5 3"
                label={{ value: "median arrival", fill: C.accent, fontSize: 10, position: "top" }} />
            )}
            <Legend wrapperStyle={{ fontSize: 10 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      <Grid cols="1fr 1fr" gap={16} style={{ marginBottom: 18 }}>
        <Card
          title="Account mix when you get there"
          subtitle="The split decides your tax bill in retirement, and how much flexibility you have about when to realise income."
        >
          {mixData.length ? (
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie data={mixData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={45} paddingAngle={2}>
                  {mixData.map(d => <Cell key={d.key} fill={MIX_COLORS[d.key]} />)}
                </Pie>
                <Tooltip {...tooltipStyle} formatter={v => [f.compact(v)]} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ padding: "50px 0", textAlign: "center", fontSize: 12, color: C.faint }}>
              Enter your account balances above to see the mix.
            </div>
          )}
        </Card>

        <Card title="Milestones">
          <DataTable
            headers={["Milestone", "Amount", "Status"]}
            rows={[
              ["Current total invested", f.compact(startingTotal), <span key="a" style={{ color: C.muted }}>today</span>],
              ["Coast number", f.compact(coast),
                <span key="b" style={{ color: alreadyCoasting ? C.green : C.orange }}>
                  {alreadyCoasting ? "reached" : f.compact(coast - startingTotal) + " to go"}
                </span>],
              ["Half your number", f.compact(target / 2),
                <span key="c" style={{ color: startingTotal >= target / 2 ? C.green : C.muted }}>
                  {startingTotal >= target / 2 ? "reached" : f.compact(target / 2 - startingTotal) + " to go"}
                </span>],
              ["Full independence", f.compact(target),
                <span key="d" style={{ color: startingTotal >= target ? C.green : C.muted }}>
                  {startingTotal >= target ? "reached" : f.compact(target - startingTotal) + " to go"}
                </span>],
            ]}
          />
          <Callout tone={alreadyCoasting ? "good" : "info"} style={{ marginTop: 14 }}>
            {alreadyCoasting
              ? <>You're already past coast: even saving nothing more, your current balance
                  should reach your number by age {profile.coastTargetAge}. That materially
                  changes how much the two years of lost income actually cost you.</>
              : <>You're {f.compact(coast - startingTotal)} short of coast. Reaching it before
                  matriculating would mean the school years pause your saving without pausing
                  your eventual retirement date.</>}
          </Callout>
        </Card>
      </Grid>

      <Callout tone="warn" title="Limits of this projection">
        Bracket mode uses US federal rules for the current tax year plus a flat
        state rate, which is an approximation of a progressive reality. The
        model assumes constant real spending, no long-term care costs, no
        inheritance, no house purchase or sale, and the same return
        distribution for forty years. Sequence-of-returns risk is captured
        only through the volatility draws. Treat the arrival age as a rough
        band, not a date.
      </Callout>
    </>
  );
}
