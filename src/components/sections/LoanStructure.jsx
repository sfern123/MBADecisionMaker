import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { C, MONO, tooltipStyle } from "../../theme.js";
import { SectionTitle, MetricCard, Card, Grid, DataTable, Callout } from "../ui.jsx";

export default function LoanStructure({ f, financing, scenarios, activeRate, profile, school }) {
  const termYears = profile.loan.termMonths / 12;
  const hasCap = profile.loan.federalPerYear > 0;

  return (
    <>
      <SectionTitle id="loan">1 · Loan structure</SectionTitle>

      <Grid cols="repeat(auto-fit, minmax(210px, 1fr))" style={{ marginBottom: 18 }}>
        <MetricCard
          label="Total cost of attendance"
          value={f.money(financing.cost)}
          sub={`${school.programYears}-year programme${financing.scholarship > 0 ? ` · less ${f.money(financing.scholarship)} scholarship` : ""}`}
        />
        <MetricCard
          label="Amount to finance"
          value={f.money(financing.need)}
          sub={hasCap
            ? `Capped tranche ${f.money(financing.federal)} · private ${f.money(financing.private)}`
            : "All private — no capped programme configured"}
        />
        <MetricCard
          label="Monthly payment"
          value={f.money(financing.totalPmt)}
          sub={`Weighted rate ${f.pct(financing.weightedRate)} over ${termYears} years`}
          color={financing.totalPmt > 2500 ? C.orange : C.green}
        />
        <MetricCard
          label={`Total repaid (${termYears}yr)`}
          value={f.money(financing.totalRepaid)}
          sub={`Interest alone: ${f.money(financing.interestCost)}`}
          color={C.red}
        />
        <MetricCard
          label="Private APR"
          value={f.pct(financing.privateRate)}
          sub={profile.useDirectApr ? "From your lender quote" : `Estimated from score ${profile.creditScore}`}
          color={financing.privateRate > 0.08 ? C.red : C.green}
        />
      </Grid>

      {financing.private > 0 && hasCap && (
        <Callout tone="warn" title="Why the private share matters" style={{ marginBottom: 18 }}>
          {f.money(financing.private)} of your financing sits above the capped
          tranche, so it is priced off your creditworthiness rather than a
          fixed government rate. That portion is what the credit-score section
          below is really about.
        </Callout>
      )}

      <Grid cols="1fr 1fr" gap={16} style={{ marginBottom: 20 }}>
        <Card
          title="Cost by private rate"
          subtitle="Same debt, different APRs. The highlighted bar is your current rate."
        >
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={scenarios} margin={{ left: 6, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.borderSoft} />
              <XAxis dataKey="rate" tickFormatter={v => f.pct(v)} tick={{ fontSize: 10, fill: C.muted }} />
              <YAxis tickFormatter={v => f.compact(v)} tick={{ fontSize: 10, fill: C.faint }} domain={["dataMin - 20000", "dataMax + 10000"]} />
              <Tooltip {...tooltipStyle} formatter={v => [f.money(v), "Total repaid"]} labelFormatter={v => `${f.pct(v)} APR`} />
              <Bar dataKey="total" radius={[5, 5, 0, 0]}>
                {scenarios.map((s, i) => (
                  <Cell key={i}
                    fill={Math.abs(s.rate - activeRate) < 0.001 ? C.accent + "cc" : C.accent + "3a"}
                    stroke={Math.abs(s.rate - activeRate) < 0.001 ? C.accent : "none"}
                  />
                ))}
              </Bar>
              <ReferenceLine y={scenarios.find(s => Math.abs(s.rate - activeRate) < 0.001)?.total} stroke={C.yellow} strokeDasharray="5 3" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Rate scenario table">
          <DataTable
            headers={["APR", "Monthly", "Total repaid", "Interest"]}
            rows={scenarios.map(s => [
              <span style={{ fontFamily: MONO }} key="r">
                {f.pct(s.rate)} {Math.abs(s.rate - activeRate) < 0.001 ? "◄" : ""}
              </span>,
              f.money(s.monthly), f.money(s.total), f.money(s.interest),
            ])}
            highlight={i => Math.abs(scenarios[i].rate - activeRate) < 0.001}
          />
        </Card>
      </Grid>
    </>
  );
}
