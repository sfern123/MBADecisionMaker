import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { C, tooltipStyle } from "../../theme.js";
import { SectionTitle, Card, Grid, DataTable, Callout, Badge } from "../ui.jsx";

export default function SchoolComparison({ f, schools, profile }) {
  if (schools.length < 2) {
    return (
      <>
        <SectionTitle id="schools">4 · School choice under uncertainty</SectionTitle>
        <Callout tone="info" title="Pick at least two schools">
          Choose schools to compare in Settings → School. Comparing programmes
          is where cost differences show their real effect.
        </Callout>
      </>
    );
  }

  const best = schools.reduce((a, b) => (a.wealth > b.wealth ? a : b));
  const anyUnverified = schools.some(s => !s.compVerified);
  const mixedCurrency = new Set(schools.map(s => s.currency)).size > 1;

  return (
    <>
      <SectionTitle id="schools">4 · School choice under uncertainty</SectionTitle>

      {mixedCurrency && (
        <Callout tone="danger" title="Mixed currencies" style={{ marginBottom: 14 }}>
          You're comparing programmes priced in different currencies. This app
          does not convert between them, so these columns are not directly
          comparable. Convert to a single currency yourself before drawing a
          conclusion.
        </Callout>
      )}

      {anyUnverified && (
        <Callout tone="warn" title="Some salary data is unverified" style={{ marginBottom: 14 }}>
          Schools marked below have a confirmed cost of attendance but no
          confirmed employment-report figure. For those, the model applies your
          own career mix without any school-level pay adjustment — so they are
          compared on cost alone, which understates the spread between them.
        </Callout>
      )}

      <Grid cols="1fr 1fr" gap={16} style={{ marginBottom: 18 }}>
        <Card
          title="10-year net wealth by school"
          subtitle="Expected outcome with the 5th and 95th percentile range around it. Wide bars mean the choice is dominated by career uncertainty, not by the school."
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={schools} margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.borderSoft} />
              <XAxis dataKey="short" tick={{ fontSize: 10, fill: C.muted }} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis tickFormatter={v => f.compact(v)} tick={{ fontSize: 10, fill: C.faint }} />
              <Tooltip {...tooltipStyle} formatter={v => [f.compact(v)]} />
              <Bar dataKey="wealthP5" name="P5 (worst)" fill={C.red + "44"} radius={[3, 3, 0, 0]} />
              <Bar dataKey="wealth" name="Expected" fill={C.accent + "99"} radius={[3, 3, 0, 0]} />
              <Bar dataKey="wealthP95" name="P95 (best)" fill={C.green + "44"} radius={[3, 3, 0, 0]} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card
          title="Comparison matrix"
          subtitle="Sharpe here means expected wealth per unit of outcome spread — a rough read on which choice is least dependent on things going well."
        >
          <DataTable
            headers={["School", "Cost", "Debt", "E[wealth]", "Sharpe", "P10 down"]}
            rows={schools.map(s => [
              <span key="n" style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", fontWeight: s.id === best.id ? 700 : 400 }}>
                {s.short}
                {s.programYears !== 2 && <Badge tone="info" title={`${s.programYears}-year programme`}>{s.programYears}y</Badge>}
                {!s.compVerified && <Badge tone="warn" title="No confirmed employment-report salary for this school.">?</Badge>}
                {s.id === best.id && <span style={{ color: C.green }}>★</span>}
              </span>,
              f.compact(s.coa), f.compact(s.debt),
              <span key="w" style={{ color: s.id === best.id ? C.green : C.text }}>{f.compact(s.wealth)}</span>,
              s.sharpe.toFixed(2), f.compact(s.downside),
            ])}
            highlight={i => schools[i].id === best.id}
          />
        </Card>
      </Grid>

      <Callout tone="info" style={{ marginBottom: 18 }}>
        <strong style={{ color: C.text }}>Read this carefully.</strong> The spread between
        schools here is driven by cost of attendance and by published median
        pay — not by network, fit, geography, recruiting access, or the specific
        role you want. Those routinely matter more than the gap you see above.
        Treat this as one input, not a ranking.
      </Callout>
    </>
  );
}
