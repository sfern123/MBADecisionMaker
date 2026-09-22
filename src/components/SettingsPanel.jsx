import { useState, useRef } from "react";
import { C, MONO } from "../theme.js";
import { ALL_SCHOOLS, CUSTOM_SCHOOL, SCHOOL_DATA_AS_OF, totalCoa } from "../data/schools.js";
import { CAREER_DATA_AS_OF, blankCustomPath } from "../data/careerPaths.js";
import { resolvePaths } from "../state/defaults.js";
import { LOAN_PRESETS, CURRENCIES, TERM_OPTIONS, FEDERAL_PROTECTIONS } from "../data/loanPresets.js";
import BalanceSheetTab from "./BalanceSheetTab.jsx";
import { totalComp } from "../state/derived.js";
import { setComp, setDetailLevel, setUseFederal } from "../state/actions.js";
import { STATE_PRESETS, TAX_YEAR, TAX_SOURCE } from "../data/taxData.js";
import { NumberField, TextField, Select, Toggle, Button, Callout, Grid, Badge, makeFormatters } from "./ui.jsx";
import { encodeProfile } from "../state/useProfile.js";

const TABS = ["Balance sheet", "Income", "School", "Career paths", "Loan rules", "Tax", "Assumptions", "My data"];

export default function SettingsPanel({ profile, update, reset, exportJson, importJson, onClose }) {
  const [tab, setTab] = useState("School");
  const fileRef = useRef(null);
  const f = makeFormatters(profile.currency);
  const set = patch => update(patch);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#04070ce0", zIndex: 90, display: "flex", justifyContent: "flex-end" }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: "min(560px, 100%)", height: "100%", background: C.panel, borderLeft: `1px solid ${C.border}`, overflowY: "auto", padding: "22px 24px 60px" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Settings</div>
          <Button size="sm" onClick={onClose}>Close ✕</Button>
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
          {TABS.map(t => (
            <button
              key={t} onClick={() => setTab(t)}
              style={{
                background: tab === t ? C.accent + "1a" : "transparent",
                border: `1px solid ${tab === t ? C.accent : C.border}`,
                color: tab === t ? C.accent : C.muted,
                borderRadius: 6, padding: "5px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer",
              }}
            >{t}</button>
          ))}
        </div>

        {tab === "School" && <SchoolTab profile={profile} set={set} f={f} />}
        {tab === "Career paths" && <CareerTab profile={profile} set={set} />}
        {tab === "Loan rules" && <LoanTab profile={profile} set={set} />}
        {tab === "Balance sheet" && <BalanceSheetTab profile={profile} set={set} f={f} />}
        {tab === "Income" && <IncomeTab profile={profile} set={set} f={f} />}
        {tab === "Tax" && <TaxTab profile={profile} set={set} />}
        {tab === "Assumptions" && <AssumptionsTab profile={profile} set={set} />}
        {tab === "My data" && (
          <DataTab
            profile={profile} reset={reset} exportJson={exportJson}
            importJson={importJson} fileRef={fileRef} onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}

/* ── School ───────────────────────────────────────────────────────────── */

function SchoolTab({ profile, set, f }) {
  const school = profile.schoolId === "custom" && profile.customSchool
    ? profile.customSchool
    : ALL_SCHOOLS.find(s => s.id === profile.schoolId);

  const toggleCompare = id => {
    const list = profile.compareSchoolIds.includes(id)
      ? profile.compareSchoolIds.filter(x => x !== id)
      : [...profile.compareSchoolIds, id].slice(0, 6);
    set({ compareSchoolIds: list });
  };

  return (
    <>
      <Callout tone="warn" title="These figures go stale" style={{ marginBottom: 16 }}>
        Cost of attendance is from published {SCHOOL_DATA_AS_OF} data and salary
        figures are from Class of 2025 employment reports. Schools revise both
        every year. Replace them with the numbers on your own admit letter.
      </Callout>

      <Select
        label="Primary school"
        value={profile.schoolId}
        onChange={v => {
          const s = ALL_SCHOOLS.find(x => x.id === v);
          set({
            schoolId: v,
            currency: s?.currency ?? profile.currency,
            customSchool: v === "custom" ? (profile.customSchool ?? { ...CUSTOM_SCHOOL }) : profile.customSchool,
          });
        }}
        options={ALL_SCHOOLS.map(s => ({ value: s.id, label: s.name }))}
      />

      {school?.dataWarning && (
        <Callout tone="danger" title="Data quality warning" style={{ marginBottom: 14 }}>
          {school.dataWarning}
        </Callout>
      )}

      {profile.schoolId === "custom" && profile.customSchool && (
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: C.accent, marginBottom: 10 }}>Custom school</div>
          <TextField
            label="Name" value={profile.customSchool.name}
            onChange={v => set({ customSchool: { ...profile.customSchool, name: v, short: v.slice(0, 12) } })}
          />
          <Grid cols="1fr 1fr" gap={12}>
            <NumberField
              label="Cost of attendance / year" value={profile.customSchool.coaPerYear}
              onChange={v => set({ customSchool: { ...profile.customSchool, coaPerYear: v } })}
              step={1000} prefix={f.sym} hint="Tuition + fees + living costs."
            />
            <NumberField
              label="Programme length" value={profile.customSchool.programYears}
              onChange={v => set({ customSchool: { ...profile.customSchool, programYears: v } })}
              step={0.5} min={0.5} max={5} suffix="yrs"
            />
          </Grid>
        </div>
      )}

      {school && !school.isCustom && (
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 12, color: C.muted, lineHeight: 1.7 }}>
          <div>Cost of attendance: <span style={{ fontFamily: MONO, color: C.text }}>{f.money(school.coaPerYear)}</span> / year</div>
          <div>Programme length: <span style={{ fontFamily: MONO, color: C.text }}>{school.programYears} years</span></div>
          <div>Total (with {(profile.coaEscalation * 100).toFixed(0)}% year-two escalation): <span style={{ fontFamily: MONO, color: C.text }}>{f.money(totalCoa(school, profile.coaEscalation))}</span></div>
          <div style={{ marginTop: 8, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            {school.compVerified
              ? <Badge tone="good">salary data verified</Badge>
              : <Badge tone="warn" title="No confirmed employment-report figure, so this school does not scale your career-path salaries.">salary data unverified</Badge>}
            {school.coaSource && <a href={school.coaSource} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: C.accent }}>cost source ↗</a>}
            {school.compSource && school.compVerified && <a href={school.compSource} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: C.accent }}>salary source ↗</a>}
          </div>
        </div>
      )}

      <NumberField
        label="Year-two cost escalation"
        value={+(profile.coaEscalation * 100).toFixed(1)}
        onChange={v => set({ coaEscalation: v / 100 })}
        suffix="%" step={0.5} min={0} max={15}
        hint="Schools typically raise cost of attendance a few percent each year."
      />

      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: C.muted, margin: "18px 0 8px" }}>
        Schools to compare (up to 6)
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {ALL_SCHOOLS.filter(s => !s.isCustom).map(s => {
          const on = profile.compareSchoolIds.includes(s.id);
          return (
            <button
              key={s.id} onClick={() => toggleCompare(s.id)}
              style={{
                background: on ? C.accent + "1a" : "transparent",
                border: `1px solid ${on ? C.accent : C.border}`,
                color: on ? C.accent : C.muted,
                borderRadius: 6, padding: "4px 9px", fontSize: 11, cursor: "pointer",
              }}
            >{s.short}</button>
          );
        })}
      </div>
    </>
  );
}

