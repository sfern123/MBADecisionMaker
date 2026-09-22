import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { C, MONO, tooltipStyle } from "../../theme.js";
import { SectionTitle, MetricCard, Card, Grid, Slider, DataTable, Callout } from "../ui.jsx";

export default function InvestVsDeploy({ f, invest, profile, update }) {
  if (profile.savingsDeployed <= 0) {
    return (
      <>
        <SectionTitle id="invest">7 · Deploy the cash, or keep it invested?</SectionTitle>
        <Callout tone="info" title="Nothing deployed yet">
          Raise the <strong style={{ color: C.text }}>savings deployed</strong> control
          above zero to compare putting that money toward tuition against
          keeping it in the market.
        </Callout>
      </>
    );
  }

  const { pathA, pathB, pmtDiff, yearly, terminalPortfolio, depletedYear, interestSaved, winner, horizonYears } = invest;
  const deployed = profile.savingsDeployed;
  const chart = yearly.map(d => ({ ...d, pathB: d.portfolioValue, pathA: d.cumPmtSaved }));
  const schoolYears = profile.__schoolYears ?? 2;

  const row = (label, val, color) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.borderSoft}`, gap: 12 }}>
      <span style={{ fontSize: 12, color: C.muted }}>{label}</span>
      <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, color, textAlign: "right" }}>{val}</span>
    </div>
  );

  return (
    <>
      <SectionTitle id="invest">7 · Deploy the cash, or keep it invested?</SectionTitle>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7 }}>
          You have <span style={{ color: C.accent, fontWeight: 600 }}>{f.money(deployed)}</span> allocated.
          Path A hands it to the school and shrinks the loan. Path B borrows the
          full amount and keeps the cash invested, pulling the higher monthly
          payment out of the portfolio each month. The question is whether the
          portfolio grows fast enough to survive that drain — your loan APR of{" "}
          <span style={{ color: C.orange, fontWeight: 600 }}>{f.pct(pathA.privateRate)}</span> is the
          hurdle it has to clear.
        </div>
      </Card>

      <Card style={{ marginBottom: 16, padding: "14px 22px" }}>
        <Slider
          label="Assumed market return" value={profile.marketReturn}
          min={0.01} max={0.15} step={0.005}
          onChange={v => update({ marketReturn: v })}
          format={v => (v * 100).toFixed(1) + "%"}
          description="Long-run nominal return if the cash stays invested. Broad equity indices have historically averaged roughly 10% nominal, with long stretches well below that."
        />
      </Card>

      <Grid cols="1fr 1fr" gap={16} style={{ marginBottom: 16 }}>
        <Card style={{ border: `1px solid ${C.accent2}44` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Circle letter="A" color={C.accent2} />
            <span style={{ fontSize: 14, fontWeight: 600, color: C.accent2 }}>Deploy to tuition</span>
          </div>
          <div style={{ fontSize: 11, color: C.faint, marginBottom: 12, lineHeight: 1.5 }}>
            A smaller loan means a lower payment and less total interest. The
            trade-off is that the money is spent — it isn't compounding.
          </div>
          {row("Cash deployed", f.money(deployed), C.accent2)}
          {row("Debt", f.money(pathA.need), C.text)}
          {row("Monthly payment", f.money(pathA.totalPmt), C.text)}
          {row("Total repaid", f.money(pathA.totalRepaid), C.text)}
          {row("Interest paid", f.money(pathA.interestCost), C.orange)}
          <Callout tone="alt" style={{ marginTop: 12 }}>
            Guaranteed: <strong style={{ color: C.text }}>{f.money(interestSaved)}</strong> less
            repaid than Path B, with no market risk at all.
          </Callout>
        </Card>

        <Card style={{ border: `1px solid ${C.green}44` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Circle letter="B" color={C.green} />
            <span style={{ fontSize: 14, fontWeight: 600, color: C.green }}>Keep invested</span>
          </div>
          <div style={{ fontSize: 11, color: C.faint, marginBottom: 12, lineHeight: 1.5 }}>
            You borrow the full amount and keep the cash in the market. Your
            payment is <strong style={{ color: C.orange }}>{f.money(pmtDiff)}/mo higher</strong>,
            and that difference comes out of the portfolio every month.
          </div>
          {row("Invested", f.money(deployed), C.green)}
          {row("Assumed return", f.pct(profile.marketReturn) + "/yr", C.green)}
          {row("Debt", f.money(pathB.need), C.orange)}
          {row("Monthly payment", f.money(pathB.totalPmt), C.orange)}
          {row("Total withdrawn", f.money(pmtDiff * profile.loan.termMonths), C.red)}
          <Callout tone={terminalPortfolio > 0 ? "good" : "danger"} style={{ marginTop: 12 }}>
            {terminalPortfolio > 0
              ? <>Portfolio survives every withdrawal, ending at <strong style={{ color: C.text }}>{f.money(terminalPortfolio)}</strong>.</>
              : <>Portfolio runs dry around <strong style={{ color: C.text }}>year {depletedYear ?? "—"}</strong>. Returns don't outpace the loan.</>}
          </Callout>
        </Card>
      </Grid>

      <Grid cols="repeat(auto-fit, minmax(210px, 1fr))" style={{ marginBottom: 16 }}>
        <MetricCard label="Hurdle rate (your APR)" value={f.pct(pathA.privateRate)} sub="The market must beat this for Path B" color={C.orange} />
        <MetricCard label="Payment difference" value={"+" + f.money(pmtDiff) + "/mo"} sub={`${f.money(pathB.totalPmt)} vs ${f.money(pathA.totalPmt)}`} color={C.red} />
        <MetricCard label="Path A: interest avoided" value={f.money(interestSaved)} sub="Risk-free" color={C.accent2} />
        <MetricCard
          label={terminalPortfolio > 0 ? `Path B: portfolio at year ${horizonYears.toFixed(1)}` : "Path B: depleted at"}
          value={terminalPortfolio > 0 ? f.money(terminalPortfolio) : `Year ${depletedYear ?? "—"}`}
          sub={terminalPortfolio > 0 ? "After funding every extra payment" : "Returns trailed the loan rate"}
          color={terminalPortfolio > 0 ? C.green : C.red}
        />
      </Grid>

      <Grid cols="3fr 2fr" gap={16} style={{ marginBottom: 18 }}>
        <Card
          title={`Both paths over ${horizonYears.toFixed(1)} years`}
          subtitle={`Green is the Path B portfolio: it compounds during school, then shrinks by ${f.money(pmtDiff)}/mo once repayment starts. Purple is the running total Path A saved by having the lower payment.`}
        >
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chart} margin={{ left: 8, right: 8, top: 5 }}>
              <defs>
                <linearGradient id="gGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.green} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={C.green} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="pGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.accent2} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={C.accent2} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.borderSoft} />
              <XAxis dataKey="year" tick={{ fontSize: 10, fill: C.muted }}
                tickFormatter={v => (v <= schoolYears ? `Yr ${v}` : `+${v - schoolYears}`)} />
              <YAxis tickFormatter={v => f.compact(v)} tick={{ fontSize: 10, fill: C.faint }} />
              <Tooltip {...tooltipStyle}
                labelFormatter={v => (v <= schoolYears ? `Year ${v} (in school)` : `Year ${v - schoolYears} after graduation`)}
                formatter={(v, n) => [f.money(v), n]} />
              <Area type="monotone" dataKey="pathB" name="Path B: portfolio" stroke={C.green} fill="url(#gGrad)" strokeWidth={2.5} dot={false} />
              <Area type="monotone" dataKey="pathA" name="Path A: saved" stroke={C.accent2} fill="url(#pGrad)" strokeWidth={2.5} dot={false} />
              {depletedYear && (
                <ReferenceLine x={depletedYear} stroke={C.yellow} strokeWidth={2} strokeDasharray="6 3"
                  label={{ value: "depleted", fill: C.yellow, fontSize: 10, position: "top" }} />
              )}
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Year by year" style={{ maxHeight: 420, overflowY: "auto" }}>
          <DataTable
            headers={["Year", "B: portfolio", "A: saved", "Ahead"]}
            rows={chart.map(d => {
              const bWins = d.pathB > d.pathA;
              return [
                d.year <= schoolYears ? `Yr ${d.year}` : `+${d.year - schoolYears}`,
                <span key="b" style={{ color: d.portfolioRaw > 0 ? C.green : C.red, fontFamily: MONO }}>
                  {d.portfolioRaw > 0 ? f.money(d.pathB) : "—"}
                </span>,
                <span key="a" style={{ color: C.accent2, fontFamily: MONO }}>{f.money(d.pathA)}</span>,
                <span key="w" style={{ fontSize: 10, fontWeight: 600, color: bWins ? C.green : C.accent2 }}>
                  {bWins ? "B" : "A"} +{f.compact(Math.abs(d.pathB - d.pathA))}
                </span>,
              ];
            })}
          />
        </Card>
      </Grid>

      <Callout tone={winner === "invest" ? "good" : "alt"} title={winner === "invest" ? "Path B comes out ahead at these assumptions" : "Path A comes out ahead at these assumptions"}>
        {winner === "invest"
          ? <>At {f.pct(profile.marketReturn)} the portfolio clears your {f.pct(pathA.privateRate)} hurdle
              and ends with {f.money(terminalPortfolio)}. Two caveats worth taking seriously: this assumes
              steady returns, and a sharp drawdown in the first few repayment years would drain the
              portfolio far faster than shown. Investment gains are also taxable, while interest you
              never pay is not — so the real hurdle is higher than the headline APR.</>
          : <>At {f.pct(profile.marketReturn)} the portfolio can't sustain the {f.money(pmtDiff)}/mo drain
              and runs out around year {depletedYear ?? "—"}. Reducing the debt up front is the stronger
              move. Try raising the return slider above {f.pct(pathA.privateRate)} to see what it would
              take to flip this — and note that a lower APR moves the hurdle down too.</>}
      </Callout>
    </>
  );
}

function Circle({ letter, color }) {
  return (
    <div style={{ width: 26, height: 26, borderRadius: "50%", background: color + "22", border: `2px solid ${color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color }}>
      {letter}
    </div>
  );
}
