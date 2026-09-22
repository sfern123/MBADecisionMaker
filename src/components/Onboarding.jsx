import { useState } from "react";
import { C, MONO } from "../theme.js";
import { ALL_SCHOOLS, SCHOOL_DATA_AS_OF } from "../data/schools.js";
import { CAREER_PATHS } from "../data/careerPaths.js";
import { LOAN_PRESETS, CURRENCIES, FEDERAL_PROTECTIONS } from "../data/loanPresets.js";
import { NumberField, Select, Button, Callout, Grid, Badge, Toggle, makeFormatters } from "./ui.jsx";
import { netWorth, totalComp } from "../state/derived.js";
import {
  setComp, setSimpleNetWorth, setCash, setBrokerage, setRetirement,
  setScholarshipTotal, setUseFederal, scholarshipTotal, setDetailLevel,
  addEquityHolding, updateEquityHolding, addProperty, updateProperty,
} from "../state/actions.js";

/**
 * First-run setup.
 *
 * The first question is how complicated the user's finances actually are,
 * and everything after it branches on the answer. Someone with a salary and
 * a savings account should not be walked through a mortgage form, and
 * someone with a rental property and vesting equity should not be asked to
 * flatten all of it into one number.
 *
 * There is a visible escape hatch throughout — people who just want to poke
 * at the model shouldn't have to complete a form first.
 */