/* ── Career paths ─────────────────────────────────────────────────────── */

function CareerTab({ profile, set }) {
  const custom = profile.customPaths ?? [];
  const all = resolvePaths(profile);
  const totalWeight = all.reduce((s, p) => s + p.weight, 0);

  const setWeight = (id, w) => set({ pathWeights: { ...profile.pathWeights, [id]: w } });
  const editCustom = (id, patch) =>
    set({ customPaths: custom.map(p => (p.id === id ? { ...p, ...patch } : p)) });

  return (
    <>
      <Callout tone="info" title="Weights are relative" style={{ marginBottom: 16 }}>
        Set how likely each outcome feels. They're normalised, so 40/30/30 and
        4/3/3 behave identically. Current total: <strong style={{ color: C.text }}>{totalWeight}</strong>.
        Salary figures reflect the {CAREER_DATA_AS_OF}; paths marked <Badge tone="muted">est</Badge> are
        reasoned estimates rather than published report figures.
      </Callout>

      {all.map(p => {
        const w = p.weight;
        const isCustom = !!p.isCustom;
        return (
          <div key={p.id} style={{ border: `1px solid ${w > 0 ? C.border : C.borderSoft}`, borderRadius: 9, padding: 12, marginBottom: 10, background: w > 0 ? C.bg : "transparent" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: w > 0 ? 8 : 0 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: w > 0 ? C.text : C.muted, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  {isCustom ? (
                    <input
                      value={p.label} onChange={e => editCustom(p.id, { label: e.target.value })}
                      style={{ background: "transparent", border: "none", borderBottom: `1px dashed ${C.border}`, color: C.text, fontSize: 12, fontWeight: 600, outline: "none", padding: "1px 0" }}
                    />
                  ) : p.label}
                  {!p.grounded && <Badge tone="muted" title="Reasoned industry estimate, not a published employment-report figure.">est</Badge>}
                  {p.windfall && <Badge tone="good" title={`${p.windfall.label}: ${(p.windfall.probability * 100).toFixed(0)}% chance around year ${p.windfall.yearOffset} after graduation.`}>upside</Badge>}
                </div>
                {w > 0 && p.note && <div style={{ fontSize: 10, color: C.faint, marginTop: 3, lineHeight: 1.45 }}>{p.note}</div>}
              </div>
              <input
                type="number" value={w} min={0} max={100} step={5}
                aria-label={`Weight for ${p.label}`}
                onChange={e => setWeight(p.id, Number(e.target.value) || 0)}
                style={{ width: 58, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, padding: "5px 7px", fontSize: 12, textAlign: "right" }}
              />
            </div>

            {w > 0 && (
              <Grid cols="1fr 1fr 1fr" gap={8} style={{ marginTop: 4 }}>
                <NumberField
                  label="Year-1 comp" value={p.year1} step={5000}
                  onChange={v => (isCustom ? editCustom(p.id, { year1: v }) : set({ pathOverrides: { ...(profile.pathOverrides ?? {}), [p.id]: { ...(profile.pathOverrides?.[p.id] ?? {}), year1: v } } }))}
                />
                <NumberField
                  label="Growth" value={+(p.growth * 100).toFixed(1)} suffix="%" step={0.5}
                  onChange={v => (isCustom ? editCustom(p.id, { growth: v / 100 }) : set({ pathOverrides: { ...(profile.pathOverrides ?? {}), [p.id]: { ...(profile.pathOverrides?.[p.id] ?? {}), growth: v / 100 } } }))}
                />
                <NumberField
                  label="Volatility" value={+(p.vol * 100).toFixed(0)} suffix="%" step={1}
                  onChange={v => (isCustom ? editCustom(p.id, { vol: v / 100 }) : set({ pathOverrides: { ...(profile.pathOverrides ?? {}), [p.id]: { ...(profile.pathOverrides?.[p.id] ?? {}), vol: v / 100 } } }))}
                />
              </Grid>
            )}
          </div>
        );
      })}

      <Button
        onClick={() => {
          const p = blankCustomPath(custom.length + 1);
          set({ customPaths: [...custom, p], pathWeights: { ...profile.pathWeights, [p.id]: 10 } });
        }}
      >+ Add a custom path</Button>
    </>
  );
}

/* ── Loan rules ───────────────────────────────────────────────────────── */

function LoanTab({ profile, set }) {
  const preset = LOAN_PRESETS.find(p => p.id === profile.loanPresetId);
  const setLoan = patch => set({ loan: { ...profile.loan, ...patch }, loanPresetId: "custom" });
  const useFederal = profile.funding?.useFederal ?? true;

  return (
    <>
      <Toggle
        label="Use federal student loans"
        checked={useFederal}
        onChange={v => set(setUseFederal(profile, v))}
        hint="Turn off if you're ineligible, outside the US, or borrowing privately by choice. Everything then comes from private lenders."
      />

      {!useFederal && (
        <Callout tone="warn" title="What you're giving up" style={{ marginBottom: 16 }}>
          Private borrowing can be cheaper month to month with strong credit.
          These protections have no private equivalent, and only matter in the
          situations you can't plan for:
          <div style={{ marginTop: 8 }}>
            {FEDERAL_PROTECTIONS.map(fp => (
              <div key={fp.label} style={{ marginBottom: 4 }}>
                <strong style={{ color: C.text }}>{fp.label}</strong> — {fp.detail}
              </div>
            ))}
          </div>
        </Callout>
      )}

      {useFederal && <Select
        label="Preset"
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
        hint={preset?.description}
      />}

      <Callout tone="warn" style={{ marginBottom: 16 }}>
        Federal student-loan rates reset every 1 July, and private APRs depend
        on the lender and on you. Verify before relying on any of this.
      </Callout>

      {useFederal && <Grid cols="1fr 1fr" gap={12}>
        <NumberField label="Subsidised cap / year" value={profile.loan.federalPerYear} onChange={v => setLoan({ federalPerYear: v })} step={500} min={0} hint="Set to 0 if no capped-rate programme applies." />
        <NumberField label="Lifetime cap" value={profile.loan.federalLifetimeCap} onChange={v => setLoan({ federalLifetimeCap: v })} step={5000} min={0} />
        <NumberField label="Capped-tranche rate" value={+(profile.loan.federalRate * 100).toFixed(2)} onChange={v => setLoan({ federalRate: v / 100 })} suffix="%" step={0.05} min={0} />
        <NumberField label="Grace period" value={profile.loan.graceMonths} onChange={v => setLoan({ graceMonths: v })} suffix="mo" step={1} min={0} hint="Months after graduation before repayment starts." />
      </Grid>}

      <Select
        label="Repayment term"
        value={String(profile.loan.termMonths)}
        onChange={v => setLoan({ termMonths: Number(v) })}
        options={TERM_OPTIONS.map(t => ({ value: String(t.months), label: t.label }))}
        hint="A longer term lowers the monthly payment and raises total interest."
      />

      <Toggle
        label="I already have a quoted APR"
        checked={profile.useDirectApr}
        onChange={v => set({ useDirectApr: v })}
        hint="Skips the credit-score estimate entirely."
      />

      {profile.useDirectApr ? (
        <NumberField label="Private loan APR" value={+(profile.directApr * 100).toFixed(2)} onChange={v => set({ directApr: v / 100 })} suffix="%" step={0.05} min={0} max={30} />
      ) : (
        <>
          <NumberField label="Credit score" value={profile.creditScore} onChange={v => set({ creditScore: v })} step={5} min={500} max={850} />
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: C.muted, margin: "14px 0 8px" }}>Score → APR tiers</div>
          {profile.aprTiers.map((t, i) => (
            <Grid key={i} cols="1fr 1fr" gap={10}>
              <NumberField label="Min score" value={t.minScore} step={10}
                onChange={v => set({ aprTiers: profile.aprTiers.map((x, j) => (j === i ? { ...x, minScore: v } : x)) })} />
              <NumberField label="APR" value={+(t.apr * 100).toFixed(2)} suffix="%" step={0.05}
                onChange={v => set({ aprTiers: profile.aprTiers.map((x, j) => (j === i ? { ...x, apr: v / 100 } : x)) })} />
            </Grid>
          ))}
        </>
      )}

      <Select
        label="Currency"
        value={profile.currency}
        onChange={v => set({ currency: v })}
        options={CURRENCIES.map(c => ({ value: c.code, label: `${c.symbol} ${c.label}` }))}
        hint="Display only -- no FX conversion."
      />
    </>
  );
}

