import { useState, useMemo } from "react";
import { C, SANS } from "./theme.js";
import { useProfile } from "./state/useProfile.js";
import { toSimConfig } from "./state/defaults.js";
import { getSchool, SCHOOL_DATA_AS_OF } from "./data/schools.js";
import { normalizeWeights } from "./lib/random.js";
import {
  resolveFinancing, runCoreSim, runSchoolComparison, runStrategies,
  runSensitivity, runInvestVsDeploy, runTradeoff, runNetWorthProjection,
  rateScenarios, creditScenarios, effectiveApr,
} from "./lib/simulation.js";

import { Slider, Button, Callout, Grid, makeFormatters } from "./components/ui.jsx";
import Onboarding from "./components/Onboarding.jsx";
import SettingsPanel from "./components/SettingsPanel.jsx";
import LoanStructure from "./components/sections/LoanStructure.jsx";
import MonteCarlo from "./components/sections/MonteCarlo.jsx";
import CreditImpact from "./components/sections/CreditImpact.jsx";
import SchoolComparison from "./components/sections/SchoolComparison.jsx";
import CapitalStack from "./components/sections/CapitalStack.jsx";
import Sensitivity from "./components/sections/Sensitivity.jsx";
import InvestVsDeploy from "./components/sections/InvestVsDeploy.jsx";
import NetWorthProjection from "./components/sections/NetWorthProjection.jsx";
import Recommendations from "./components/sections/Recommendations.jsx";

const NAV = [
  ["loan", "Loan"],
  ["montecarlo", "Simulation"],
  ["credit", "Credit"],
  ["schools", "Schools"],
  ["stack", "Capital stack"],
  ["sensitivity", "Sensitivity"],
  ["invest", "Invest vs deploy"],
  ["networth", "Go or don't"],
];