export default function Onboarding({ profile, update, onDone }) {
  const [step, setStep] = useState(0);
  const f = makeFormatters(profile.currency);
  const set = patch => update(patch);
  const detailed = profile.detailLevel === "detailed";
  const bs = profile.balanceSheet ?? {};
  const comp = profile.compensation ?? {};

  const steps = [];

  /* ── 0. Detail level ── */
  steps.push({
    title: "How complicated are your finances?",
    body: (
      <>
        <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, marginBottom: 18 }}>
          This decides how much of the tool you see. You can change it at any
          time, and switching never loses anything you've entered.
        </div>
        {[
          {
            id: "simple",
            title: "Fairly simple",
            desc: "A salary, some savings, maybe a retirement account. You'd describe your net worth as one number.",
            time: "about 2 minutes",
          },
          {
            id: "detailed",
            title: "More going on",
            desc: "Some mix of company stock, property, a bonus that swings, or debts you're carrying. You'd rather itemise it than average it.",
            time: "about 5 minutes",
          },
        ].map(opt => {
          const on = profile.detailLevel === opt.id;
          return (
            <button key={opt.id} onClick={() => set(setDetailLevel(profile, opt.id))}
              style={{
                display: "block", width: "100%", textAlign: "left", cursor: "pointer",
                background: on ? C.accent + "14" : "transparent",
                border: `1px solid ${on ? C.accent : C.border}`,
                borderRadius: 10, padding: "14px 16px", marginBottom: 10,
              }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: on ? C.accent : C.text }}>{opt.title}</span>
                <span style={{ fontSize: 10, color: C.faint }}>{opt.time}</span>
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 5, lineHeight: 1.5 }}>{opt.desc}</div>
            </button>
          );
        })}
      </>
    ),
  });

  /* ── 1. Programme ── */
  steps.push({
    title: "Which programme?",
    body: (
      <>
        <Select
          label="Target school"
          value={profile.schoolId}
          onChange={v => {
            const school = ALL_SCHOOLS.find(s => s.id === v);
            set({ schoolId: v, currency: school?.currency ?? profile.currency });
          }}
          options={ALL_SCHOOLS.map(s => ({
            value: s.id,
            label: `${s.name}${s.programYears !== 2 ? ` (${s.programYears}-year)` : ""}`,
          }))}
          hint={`Cost figures are for ${SCHOOL_DATA_AS_OF} and are editable later. You can compare several schools once you're in.`}
        />
        <Select
          label="Currency"
          value={profile.currency}
          onChange={v => set({ currency: v })}
          options={CURRENCIES.map(c => ({ value: c.code, label: `${c.symbol} ${c.label}` }))}
          hint="Display only — no exchange-rate conversion is applied."
        />
        <NumberField
          label="Scholarship awarded (total)"
          value={scholarshipTotal(profile)}
          onChange={v => set(setScholarshipTotal(profile, v))}
          step={1000} min={0} prefix={f.sym}
          hint="Across the whole programme. Enter 0 if you don't know yet."
        />
      </>
    ),
  });

  /* ── 2. Income ── */
  steps.push({
    title: "What do you earn now?",
    body: (
      <>
        <Callout tone="info" style={{ marginBottom: 16 }}>
          These numbers stay on this device. The app has no backend and makes
          no network requests — nothing you type is transmitted anywhere.
        </Callout>

        {detailed ? (
          <>
            <Grid cols="1fr 1fr" gap={14}>
              <NumberField label="Base salary" value={comp.base ?? 0}
                onChange={v => set(setComp(profile, { base: v }))} step={5000} min={0} prefix={f.sym} />
              <NumberField label="Annual bonus" value={comp.bonus ?? 0}
                onChange={v => set(setComp(profile, { bonus: v }))} step={5000} min={0} prefix={f.sym}
                hint="Typical year, not your best one." />
              <NumberField label="Annual equity grant" value={comp.equityAnnual ?? 0}
                onChange={v => set(setComp(profile, { equityAnnual: v }))} step={5000} min={0} prefix={f.sym}
                hint="Value of stock granted per year. Counted as pay AND as shares that vest — enter it once here." />
              <NumberField label="Effective tax rate" value={Math.round((profile.taxRate ?? 0.32) * 100)}
                onChange={v => set({ taxRate: v / 100 })} suffix="%" step={1} min={0} max={60}
                hint="Federal + state/local + payroll combined." />
            </Grid>
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 12, color: C.muted }}>
              Total compensation:{" "}
              <span style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700, color: C.accent }}>
                {f.money(totalComp(comp))}
              </span>
            </div>
          </>
        ) : (
          <Grid cols="1fr 1fr" gap={14}>
            <NumberField label="Total annual compensation" value={comp.base ?? 0}
              onChange={v => set(setComp(profile, { base: v, bonus: 0, equityAnnual: 0 }))}
              step={5000} min={0} prefix={f.sym}
              hint="Everything before tax — salary, bonus, any stock." />
            <NumberField label="Effective tax rate" value={Math.round((profile.taxRate ?? 0.32) * 100)}
              onChange={v => set({ taxRate: v / 100 })} suffix="%" step={1} min={0} max={60}
              hint="Federal + state/local + payroll. Often 28–38% at MBA salary levels." />
          </Grid>
        )}
      </>
    ),
  });

  /* ── 3. Wealth ── */
  steps.push({
    title: detailed ? "What do you own and owe?" : "What have you saved?",
    body: detailed ? (
      <>
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, marginBottom: 16 }}>
          Rough figures are fine — you can refine any of this later in
          Settings. Leave anything that doesn't apply at zero.
        </div>
        <Grid cols="1fr 1fr" gap={14}>
          <NumberField label="Cash / savings" value={bs.cash ?? 0}
            onChange={v => set(setCash(profile, v))} step={1000} min={0} prefix={f.sym} />
          <NumberField label="Brokerage / investments" value={bs.brokerage?.value ?? 0}
            onChange={v => set(setBrokerage(profile, { value: v }))} step={5000} min={0} prefix={f.sym} />
          <NumberField label="Retirement — tax-deferred" value={bs.retirement?.preTax ?? 0}
            onChange={v => set(setRetirement(profile, { preTax: v }))} step={5000} min={0} prefix={f.sym}
            hint="US: traditional 401(k) / IRA." />
          <NumberField label="Retirement — tax-free" value={bs.retirement?.roth ?? 0}
            onChange={v => set(setRetirement(profile, { roth: v }))} step={5000} min={0} prefix={f.sym}
            hint="US: Roth." />
        </Grid>

        <AddOn
          label="I hold company stock or vesting RSUs"
          on={(bs.equityHoldings ?? []).length > 0}
          onToggle={on => {
            if (on) set(addEquityHolding(profile));
            else set({ balanceSheet: { ...bs, equityHoldings: [] } });
          }}
        >
          {(bs.equityHoldings ?? [])[0] && (
            <Grid cols="1fr 1fr" gap={12}>
              <NumberField label="Share price" value={bs.equityHoldings[0].price}
                onChange={v => set(updateEquityHolding(profile, bs.equityHoldings[0].id, { price: v }))}
                step={1} min={0} prefix={f.sym} />
              <NumberField label="Cost basis / share" value={bs.equityHoldings[0].costBasis}
                onChange={v => set(updateEquityHolding(profile, bs.equityHoldings[0].id, { costBasis: v }))}
                step={1} min={0} prefix={f.sym} />
              <NumberField label="Vested shares" value={bs.equityHoldings[0].vested}
                onChange={v => set(updateEquityHolding(profile, bs.equityHoldings[0].id, { vested: v }))}
                step={10} min={0} hint="Sellable today." />
              <NumberField label="Unvested shares" value={bs.equityHoldings[0].unvested}
                onChange={v => set(updateEquityHolding(profile, bs.equityHoldings[0].id, { unvested: v }))}
                step={10} min={0} hint="Not counted in net worth — not yours yet." />
            </Grid>
          )}
        </AddOn>

        <AddOn
          label="I own property"
          on={(bs.properties ?? []).length > 0}
          onToggle={on => {
            if (on) set(addProperty(profile));
            else set({ balanceSheet: { ...bs, properties: [] } });
          }}
        >
          {(bs.properties ?? [])[0] && (
            <Grid cols="1fr 1fr" gap={12}>
              <NumberField label="Current value" value={bs.properties[0].value}
                onChange={v => set(updateProperty(profile, bs.properties[0].id, { value: v }))}
                step={10000} min={0} prefix={f.sym} />
              <NumberField label="Mortgage balance" value={bs.properties[0].mortgageBalance}
                onChange={v => set(updateProperty(profile, bs.properties[0].id, { mortgageBalance: v }))}
                step={10000} min={0} prefix={f.sym} />
              <NumberField label="Monthly payment" value={bs.properties[0].monthlyPayment}
                onChange={v => set(updateProperty(profile, bs.properties[0].id, { monthlyPayment: v }))}
                step={100} min={0} prefix={f.sym} />
              <NumberField label="Monthly rent received" value={bs.properties[0].monthlyRent}
                onChange={v => set(updateProperty(profile, bs.properties[0].id, { monthlyRent: v }))}
                step={100} min={0} prefix={f.sym} hint="Zero if you live in it." />
            </Grid>
          )}
        </AddOn>

        <div style={{ background: C.bg, border: `1px solid ${C.accent}44`, borderRadius: 8, padding: "12px 16px", marginTop: 6 }}>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: C.muted }}>Net worth</div>
          <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: C.accent }}>
            {f.money(netWorth(bs))}
          </div>
          <div style={{ fontSize: 10, color: C.faint, marginTop: 3 }}>
            Calculated from the above — you never type this directly, so it can't disagree with itself.
          </div>
        </div>
      </>
    ) : (
      <>
        <Grid cols="1fr 1fr" gap={14}>
          <NumberField label="Total net worth" value={netWorth(bs)}
            onChange={v => set(setSimpleNetWorth(profile, v))} step={5000} prefix={f.sym}
            hint="Everything you own, less what you owe." />
          <NumberField label="Of that, cash you could use for tuition" value={bs.cash ?? 0}
            onChange={v => set(setCash(profile, v))} step={1000} min={0} prefix={f.sym}
            hint="Liquid savings, not locked-up retirement money." />
        </Grid>
        <Callout tone="info">
          Got company stock, a property, or debts you're carrying? Choose{" "}
          <strong style={{ color: C.text }}>More going on</strong> at step one and
          the tool will model them properly instead of averaging them in.
        </Callout>
      </>
    ),
  });

  /* ── 4. Borrowing ── */
  const useFederal = profile.funding?.useFederal ?? true;
  steps.push({
    title: "How will you borrow?",
    body: (
      <>
        <Toggle
          label="I'll use federal student loans"
          checked={useFederal}
          onChange={v => set(setUseFederal(profile, v))}
          hint="Turn this off if you're ineligible, outside the US, or borrowing privately by choice."
        />

        {!useFederal && (
          <Callout tone="warn" title="What you'd be giving up" style={{ marginBottom: 14 }}>
            Private loans can be cheaper month to month if your credit is
            strong — but these federal protections have no private equivalent,
            and they only matter in the situations you can't plan for:
            <div style={{ marginTop: 8 }}>
              {FEDERAL_PROTECTIONS.map(p => (
                <div key={p.label} style={{ marginBottom: 4 }}>
                  <strong style={{ color: C.text }}>{p.label}</strong> — {p.detail}
                </div>
              ))}
            </div>
          </Callout>
        )}

        {useFederal && (
          <Select
            label="Which federal rules apply?"
            value={profile.loanPresetId}
            onChange={v => {
              const p = LOAN_PRESETS.find(x => x.id === v);
              set({
                loanPresetId: v,
                loan: {
                  federalPerYear: p.federalPerYear, federalLifetimeCap: p.federalLifetimeCap,
                  federalRate: p.federalRate, termMonths: p.termMonths, graceMonths: p.graceMonths,
                },
              });
            }}
            options={LOAN_PRESETS.map(p => ({ value: p.id, label: p.label }))}
            hint={LOAN_PRESETS.find(p => p.id === profile.loanPresetId)?.description}
          />
        )}

        <Toggle
          label="I already have a quoted APR"
          checked={profile.useDirectApr}
          onChange={v => set({ useDirectApr: v })}
          hint="Use a real lender quote instead of estimating from your credit score."
        />
        {profile.useDirectApr ? (
          <NumberField label="Your private loan APR" value={+((profile.directApr ?? 0.085) * 100).toFixed(2)}
            onChange={v => set({ directApr: v / 100 })} suffix="%" step={0.05} min={0} max={30} />
        ) : (
          <NumberField label="Credit score" value={profile.creditScore}
            onChange={v => set({ creditScore: v })} step={10} min={500} max={850}
            hint="Used only to estimate a private APR. A real quote is always better." />
        )}
      </>
    ),
  });

  /* ── 5. Career ── */
  steps.push({
    title: "Where might you end up?",
    body: (
      <>
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, marginBottom: 14 }}>
          Pick the paths you'd realistically consider and weight them by how
          likely each feels. They're normalised, so they needn't add to 100.
        </div>
        <div style={{ maxHeight: 300, overflowY: "auto", paddingRight: 6 }}>
          {CAREER_PATHS.map(p => {
            const weight = profile.pathWeights[p.id] ?? 0;
            return (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: `1px solid ${C.borderSoft}` }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: weight > 0 ? C.text : C.muted, display: "flex", alignItems: "center", gap: 6 }}>
                    {p.label}
                    {!p.grounded && <Badge tone="muted" title="Reasoned industry estimate rather than a published employment-report figure.">est</Badge>}
                  </div>
                  <div style={{ fontSize: 10, color: C.fainter }}>~{(p.year1 / 1000).toFixed(0)}k year 1</div>
                </div>
                <input
                  type="number" value={weight} min={0} max={100} step={5}
                  aria-label={`Weight for ${p.label}`}
                  onChange={e => set({ pathWeights: { ...profile.pathWeights, [p.id]: Number(e.target.value) || 0 } })}
                  style={{ width: 62, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, padding: "6px 8px", fontSize: 12, textAlign: "right" }}
                />
              </div>
            );
          })}
        </div>
      </>
    ),
  });

  const current = steps[step];
  const last = step === steps.length - 1;

  return (
    <div style={{ position: "fixed", inset: 0, background: "#04070ceb", zIndex: 100, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "40px 20px" }}>
      <div style={{ width: "100%", maxWidth: 640, background: C.panel, border: `1px solid ${C.accent}44`, borderRadius: 14, padding: "26px 28px", boxShadow: "0 20px 60px #0008" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6, gap: 12 }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", color: C.accent }}>
            Setup · step {step + 1} of {steps.length}
          </div>
          <button onClick={onDone}
            style={{ background: "none", border: "none", color: C.fainter, fontSize: 11, cursor: "pointer", textDecoration: "underline" }}>
            skip — explore with sample numbers
          </button>
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 18 }}>{current.title}</h2>

        <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
          {steps.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= step ? C.accent : C.borderSoft }} />
          ))}
        </div>

        {current.body}

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 22 }}>
          <Button onClick={() => setStep(s => Math.max(0, s - 1))}>{step === 0 ? " " : "← Back"}</Button>
          <Button variant="primary" onClick={() => (last ? onDone() : setStep(s => s + 1))}>
            {last ? "See my numbers →" : "Next →"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** An optional section that only reveals its fields once switched on. */
function AddOn({ label, on, onToggle, children }) {
  return (
    <div style={{ border: `1px solid ${on ? C.border : C.borderSoft}`, borderRadius: 9, padding: on ? "12px 14px" : "4px 14px", marginBottom: 10, background: on ? C.bg : "transparent" }}>
      <Toggle label={label} checked={on} onChange={onToggle} />
      {on && <div style={{ marginTop: 8 }}>{children}</div>}
    </div>
  );
}