/* ── Assumptions ──────────────────────────────────────────────────────── */

function AssumptionsTab({ profile, set }) {
  return (
    <>
      <Toggle
        label="Show long projections in today's money"
        checked={profile.showRealDollars ?? true}
        onChange={v => set({ showRealDollars: v })}
        hint="On: future figures are deflated so they're comparable to what you earn now. Off: raw nominal dollars, which look bigger but overstate every long projection."
      />
      <NumberField label="Inflation" value={+((profile.inflation ?? 0.03) * 100).toFixed(2)}
        onChange={v => set({ inflation: v / 100 })} suffix="%" step={0.25} min={0} max={15}
        hint="Used both for the deflator above and inside the independence model." />

      <Grid cols="1fr 1fr" gap={12}>
        <NumberField label="Effective tax rate" value={Math.round(profile.taxRate * 100)} onChange={v => set({ taxRate: v / 100 })} suffix="%" step={1} min={0} max={60} hint="Federal + state/local + payroll." />
        <NumberField label="Savings rate" value={Math.round(profile.savingsRate * 100)} onChange={v => set({ savingsRate: v / 100 })} suffix="%" step={1} min={0} max={80} hint="Share of after-tax income invested." />
        <NumberField label="Investment return" value={+(profile.marketReturn * 100).toFixed(1)} onChange={v => set({ marketReturn: v / 100 })} suffix="%" step={0.5} min={0} max={20} hint="Long-run nominal return on invested savings." />
        <NumberField label="Discount rate" value={+(profile.discountRate * 100).toFixed(1)} onChange={v => set({ discountRate: v / 100 })} suffix="%" step={0.5} min={0} max={20} hint="Used for present-value comparisons." />
        <NumberField label="No-MBA comp growth" value={+(profile.noMbaGrowth * 100).toFixed(1)} onChange={v => set({ noMbaGrowth: v / 100 })} suffix="%" step={0.5} min={0} max={20} hint="Annual raises if you don't go." />
        <NumberField label="Internship income" value={profile.internshipIncome} onChange={v => set({ internshipIncome: v })} step={1000} min={0} hint="Summer earnings between years (multi-year programmes only)." />
        <NumberField label="Projection horizon" value={profile.horizon} onChange={v => set({ horizon: v })} suffix="yrs" step={1} min={3} max={40} />
        <NumberField label="Stress threshold" value={Math.round(profile.stressThreshold * 100)} onChange={v => set({ stressThreshold: v / 100 })} suffix="%" step={1} min={5} max={60} hint="Payment-to-net-income ratio considered stressful." />
        <NumberField label="Simulations" value={profile.sims} onChange={v => set({ sims: v })} step={500} min={500} max={20000} hint="More runs = smoother charts, slower updates." />
        <NumberField label="Random seed" value={profile.seed} onChange={v => set({ seed: v })} step={1} hint="Same seed = identical results every time." />
      </Grid>
    </>
  );
}

