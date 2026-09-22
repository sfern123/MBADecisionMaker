import { useState } from "react";
import { C } from "../theme.js";
import { ALL_SCHOOLS, SCHOOL_DATA_AS_OF } from "../data/schools.js";
import { CAREER_PATHS } from "../data/careerPaths.js";
import { LOAN_PRESETS, CURRENCIES } from "../data/loanPresets.js";
import { NumberField, Select, Button, Callout, Grid, Badge, Toggle } from "./ui.jsx";

/**
 * First-run setup. Four short steps, every field pre-filled with a neutral
 * placeholder, and a visible escape hatch -- someone who just wants to poke
 * at the model shouldn't be forced through a form first.
 */
export default function Onboarding({ profile, update, onDone }) {
  const [step, setStep] = useState(0);
  const set = patch => update(patch);

  const steps = [
    {
      title: "Which programme?",
      body: (
        <>
          <Select
            label="Target school"
            value={profile.schoolId}
            onChange={v => {
              const school = ALL_SCHOOLS.find(s => s.id === v);
              set({
                schoolId: v,
                currency: school?.currency ?? profile.currency,
              });
            }}
            options={ALL_SCHOOLS.map(s => ({
              value: s.id,
              label: `${s.name}${s.programYears !== 2 ? ` (${s.programYears}-year)` : ""}`,
            }))}
            hint={`Cost figures are for ${SCHOOL_DATA_AS_OF} and are editable later. You can compare several schools once you are in.`}
          />
          <Select
            label="Currency"
            value={profile.currency}
            onChange={v => set({ currency: v })}
            options={CURRENCIES.map(c => ({ value: c.code, label: `${c.symbol} ${c.label}` }))}
            hint="Display only -- no exchange-rate conversion is applied."
          />
          <NumberField
            label="Scholarship / grant awarded"
            value={profile.scholarship}
            onChange={v => set({ scholarship: v })}
            step={1000} min={0}
            hint="Total across the whole programme. Enter 0 if you don't know yet."
          />
        </>
      ),
    },
    {
      title: "Where are you starting from?",
      body: (
        <>
          <Callout tone="info" style={{ marginBottom: 16 }}>
            These numbers stay on this device. The app has no backend and makes
            no network requests -- nothing you type here is transmitted anywhere.
          </Callout>
          <Grid cols="1fr 1fr" gap={14}>
            <NumberField
              label="Current annual compensation"
              value={profile.currentComp} onChange={v => set({ currentComp: v })}
              step={5000} min={0}
              hint="Base + bonus + equity. This is your opportunity cost."
            />
            <NumberField
              label="Current net worth"
              value={profile.currentNetWorth} onChange={v => set({ currentNetWorth: v })}
              step={5000}
              hint="All assets minus all debts. Negative is fine."
            />
            <NumberField
              label="Cash available for tuition"
              value={profile.totalSavings} onChange={v => set({ totalSavings: v })}
              step={5000} min={0}
              hint="Liquid savings you could put toward school."
            />
            <NumberField
              label="Effective tax rate"
              value={Math.round(profile.taxRate * 100)}
              onChange={v => set({ taxRate: v / 100 })}
              suffix="%" step={1} min={0} max={60}
              hint="Federal + state/local + payroll combined. Often 28-38% at MBA salary levels."
            />
          </Grid>
        </>
      ),
    },
    {
      title: "How will you borrow?",
      body: (
        <>
          <Select
            label="Loan rules"
            value={profile.loanPresetId}
            onChange={v => {
              const p = LOAN_PRESETS.find(x => x.id === v);
              set({
                loanPresetId: v,
                loan: {
                  federalPerYear: p.federalPerYear,
                  federalLifetimeCap: p.federalLifetimeCap,
                  federalRate: p.federalRate,
                  termMonths: p.termMonths,
                  graceMonths: p.graceMonths,
                },
              });
            }}
            options={LOAN_PRESETS.map(p => ({ value: p.id, label: p.label }))}
            hint={LOAN_PRESETS.find(p => p.id === profile.loanPresetId)?.description}
          />
          <Toggle
            label="I already have a quoted APR"
            checked={profile.useDirectApr}
            onChange={v => set({ useDirectApr: v })}
            hint="Use a real lender quote instead of estimating a rate from your credit score."
          />
          {profile.useDirectApr ? (
            <NumberField
              label="Your private loan APR"
              value={+(profile.directApr * 100).toFixed(2)}
              onChange={v => set({ directApr: v / 100 })}
              suffix="%" step={0.05} min={0} max={30}
            />
          ) : (
            <NumberField
              label="Credit score"
              value={profile.creditScore} onChange={v => set({ creditScore: v })}
              step={10} min={500} max={850}
              hint="Used only to estimate a private APR. A real quote is always better."
            />
          )}
        </>
      ),
    },
    {
      title: "Where might you end up?",
      body: (
        <>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, marginBottom: 14 }}>
            Pick the paths you'd realistically consider and weight them by how
            likely each feels. Weights don't need to add to 100 -- they're
            normalised for you. You can fine-tune the salary assumptions later.
          </div>
          <div style={{ maxHeight: 300, overflowY: "auto", paddingRight: 6 }}>
            {CAREER_PATHS.map(p => {
              const weight = profile.pathWeights[p.id] ?? 0;
              return (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: `1px solid ${C.borderSoft}` }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: weight > 0 ? C.text : C.muted, display: "flex", alignItems: "center", gap: 6 }}>
                      {p.label}
                      {!p.grounded && <Badge tone="muted" title="Reasoned industry estimate rather than a figure from a published employment report.">est</Badge>}
                    </div>
                    <div style={{ fontSize: 10, color: C.fainter, fontFamily: "inherit" }}>
                      ~{(p.year1 / 1000).toFixed(0)}k year 1
                    </div>
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
    },
  ];

  const current = steps[step];
  const last = step === steps.length - 1;

  return (
    <div style={{ position: "fixed", inset: 0, background: "#04070ceb", zIndex: 100, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "40px 20px" }}>
      <div style={{ width: "100%", maxWidth: 620, background: C.panel, border: `1px solid ${C.accent}44`, borderRadius: 14, padding: "26px 28px", boxShadow: `0 20px 60px #0008` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", color: C.accent }}>
            Setup · step {step + 1} of {steps.length}
          </div>
          <button
            onClick={onDone}
            style={{ background: "none", border: "none", color: C.fainter, fontSize: 11, cursor: "pointer", textDecoration: "underline" }}
          >
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
          <Button onClick={() => setStep(s => Math.max(0, s - 1))} variant="default">
            {step === 0 ? " " : "← Back"}
          </Button>
          <Button
            variant="primary"
            onClick={() => (last ? onDone() : setStep(s => s + 1))}
          >
            {last ? "See my numbers →" : "Next →"}
          </Button>
        </div>
      </div>
    </div>
  );
}