export default function App() {
  const { profile, update, reset, exportJson, importJson } = useProfile();
  const [showSettings, setShowSettings] = useState(false);

  // Derived rather than held in state, so that clearing your data (which
  // resets `onboarded`) drops you straight back to a genuine first run.
  const showOnboarding = !profile.onboarded;

  const f = useMemo(() => makeFormatters(profile.currency), [profile.currency]);
  const cfg = useMemo(() => toSimConfig(profile), [profile]);
  const school = cfg.school;

  // Every section derives from this one config object, so the whole page
  // stays internally consistent -- scholarship, savings, and loan terms feed
  // every calculation the same way.
  const financing = useMemo(() => resolveFinancing(cfg), [cfg]);
  const core = useMemo(() => runCoreSim(cfg, { financing }), [cfg, financing]);
  const scenarios = useMemo(() => rateScenarios(cfg, financing), [cfg, financing]);
  const credit = useMemo(() => creditScenarios(cfg, financing), [cfg, financing]);
  const schools = useMemo(
    () => runSchoolComparison(cfg, profile.compareSchoolIds.map(getSchool)),
    [cfg, profile.compareSchoolIds]
  );
  const strategies = useMemo(() => runStrategies(cfg), [cfg]);
  const sensitivity = useMemo(() => runSensitivity(cfg), [cfg]);
  const tradeoff = useMemo(() => runTradeoff(cfg), [cfg]);
  const invest = useMemo(() => runInvestVsDeploy(cfg), [cfg]);
  const nw = useMemo(() => runNetWorthProjection(cfg), [cfg]);

  const pathSummary = useMemo(() => {
    const probs = normalizeWeights(cfg.paths.map(p => p.weight));
    return cfg.paths.map((p, i) => ({ id: p.id, label: p.label, year1: p.year1, prob: probs[i] }));
  }, [cfg.paths]);

  const maxDeployable = Math.max(0, financing.cost - profile.scholarship);
  const activeRate = effectiveApr(cfg);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: SANS }}>
      {showOnboarding && (
        <Onboarding
          profile={profile}
          update={update}
          onDone={() => update({ onboarded: true })}
        />
      )}

      {showSettings && (
        <SettingsPanel
          profile={profile} update={update} reset={reset}
          exportJson={exportJson} importJson={importJson}
          onClose={() => setShowSettings(false)}
        />
      )}

      <div style={{ maxWidth: 1140, margin: "0 auto", padding: "20px 24px 70px" }}>

        {/* Header */}
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, padding: "24px 0 18px", borderBottom: `1px solid ${C.border}`, marginBottom: 20, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: 25, fontWeight: 700, letterSpacing: "-0.02em", background: `linear-gradient(135deg, ${C.accent}, ${C.accent2})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              MBA Finance Simulator
            </h1>
            <p style={{ color: C.muted, fontSize: 12.5, marginTop: 5 }}>
              {profile.sims.toLocaleString()} Monte Carlo runs per update · {school.name} · everything stays in your browser
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button size="sm" onClick={() => update({ onboarded: false })}>Setup</Button>
            <Button size="sm" variant="primary" onClick={() => setShowSettings(true)}>⚙ Settings</Button>
          </div>
        </header>

        {/* Section nav */}
        <nav style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
          {NAV.map(([id, label]) => (
            <a key={id} href={`#${id}`}
              style={{ fontSize: 11, color: C.muted, textDecoration: "none", border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 9px" }}>
              {label}
            </a>
          ))}
        </nav>

        <Callout tone="warn" title="This is a model, not advice" style={{ marginBottom: 22 }}>
          Every figure here is an estimate built on assumptions you can and
          should change. Cost and salary data comes from published {SCHOOL_DATA_AS_OF} sources
          and goes stale quickly. Nothing in this tool is financial advice —
          verify loan terms with lenders and costs with schools before making a
          decision this size.
        </Callout>

        {/* Primary controls */}
        <div style={{ background: `linear-gradient(135deg, ${C.panel}, ${C.panelAlt})`, border: `1px solid ${C.accent}44`, borderRadius: 14, padding: "22px 26px", marginBottom: 10, boxShadow: `0 0 40px ${C.accent}0a` }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", color: C.accent, marginBottom: 16, fontWeight: 600 }}>
            ⚙ Funding — every section below recalculates as you drag
          </div>
          <Grid cols="repeat(auto-fit, minmax(250px, 1fr))" gap={26}>
            <Slider
              label="Scholarship" value={profile.scholarship}
              min={0} max={Math.max(100000, Math.ceil(financing.cost / 10000) * 10000)} step={2500}
              onChange={v => update({ scholarship: v })} format={f.money}
              description="Total award across the whole programme."
            />
            <Slider
              label="Savings deployed" value={Math.min(profile.savingsDeployed, maxDeployable)}
              min={0} max={Math.max(10000, Math.ceil(Math.max(profile.totalSavings, maxDeployable) / 10000) * 10000)} step={2500}
              onChange={v => update({ savingsDeployed: v })} format={f.money}
              description="Cash put toward tuition. The rest stays invested."
            />
            {profile.useDirectApr ? (
              <Slider
                label="Private APR (your quote)" value={profile.directApr}
                min={0.02} max={0.2} step={0.0025}
                onChange={v => update({ directApr: v })} format={v => (v * 100).toFixed(2) + "%"}
                description="From your lender. Switch back to score-based estimates in Settings."
              />
            ) : (
              <Slider
                label="Credit score" value={profile.creditScore}
                min={580} max={820} step={10}
                onChange={v => update({ creditScore: v })} format={v => String(v)}
                description="Estimates your private APR. Enter a real quote in Settings if you have one."
              />
            )}
          </Grid>
        </div>

        <div style={{ fontSize: 11, color: C.fainter, marginBottom: 6, textAlign: "right" }}>
          Financing {f.money(financing.need)} · {f.money(financing.totalPmt)}/mo · {f.pct(activeRate)} private APR
        </div>

        <LoanStructure f={f} financing={financing} scenarios={scenarios} activeRate={activeRate} profile={profile} school={school} />
        <MonteCarlo f={f} core={core} profile={profile} pathSummary={pathSummary} />
        <CreditImpact f={f} financing={financing} credit={credit} profile={profile} />
        <SchoolComparison f={f} schools={schools} profile={profile} />
        <CapitalStack f={f} strategies={strategies} profile={profile} />
        <Sensitivity f={f} sensitivity={sensitivity} tradeoff={tradeoff} profile={profile} />
        <InvestVsDeploy
          f={f} invest={invest} update={update}
          profile={{ ...profile, __schoolYears: Math.ceil(school.programYears) }}
        />
        <NetWorthProjection f={f} nw={nw} profile={profile} update={update} school={school} />

        <Recommendations
          f={f} financing={financing} core={core} schools={schools}
          nw={nw} invest={invest} profile={profile} tradeoff={tradeoff}
        />

        <footer style={{ textAlign: "center", fontSize: 10.5, color: C.fainter, padding: "30px 0 8px", lineHeight: 1.8 }}>
          {profile.sims.toLocaleString()} simulations per update · seeded PRNG (seed {profile.seed}) · no server, no analytics, no tracking<br />
          Open source under the MIT licence. Educational tool only — not financial, tax, or legal advice.
        </footer>
      </div>
    </div>
  );
}