/* ── My data ──────────────────────────────────────────────────────────── */

function DataTab({ profile, reset, exportJson, importJson, fileRef, onClose }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}#p=${encodeProfile(profile)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      prompt("Copy this link:", url);
    }
  };

  return (
    <>
      <Callout tone="good" title="Nothing leaves this device" style={{ marginBottom: 16 }}>
        This app has no server, no account, and no analytics. Your figures are
        stored in this browser's local storage and nowhere else. Clearing your
        browser data removes them permanently.
      </Callout>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Button onClick={exportJson}>⬇ Export scenario as JSON</Button>

        <Button onClick={() => fileRef.current?.click()}>⬆ Import a saved scenario</Button>
        <input
          ref={fileRef} type="file" accept="application/json" style={{ display: "none" }}
          onChange={e => { const file = e.target.files?.[0]; if (file) importJson(file); e.target.value = ""; }}
        />

        <Button onClick={share}>
          {copied ? "✓ Link copied" : "🔗 Copy a share link"}
        </Button>
        <div style={{ fontSize: 10, color: C.yellow, lineHeight: 1.5, marginTop: -4, paddingLeft: 2 }}>
          Heads up: the share link encodes your actual figures — including net
          worth and compensation — in the URL. Only send it to someone you'd
          tell those numbers directly.
        </div>

        <div style={{ height: 1, background: C.border, margin: "10px 0" }} />

        <Button
          variant="danger"
          onClick={() => {
            if (confirm("Delete your saved figures and return to the default scenario? This cannot be undone.")) {
              reset();
              onClose();
            }
          }}
        >🗑 Clear my data</Button>
      </div>
    </>
  );
}

