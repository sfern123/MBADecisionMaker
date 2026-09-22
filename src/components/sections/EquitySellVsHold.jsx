import { ComposedChart, BarChart, Bar, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { C, MONO, tooltipStyle } from "../../theme.js";
import { SectionTitle, MetricCard, Card, Grid, Slider, Toggle, Callout, DataTable } from "../ui.jsx";
import { GROWTH_PRESETS } from "../../data/equityPresets.js";

export default function EquitySellVsHold({ f, result, profile, update }) {
  const e = profile.equity;
  const { sale, band, hist, winProb, p10, p25, p50, p75, p90, mean,
    borrowingAvoided, interestAvoided, paymentReduction,
    priceP10, priceP50, priceP90, alternativeTreatment, schoolYears } = result;

  const setEquity = patch => update({ equity: { ...e, ...patch } });

  return (
    <>
      <SectionTitle id="sellhold">Sell equity now, or hold it and borrow more?</SectionTitle>

      <Callout tone="info" style={{ marginBottom: 18 }}>
        Selling vested shares cuts how much you borrow, which is a certain
        saving. Holding keeps the upside, which is not. The loan side of this
        comparison is deterministic — only the share price is uncertain — so
        the whole question is whether your stock out-grows the interest you'd
        have avoided. That's a distribution, not a verdict.
      </Callout>

      <div style={{ background: `linear-gradient(135deg, ${C.panel}, ${C.panelAlt})`, border: `1px solid ${C.orange}33`, borderRadius: 14, padding: "20px 24px", marginBottom: 18 }}>
        <Grid cols="repeat(auto-fit, minmax(260px, 1fr))" gap={24}>
          <div>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.14em", color: C.orange, marginBottom: 12, fontWeight: 600 }}>
              Your position
            </div>
            <Slider label="Share price" value={e.price} min={1} max={1000} step={1}
              onChange={v => setEquity({ price: v })} format={f.money} />
            <Slider label="Vested shares" value={e.vestedShares} min={0} max={5000} step={10}
              onChange={v => setEquity({ vestedShares: v })} format={v => v.toLocaleString()}
              description={`Sellable now — worth ${f.compact(e.vestedShares * e.price)}`} />
            <Slider label="Average cost basis" value={e.costBasis} min={0} max={Math.max(1000, e.price)} step={1}
              onChange={v => setEquity({ costBasis: v })} format={f.money}
              description={`Unrealised gain: ${f.compact(e.vestedShares * Math.max(0, e.price - e.costBasis))}`} />
            {e.unvestedShares > 0 && (
              <div style={{ fontSize: 10, color: C.faint, lineHeight: 1.5 }}>
                Your {e.unvestedShares.toLocaleString()} unvested shares can't be sold, and behave
                identically in both branches — so they cancel out of this comparison entirely.
              </div>
            )}
          </div>

          <div>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.14em", color: C.green, marginBottom: 12, fontWeight: 600 }}>
              The decision
            </div>
            <Slider label="Shares to sell now" value={e.sharesToSell} min={0} max={Math.max(10, e.vestedShares)} step={10}
              onChange={v => setEquity({ sharesToSell: v })} format={v => v.toLocaleString() + " sh"}
              description={`${sale.shares.toLocaleString()} shares → ${f.money(sale.gross)} gross, ${f.money(sale.net)} after ${f.pct(sale.rate)} tax`} />
            <Toggle
              label={e.saleIsLongTerm ? "Held 12+ months (long-term rates)" : "Held under 12 months (short-term rates)"}
              checked={e.saleIsLongTerm}
              onChange={v => setEquity({ saleIsLongTerm: v })}
              hint="Short-term gains are taxed as ordinary income, which is usually a great deal worse."
            />
            <div style={{ fontSize: 11, color: C.faint, lineHeight: 1.6, marginTop: 8 }}>
              Under the other treatment you'd net{" "}
              <strong style={{ color: C.text, fontFamily: MONO }}>{f.money(alternativeTreatment.net)}</strong>{" "}
              — a difference of {f.money(Math.abs(sale.net - alternativeTreatment.net))}.
              {!e.saleIsLongTerm && " Waiting for long-term status keeps that, at the cost of carrying price risk while you wait."}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.14em", color: C.accent, marginBottom: 12, fontWeight: 600 }}>
              Growth assumptions
            </div>
            <div style={{ display: "flex", gap: 5, marginBottom: 12, flexWrap: "wrap" }}>
              {GROWTH_PRESETS.map(p => {
                const on = Math.abs(e.drift - p.drift) < 0.005 && Math.abs(e.vol - p.vol) < 0.005;
                return (
                  <button key={p.id} title={p.desc}
                    onClick={() => setEquity({ drift: p.drift, vol: p.vol, growthPresetId: p.id })}
                    style={{ flex: "1 1 auto", padding: "5px 7px", borderRadius: 6, cursor: "pointer",
                      border: `1px solid ${on ? C.accent : C.border}`,
                      background: on ? C.accent + "22" : "transparent",
                      color: on ? C.accent : C.muted, fontSize: 10, fontWeight: 600 }}>
                    {p.label}
                  </button>
                );
              })}
            </div>
            <Slider label="Expected annual return" value={e.drift} min={-0.10} max={0.35} step={0.01}
              onChange={v => setEquity({ drift: v })} format={v => (v * 100).toFixed(0) + "%"}
              description="A single stock's own history is a weak guide to its future. Try the stagnation preset too." />
            <Slider label="Annual volatility" value={e.vol} min={0.10} max={0.60} step={0.01}
              onChange={v => setEquity({ vol: v })} format={v => (v * 100).toFixed(0) + "%"} />
            <Slider label="Evaluation horizon" value={profile.equityHorizonYears} min={3} max={20} step={1}
              onChange={v => update({ equityHorizonYears: v })} format={v => v + " yrs after graduating"} />
          </div>
        </Grid>
      </div>

      <Grid cols="repeat(auto-fit, minmax(190px, 1fr))" style={{ marginBottom: 18 }}>
        <MetricCard label="Shares sold" value={sale.shares.toLocaleString()}
          sub={`${f.pct(e.vestedShares > 0 ? sale.shares / e.vestedShares : 0)} of vested`} color={C.orange} />
        <MetricCard label="Tax paid at sale" value={f.money(sale.tax)}
          sub={`${e.saleIsLongTerm ? "Long-term" : "Short-term"} @ ${f.pct(sale.rate)}`} color={C.red} />
        <MetricCard label="Borrowing avoided" value={f.money(borrowingAvoided)}
          sub={`${f.money(paymentReduction)}/mo lower payment`} color={C.green} />
        <MetricCard label="Interest avoided" value={f.money(interestAvoided)} sub="Over the full loan term" color={C.green} />
        <MetricCard label="P(selling wins)" value={f.pct(winProb)}
          sub={`At year ${profile.equityHorizonYears}`} color={winProb > 0.5 ? C.green : C.orange} />
        <MetricCard label="Median outcome" value={f.compact(p50)}
          sub="Selling minus holding" color={p50 > 0 ? C.green : C.red} />
      </Grid>

      {sale.shares === 0 ? (
        <Callout tone="warn">
          Move <strong style={{ color: C.text }}>shares to sell now</strong> above zero to run the comparison.
        </Callout>
      ) : (
        <>
          <Grid cols="2fr 1fr" gap={16} style={{ marginBottom: 18 }}>
            <Card
              title="Distribution: money gained (+) or lost (−) by selling"
              subtitle={`Each bar counts simulated price paths. Positive means selling ${sale.shares.toLocaleString()} shares — and avoiding ${f.money(borrowingAvoided)} of debt — left you better off at year ${profile.equityHorizonYears}. Negative means the shares out-grew the interest you avoided. The axis is trimmed to the middle 98% so a single runaway path doesn\u2019t flatten everything else; those runs are still counted in the end bars and in the percentiles beside the chart.`}
            >
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={hist} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.borderSoft} />
                  <XAxis dataKey="value" tickFormatter={v => f.compact(v)} tick={{ fontSize: 9, fill: C.faint }} interval={Math.max(1, Math.floor(hist.length / 7))} />
                  <YAxis tick={{ fontSize: 9, fill: C.faint }} />
                  <Tooltip {...tooltipStyle} formatter={v => [v, "Paths"]} labelFormatter={v => f.compact(v)} />
                  <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                    {hist.map((d, i) => <Cell key={i} fill={d.value >= 0 ? C.green + "77" : C.red + "77"} />)}
                  </Bar>
                  <ReferenceLine x={0} stroke={C.yellow} strokeWidth={2} label={{ value: "break-even", fill: C.yellow, fontSize: 10, position: "top" }} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <div style={{ display: "grid", gap: 7, alignContent: "start" }}>
              {[
                ["P90 — stock stalls", p90, C.green],
                ["P75", p75, C.green],
                ["P50 — median", p50, C.yellow],
                ["P25", p25, C.orange],
                ["P10 — stock soars", p10, C.red],
                ["Mean", mean, C.muted],
              ].map(([label, v, col]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 8, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px" }}>
                  <span style={{ fontSize: 11, color: C.muted }}>{label}</span>
                  <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: col }}>{f.compact(v)}</span>
                </div>
              ))}
              <div style={{ fontSize: 10, color: C.faint, lineHeight: 1.6, marginTop: 4 }}>
                Share price at horizon: P10 {f.money(priceP10)} · P50 {f.money(priceP50)} · P90 {f.money(priceP90)}.
              </div>
            </div>
          </Grid>

          <Card
            title="How the trade-off evolves"
            subtitle="Median and P10–P90 band of the sell-minus-hold difference. The band widens with volatility; the loan side contributes no uncertainty at all."
            style={{ marginBottom: 18 }}
          >
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={band} margin={{ left: 12, right: 8 }}>
                <defs>
                  <linearGradient id="deltaBand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.orange} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={C.orange} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.borderSoft} />
                <XAxis dataKey="year" tick={{ fontSize: 10, fill: C.muted }}
                  tickFormatter={v => (v <= schoolYears ? `Sch ${v}` : `+${v - schoolYears}`)} />
                <YAxis tickFormatter={v => f.compact(v)} tick={{ fontSize: 10, fill: C.faint }} />
                <Tooltip {...tooltipStyle}
                  labelFormatter={v => (v <= schoolYears ? `School year ${v}` : `Year ${v - schoolYears} after graduating`)}
                  formatter={(v, n) => [n === "Win probability" ? f.pct(v) : f.compact(v), n]} />
                <Area type="monotone" dataKey="p90" stroke="none" fill="url(#deltaBand)" name="P90" />
                <Area type="monotone" dataKey="p10" stroke="none" fill={C.bg} name="P10" />
                <Line type="monotone" dataKey="p50" name="Median" stroke={C.orange} strokeWidth={2.5} dot={false} />
                <ReferenceLine y={0} stroke={C.yellow} strokeDasharray="5 3" />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Win probability over time" style={{ marginBottom: 18 }}>
            <DataTable
              headers={["Year", "P(selling wins)", "Median delta", "P10", "P90"]}
              rows={band.map(b => [
                b.year <= schoolYears ? `School ${b.year}` : `+${b.year - schoolYears}`,
                <span key="w" style={{ color: b.winProb > 0.5 ? C.green : C.orange, fontFamily: MONO }}>{f.pct(b.winProb)}</span>,
                <span key="m" style={{ color: b.p50 > 0 ? C.green : C.red, fontFamily: MONO }}>{f.compact(b.p50)}</span>,
                f.compact(b.p10), f.compact(b.p90),
              ])}
            />
          </Card>

          <Callout tone="warn" title="What this doesn't capture">
            Concentration risk is the big one: holding ties your tuition, your
            salary, and your net worth to a single employer at the same time.
            Also unmodelled — dividends, wash-sale rules, borrowing against the
            shares rather than selling, refinancing the loan later, and the
            possibility of selling in tranches instead of all at once.
          </Callout>
        </>
      )}
    </>
  );
}
