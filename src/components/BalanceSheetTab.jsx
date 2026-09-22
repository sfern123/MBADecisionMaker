import { C, MONO } from "../theme.js";
import { NumberField, TextField, Select, Button, Callout, Grid, Badge } from "./ui.jsx";
import {
  netWorth, netWorthBreakdown, liquidAssets, retirementTotal,
  vestedEquityValue, unvestedEquityValue, propertyEquity,
  propertyMonthlyCashFlow, monthlyDebtPayments, otherAssetsTotal, nonMortgageDebt,
} from "../state/derived.js";
import {
  setCash, setBrokerage, setRetirement, setSimpleNetWorth, setDetailLevel,
  addEquityHolding, updateEquityHolding, removeEquityHolding,
  addProperty, updateProperty, removeProperty,
  addDebt, updateDebt, removeDebt,
  addOtherAsset, updateOtherAsset, removeOtherAsset,
} from "../state/actions.js";

/**
 * The balance sheet editor — the one place wealth is entered.
 *
 * Sections appear only once you add them, so someone with no property never
 * scrolls past a mortgage form. Net worth at the top is computed from what is
 * below it and is never directly editable in detailed mode: that is what
 * makes it impossible for two tabs to disagree about how much money you have.
 */
export default function BalanceSheetTab({ profile, set, f }) {
  const bs = profile.balanceSheet ?? {};
  const detailed = profile.detailLevel === "detailed";

  if (!detailed) {
    return (
      <>
        <Callout tone="info" title="You're in simple mode" style={{ marginBottom: 16 }}>
          Your finances are tracked as a single total. Switch to detailed to
          itemise cash, investments, company stock, property and debts — nothing
          you've entered is lost either way.
        </Callout>

        <NumberField label="Total net worth" value={netWorth(bs)}
          onChange={v => set(setSimpleNetWorth(profile, v))} step={5000} prefix={f.sym}
          hint="Everything you own, less what you owe." />
        <NumberField label="Cash available for tuition" value={bs.cash ?? 0}
          onChange={v => set(setCash(profile, v))} step={1000} min={0} prefix={f.sym}
          hint="Liquid savings only — not locked-up retirement money." />

        <Button variant="primary" onClick={() => set(setDetailLevel(profile, "detailed"))}>
          Switch to detailed →
        </Button>
      </>
    );
  }

  const holdings = bs.equityHoldings ?? [];
  const properties = bs.properties ?? [];
  const debts = bs.debts ?? [];
  const others = bs.otherAssets ?? [];
  const cashFlow = propertyMonthlyCashFlow(bs);

  return (
    <>
      {/* Running total */}
      <div style={{ background: `linear-gradient(135deg, ${C.accent}12, ${C.accent2}06)`, border: `1px solid ${C.accent}55`, borderRadius: 11, padding: "14px 18px", marginBottom: 16 }}>
        <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: C.muted }}>Net worth</div>
        <div style={{ fontFamily: MONO, fontSize: 26, fontWeight: 700, color: C.accent }}>{f.money(netWorth(bs))}</div>
        <div style={{ fontSize: 11, color: C.faint, marginTop: 6, lineHeight: 1.7 }}>
          {netWorthBreakdown(bs).map(r => (
            <div key={r.key} style={{ display: "flex", justifyContent: "space-between" }}>
              <span>{r.label}</span>
              <span style={{ fontFamily: MONO, color: r.value < 0 ? C.red : C.text }}>{f.money(r.value)}</span>
            </div>
          ))}
        </div>
        {unvestedEquityValue(bs) > 0 && (
          <div style={{ fontSize: 10, color: C.yellow, marginTop: 8, lineHeight: 1.5 }}>
            Plus {f.money(unvestedEquityValue(bs))} unvested — deliberately excluded. It is
            pay you haven't received, contingent on staying, which is exactly the wrong thing
            to count when weighing whether to leave.
          </div>
        )}
        <Button size="sm" onClick={() => set(setDetailLevel(profile, "simple"))}>
          Switch to simple view
        </Button>
      </div>

      {/* Always-present core */}
      <Section title="Cash and investments">
        <Grid cols="1fr 1fr" gap={12}>
          <NumberField label="Cash / savings" value={bs.cash ?? 0}
            onChange={v => set(setCash(profile, v))} step={1000} min={0} prefix={f.sym} />
          <NumberField label="Brokerage value" value={bs.brokerage?.value ?? 0}
            onChange={v => set(setBrokerage(profile, { value: v }))} step={5000} min={0} prefix={f.sym} />
          <NumberField label="Brokerage cost basis" value={bs.brokerage?.costBasis ?? 0}
            onChange={v => set(setBrokerage(profile, { costBasis: v }))} step={5000} min={0} prefix={f.sym}
            hint="What you paid. A lower basis means more tax when you sell." />
          <div style={{ alignSelf: "end", paddingBottom: 14, fontSize: 11, color: C.faint }}>
            Liquid total: <span style={{ fontFamily: MONO, color: C.text }}>{f.money(liquidAssets(bs))}</span>
          </div>
        </Grid>
      </Section>

      <Section title="Retirement accounts" total={f.money(retirementTotal(bs))}>
        <Grid cols="1fr 1fr 1fr" gap={12}>
          <NumberField label="Tax-deferred" value={bs.retirement?.preTax ?? 0}
            onChange={v => set(setRetirement(profile, { preTax: v }))} step={5000} min={0} prefix={f.sym}
            hint="US: traditional 401(k)/IRA." />
          <NumberField label="Tax-free" value={bs.retirement?.roth ?? 0}
            onChange={v => set(setRetirement(profile, { roth: v }))} step={5000} min={0} prefix={f.sym}
            hint="US: Roth." />
          <NumberField label="After-tax" value={bs.retirement?.afterTax ?? 0}
            onChange={v => set(setRetirement(profile, { afterTax: v }))} step={5000} min={0} prefix={f.sym}
            hint="US: after-tax 401(k)." />
        </Grid>
      </Section>

      {/* Company equity */}
      <Section
        title="Company equity"
        total={holdings.length ? `${f.money(vestedEquityValue(bs))} vested` : null}
        onAdd={() => set(addEquityHolding(profile))}
        addLabel="+ Add holding"
        empty={!holdings.length && "Stock or RSUs from an employer. Adding one unlocks the Equity tab."}
      >
        {holdings.map(h => (
          <Row key={h.id} onRemove={() => set(removeEquityHolding(profile, h.id))}>
            <TextField label="Name" value={h.label}
              onChange={v => set(updateEquityHolding(profile, h.id, { label: v }))} />
            <Grid cols="1fr 1fr" gap={12}>
              <NumberField label="Share price" value={h.price}
                onChange={v => set(updateEquityHolding(profile, h.id, { price: v }))} step={1} min={0} prefix={f.sym} />
              <NumberField label="Cost basis / share" value={h.costBasis}
                onChange={v => set(updateEquityHolding(profile, h.id, { costBasis: v }))} step={1} min={0} prefix={f.sym} />
              <NumberField label="Vested shares" value={h.vested}
                onChange={v => set(updateEquityHolding(profile, h.id, { vested: v }))} step={10} min={0}
                hint={`Worth ${f.money(h.vested * h.price)} — counts toward net worth.`} />
              <NumberField label="Unvested shares" value={h.unvested}
                onChange={v => set(updateEquityHolding(profile, h.id, { unvested: v }))} step={10} min={0}
                hint={`Worth ${f.money(h.unvested * h.price)} — excluded from net worth.`} />
              <NumberField label="Vesting period" value={h.vestingYears}
                onChange={v => set(updateEquityHolding(profile, h.id, { vestingYears: v }))} step={1} min={1} max={10} suffix="yrs" />
              <NumberField label="Expected return" value={+(h.drift * 100).toFixed(1)}
                onChange={v => set(updateEquityHolding(profile, h.id, { drift: v / 100 }))} suffix="%" step={1} min={-30} max={60} />
            </Grid>
          </Row>
        ))}
      </Section>

      {/* Property */}
      <Section
        title="Property"
        total={properties.length
          ? `${f.money(propertyEquity(bs))} equity · ${cashFlow >= 0 ? "+" : ""}${f.money(cashFlow)}/mo`
          : null}
        onAdd={() => set(addProperty(profile))}
        addLabel="+ Add property"
        empty={!properties.length && "A home you live in, or a rental. Both affect the picture — differently."}
      >
        {properties.map(pr => {
          const equity = (pr.value ?? 0) - (pr.mortgageBalance ?? 0);
          const flow = (pr.monthlyRent ?? 0) - (pr.monthlyExpenses ?? 0) - (pr.monthlyPayment ?? 0);
          return (
            <Row key={pr.id} onRemove={() => set(removeProperty(profile, pr.id))}>
              <Grid cols="2fr 1fr" gap={12}>
                <TextField label="Name" value={pr.label}
                  onChange={v => set(updateProperty(profile, pr.id, { label: v }))} />
                <Select label="Type" value={pr.isPrimary ? "primary" : "rental"}
                  onChange={v => set(updateProperty(profile, pr.id, { isPrimary: v === "primary" }))}
                  options={[{ value: "primary", label: "I live here" }, { value: "rental", label: "Rental" }]} />
              </Grid>
              <Grid cols="1fr 1fr" gap={12}>
                <NumberField label="Current value" value={pr.value}
                  onChange={v => set(updateProperty(profile, pr.id, { value: v }))} step={10000} min={0} prefix={f.sym} />
                <NumberField label="Appreciation" value={+((pr.appreciation ?? 0) * 100).toFixed(1)}
                  onChange={v => set(updateProperty(profile, pr.id, { appreciation: v / 100 }))} suffix="%" step={0.5} min={-10} max={20}
                  hint="Long-run annual. Historically ~3%." />
                <NumberField label="Mortgage balance" value={pr.mortgageBalance}
                  onChange={v => set(updateProperty(profile, pr.id, { mortgageBalance: v }))} step={10000} min={0} prefix={f.sym} />
                <NumberField label="Mortgage rate" value={+((pr.mortgageRate ?? 0) * 100).toFixed(2)}
                  onChange={v => set(updateProperty(profile, pr.id, { mortgageRate: v / 100 }))} suffix="%" step={0.125} min={0} max={20} />
                <NumberField label="Monthly payment" value={pr.monthlyPayment}
                  onChange={v => set(updateProperty(profile, pr.id, { monthlyPayment: v }))} step={100} min={0} prefix={f.sym}
                  hint="Principal, interest, tax and insurance." />
                <NumberField label="Monthly rent" value={pr.monthlyRent}
                  onChange={v => set(updateProperty(profile, pr.id, { monthlyRent: v }))} step={100} min={0} prefix={f.sym}
                  hint="Zero if you live in it." />
                <NumberField label="Monthly expenses" value={pr.monthlyExpenses}
                  onChange={v => set(updateProperty(profile, pr.id, { monthlyExpenses: v }))} step={50} min={0} prefix={f.sym}
                  hint="Maintenance, HOA, management." />
              </Grid>
              <div style={{ display: "flex", gap: 16, fontSize: 11, color: C.faint, paddingTop: 4 }}>
                <span>Equity <span style={{ fontFamily: MONO, color: equity >= 0 ? C.green : C.red }}>{f.money(equity)}</span></span>
                <span>Cash flow <span style={{ fontFamily: MONO, color: flow >= 0 ? C.green : C.orange }}>{flow >= 0 ? "+" : ""}{f.money(flow)}/mo</span></span>
                {flow < 0 && <Badge tone="warn" title="Normal for a home you live in — it is an asset that costs you money monthly.">outflow</Badge>}
              </div>
            </Row>
          );
        })}
      </Section>

      {/* Other assets */}
      <Section
        title="Other assets"
        total={others.length ? f.money(otherAssetsTotal(bs)) : null}
        onAdd={() => set(addOtherAsset(profile))}
        addLabel="+ Add asset"
        empty={!others.length && "Anything else of value — a business stake, crypto, collectibles."}
      >
        {others.map(a => (
          <Row key={a.id} onRemove={() => set(removeOtherAsset(profile, a.id))}>
            <Grid cols="2fr 1fr 1fr" gap={12}>
              <TextField label="Name" value={a.label}
                onChange={v => set(updateOtherAsset(profile, a.id, { label: v }))} />
              <NumberField label="Value" value={a.value}
                onChange={v => set(updateOtherAsset(profile, a.id, { value: v }))} step={1000} min={0} prefix={f.sym} />
              <NumberField label="Growth" value={+((a.growthRate ?? 0) * 100).toFixed(1)}
                onChange={v => set(updateOtherAsset(profile, a.id, { growthRate: v / 100 }))} suffix="%" step={0.5} min={-20} max={40} />
            </Grid>
          </Row>
        ))}
      </Section>

      {/* Debts */}
      <Section
        title="Other debts"
        total={debts.length ? `${f.money(nonMortgageDebt(bs))} · ${f.money(monthlyDebtPayments(bs))}/mo` : null}
        onAdd={() => set(addDebt(profile))}
        addLabel="+ Add debt"
        empty={!debts.length && "Existing student loans, a car, credit cards. These payments compete with a new loan payment."}
      >
        {debts.map(d => (
          <Row key={d.id} onRemove={() => set(removeDebt(profile, d.id))}>
            <Grid cols="2fr 1fr 1fr 1fr" gap={12}>
              <TextField label="Name" value={d.label}
                onChange={v => set(updateDebt(profile, d.id, { label: v }))} />
              <NumberField label="Balance" value={d.balance}
                onChange={v => set(updateDebt(profile, d.id, { balance: v }))} step={1000} min={0} prefix={f.sym} />
              <NumberField label="Rate" value={+((d.rate ?? 0) * 100).toFixed(2)}
                onChange={v => set(updateDebt(profile, d.id, { rate: v / 100 }))} suffix="%" step={0.25} min={0} max={40} />
              <NumberField label="Monthly" value={d.monthlyPayment}
                onChange={v => set(updateDebt(profile, d.id, { monthlyPayment: v }))} step={50} min={0} prefix={f.sym} />
            </Grid>
          </Row>
        ))}
        {debts.length > 0 && (
          <Callout tone="warn">
            {f.money(monthlyDebtPayments(bs))} a month is already committed before
            any student-loan payment. The affordability figures on the Financing
            tab account for this.
          </Callout>
        )}
      </Section>
    </>
  );
}

function Section({ title, total, children, onAdd, addLabel, empty }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid ${C.border}` }}>
        <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: C.accent, fontWeight: 600 }}>{title}</span>
        {total && <span style={{ fontFamily: MONO, fontSize: 12, color: C.muted }}>{total}</span>}
      </div>
      {empty && <div style={{ fontSize: 11, color: C.faint, lineHeight: 1.5, marginBottom: 10 }}>{empty}</div>}
      {children}
      {onAdd && <Button size="sm" onClick={onAdd}>{addLabel}</Button>}
    </div>
  );
}

function Row({ children, onRemove }) {
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 9, padding: 13, marginBottom: 10, background: C.bg }}>
      {children}
      <div style={{ textAlign: "right" }}>
        <button onClick={onRemove}
          style={{ background: "none", border: "none", color: C.red, fontSize: 11, cursor: "pointer", textDecoration: "underline" }}>
          remove
        </button>
      </div>
    </div>
  );
}