/* ── Tax ──────────────────────────────────────────────────────────────── */

function TaxTab({ profile, set }) {
  const preset = STATE_PRESETS.find(s => s.id === profile.statePresetId) ?? STATE_PRESETS[0];

  return (
    <>
      <Callout tone="warn" title={`US brackets, tax year ${TAX_YEAR}`} style={{ marginBottom: 16 }}>
        The flat effective rate below drives the headline financing sections.
        Bracket detail is used where it genuinely changes the answer — capital
        gains on an equity sale, and withdrawals in retirement. Rates change
        every year;{" "}
        <a href={TAX_SOURCE} target="_blank" rel="noreferrer" style={{ color: C.accent }}>check the source ↗</a>.
        Outside the US, turn bracket mode off and set flat rates.
      </Callout>

      <NumberField label="Effective tax rate on income" value={Math.round(profile.taxRate * 100)}
        onChange={v => set({ taxRate: v / 100 })} suffix="%" step={1} min={0} max={60}
        hint="Federal + state/local + payroll, blended. Used everywhere income is taxed." />

      <Select
        label="State / local income tax"
        value={profile.statePresetId}
        onChange={v => {
          const p = STATE_PRESETS.find(x => x.id === v);
          set({ statePresetId: v, stateRate: p.rate });
        }}
        options={STATE_PRESETS.map(s => ({ value: s.id, label: `${s.label}${s.id !== "none" && s.id !== "custom" ? ` — ${(s.rate * 100).toFixed(1)}%` : ""}` }))}
        hint="Approximate top marginal combined rate. Used for capital gains and retirement withdrawals."
      />

      {profile.statePresetId === "custom" && (
        <NumberField label="Custom state rate" value={+(profile.stateRate * 100).toFixed(2)}
          onChange={v => set({ stateRate: v / 100 })} suffix="%" step={0.25} min={0} max={20} />
      )}

      <Toggle label="Use progressive bracket maths where it matters"
        checked={profile.useBracketTax}
        onChange={v => set({ useBracketTax: v, flatCapGainsRate: v ? null : 0.25 })}
        hint="On: US federal brackets plus your state rate. Off: a single flat rate on gains and withdrawals." />

      {!profile.useBracketTax && (
        <NumberField label="Flat capital-gains rate" value={+((profile.flatCapGainsRate ?? 0.25) * 100).toFixed(1)}
          onChange={v => set({ flatCapGainsRate: v / 100 })} suffix="%" step={0.5} min={0} max={60}
          hint="Applied to every realised gain, regardless of holding period or income." />
      )}
    </>
  );
}

