import { C, MONO } from "../../theme.js";
import { SectionTitle, Card, DataTable, Callout } from "../ui.jsx";

export default function CapitalStack({ f, strategies, profile }) {
  if (profile.totalSavings <= 0) {
    return (
      <>
        <SectionTitle id="stack">5 · Capital stack</SectionTitle>
        <Callout tone="info" title="No cash to allocate">
          Enter your available savings in Settings → Assumptions (or during
          setup) to compare how much of it to put toward tuition.
        </Callout>
      </>
    );
  }

  const best = strategies.reduce((a, b) => (a.adjWealth > b.adjWealth ? a : b));

  return (
    <>
      <SectionTitle id="stack">
        5 · Capital stack — how much of your {f.money(profile.totalSavings)} to deploy
      </SectionTitle>

      <Card
        title="Strategy comparison"
        subtitle="Each strategy deploys a different share of your cash to tuition. Whatever is held back stays invested, so the final column credits each strategy with the future value of the liquidity it preserved."
        style={{ marginBottom: 12 }}
      >
        <DataTable
          headers={["Strategy", "Deployed", "Kept liquid", "Debt", "Monthly", "Stress", "Adj. wealth", "P5 downside"]}
          rows={strategies.map(s => [
            <span key="n" style={{ fontWeight: s.name === best.name ? 700 : 400 }}>
              {s.name} {s.name === best.name ? "★" : ""}
            </span>,
            f.money(s.savingsUsed), f.money(s.liquidity), f.money(s.debt), f.money(s.monthly),
            <span key="s" style={{ color: s.stress > 0.5 ? C.red : s.stress > 0.25 ? C.orange : C.green, fontFamily: MONO }}>
              {f.pct(s.stress)}
            </span>,
            <span key="w" style={{ color: s.name === best.name ? C.green : C.text, fontFamily: MONO }}>
              {f.compact(s.adjWealth)}
            </span>,
            f.compact(s.downside),
          ])}
          highlight={i => strategies[i].name === best.name}
        />
        <div style={{ fontSize: 11, color: C.faint, marginTop: 10, lineHeight: 1.6 }}>
          {strategies.map(s => (
            <div key={s.name}><strong style={{ color: C.muted }}>{s.name}:</strong> {s.blurb}</div>
          ))}
        </div>
      </Card>

      <Callout tone="warn" title="What this table can't see">
        Adjusted wealth assumes your held-back cash actually stays invested at{" "}
        {f.pct(profile.marketReturn)} and is never touched. In practice an
        emergency fund exists precisely because it gets spent. A strategy that
        scores marginally lower here but leaves you with a real cash buffer
        during two years of no income may well be the better call.
      </Callout>
    </>
  );
}
