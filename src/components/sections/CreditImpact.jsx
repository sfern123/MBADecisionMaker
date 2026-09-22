import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { C, MONO, tooltipStyle } from "../../theme.js";
import { SectionTitle, Card, Grid, DataTable, Callout } from "../ui.jsx";

export default function CreditImpact({ f, financing, credit, profile }) {
  if (profile.useDirectApr) {
    return (
      <>
        <SectionTitle id="credit">3 · Cost of capital</SectionTitle>
        <Callout tone="info" title="Using your quoted rate">
          You've entered a lender quote of {f.pct(profile.directApr)}, so this
          section's credit-score estimates are switched off. If you want to see
          what a different rate would do, change the APR in Settings → Loan
          rules, or turn the quote off to explore the score tiers.
        </Callout>
      </>
    );
  }

  if (financing.private <= 0) {
    return (
      <>
        <SectionTitle id="credit">3 · Cost of capital</SectionTitle>
        <Callout tone="good" title="No private debt at these inputs">
          Your scholarship, savings, and capped-rate borrowing cover the full
          cost, so your credit score doesn't affect what this degree costs you.
        </Callout>
      </>
    );
  }

  const best = credit[credit.length - 1];
  const current = credit.reduce((acc, t) => (profile.creditScore >= t.score ? t : acc), credit[0]);
  const upside = current.total - best.total;

  return (
    <>
      <SectionTitle id="credit">
        3 · Credit score impact (on {f.money(financing.private)} of private debt)
      </SectionTitle>

      <Grid cols="1fr 1fr" gap={16} style={{ marginBottom: 18 }}>
        <Card
          title="Total repaid by credit tier"
          subtitle="Only the private tranche is affected — the capped tranche is priced the same regardless of your score."
        >
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={credit} margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.borderSoft} />
              <XAxis dataKey="score" tick={{ fontSize: 11, fill: C.muted }} />
              <YAxis tickFormatter={v => f.compact(v)} tick={{ fontSize: 10, fill: C.faint }} domain={["dataMin - 15000", "dataMax + 10000"]} />
              <Tooltip {...tooltipStyle} formatter={v => [f.money(v), "Total repaid"]} labelFormatter={v => `Score ${v}+`} />
              <Bar dataKey="total" radius={[5, 5, 0, 0]}>
                {credit.map((d, i) => (
                  <Cell key={i}
                    fill={d.score === current.score ? C.accent + "cc" : C.accent + "33"}
                    stroke={d.score === current.score ? C.accent : "none"} strokeWidth={2}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Score → APR → what it saves">
          <DataTable
            headers={["Score", "APR", "Monthly", "Total", "Saved"]}
            rows={credit.map(c => [
              <span style={{ fontFamily: MONO }} key="s">{c.score}+ {c.score === current.score ? "◄" : ""}</span>,
              f.pct(c.apr), f.money(c.monthly), f.money(c.total),
              <span style={{ color: c.savings > 0 ? C.green : C.muted, fontFamily: MONO }} key="v">
                {c.savings > 0 ? f.money(c.savings) : "—"}
              </span>,
            ])}
            highlight={i => credit[i].score === current.score}
          />
          {upside > 0 && (
            <Callout tone="warn" style={{ marginTop: 14 }}>
              Reaching the top tier from your current score would save about{" "}
              <strong style={{ color: C.text }}>{f.money(upside)}</strong> over the
              life of the loan. Whether that's achievable depends on your
              situation — but it's usually the cheapest lever available before
              you borrow, since it costs nothing but time.
            </Callout>
          )}
        </Card>
      </Grid>
    </>
  );
}