/* ── Income ───────────────────────────────────────────────────────────── */

/**
 * Compensation, split three ways.
 *
 * The split matters because the components behave differently: base is
 * reliable, bonus swings with the year, and equity swings with the share
 * price — which is the same price driving your concentration risk. A single
 * blended number hides all of that.
 *
 * The annual equity grant is entered *here only*. It counts as pay and it
 * becomes shares that vest into your balance sheet. Entering it in two places
 * is what caused stock compensation to be double-counted before.
 */
function IncomeTab({ profile, set, f }) {
  const c = profile.compensation ?? {};
  const detailed = profile.detailLevel === "detailed";
  const total = totalComp(c);
  const equityShare = total > 0 ? (c.equityAnnual ?? 0) / total : 0;

  return (
    <>
      {detailed ? (
        <>
          <Grid cols="1fr 1fr" gap={12}>
            <NumberField label="Base salary" value={c.base ?? 0}
              onChange={v => set(setComp(profile, { base: v }))} step={5000} min={0} prefix={f.sym}
              hint="The part you can count on." />
            <NumberField label="Annual bonus" value={c.bonus ?? 0}
              onChange={v => set(setComp(profile, { bonus: v }))} step={5000} min={0} prefix={f.sym}
              hint="A typical year, not your best one." />
          </Grid>
          <NumberField label="Annual equity grant" value={c.equityAnnual ?? 0}
            onChange={v => set(setComp(profile, { equityAnnual: v }))} step={5000} min={0} prefix={f.sym}
            hint="Value of stock granted per year. Enter it once here — it counts as pay and vests into your holding on the balance sheet." />

          <div style={{ background: C.bg, border: `1px solid ${C.accent}44`, borderRadius: 9, padding: "12px 16px", marginBottom: 14 }}>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: C.muted }}>Total compensation</div>
            <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: C.accent }}>{f.money(total)}</div>
            {equityShare > 0 && (
              <div style={{ fontSize: 11, color: equityShare > 0.35 ? C.orange : C.faint, marginTop: 4, lineHeight: 1.5 }}>
                {(equityShare * 100).toFixed(0)}% of your pay moves with one share price
                {equityShare > 0.35 && " — and your salary depends on that company too. Worth seeing on the Equity tab."}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <Callout tone="info" style={{ marginBottom: 14 }}>
            Simple mode tracks pay as one figure. Switch to detailed to split
            base, bonus and stock — worth doing if a meaningful share of your
            pay is equity, since that part carries risk the rest doesn't.
          </Callout>
          <NumberField label="Total annual compensation" value={c.base ?? 0}
            onChange={v => set(setComp(profile, { base: v, bonus: 0, equityAnnual: 0 }))}
            step={5000} min={0} prefix={f.sym} hint="Everything before tax." />
          <Button variant="primary" onClick={() => set(setDetailLevel(profile, "detailed"))}>
            Switch to detailed →
          </Button>
        </>
      )}

      <NumberField label="Pay growth if you don't go" value={+((profile.noMbaGrowth ?? 0) * 100).toFixed(1)}
        onChange={v => set({ noMbaGrowth: v / 100 })} suffix="%" step={0.5} min={0} max={25}
        hint="Annual raises on your current track. Be honest about the ceiling — this is the counterfactual the whole comparison rests on." />
      <NumberField label="Share of after-tax income you save" value={Math.round((profile.savingsRate ?? 0) * 100)}
        onChange={v => set({ savingsRate: v / 100 })} suffix="%" step={1} min={0} max={80} />
    </>
  );
}
