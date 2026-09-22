import { useState, useMemo } from "react";
import { C, SANS } from "./theme.js";
import { useProfile } from "./state/useProfile.js";
import { toSimConfig } from "./state/defaults.js";
import { setScholarshipTotal, setCashDeployed, scholarshipTotal } from "./state/actions.js";
import { getSchool, SCHOOL_DATA_AS_OF } from "./data/schools.js";
import { normalizeWeights } from "./lib/random.js";
import { hasEquityHoldings } from "./state/derived.js";
import {
  resolveFinancing, runCoreSim, runSchoolComparison, runStrategies,
  runSensitivity, runInvestVsDeploy, runTradeoff, runNetWorthProjection,
  rateScenarios, creditScenarios, effectiveApr,
} from "./lib/simulation.js";
import { runSellVsHold, runEquityStrategies } from "./lib/equityDecisions.js";
import { runOutcomeTiers } from "./lib/ladder.js";
import { runFire } from "./lib/fire.js";

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
import OutcomeTiers from "./components/sections/OutcomeTiers.jsx";
import EquitySellVsHold from "./components/sections/EquitySellVsHold.jsx";
import EquityStrategy from "./components/sections/EquityStrategy.jsx";
import FireProjection from "./components/sections/FireProjection.jsx";
import Recommendations from "./components/sections/Recommendations.jsx";
import SummaryView from "./components/sections/SummaryView.jsx";

export default function App() {
  const { profile, update, reset, exportJson, importJson } = useProfile();
  const [showSettings, setShowSettings] = useState(false);
  const [tab, setTab] = useState("financing");

  // Derived rather than held in state, so that clearing your data (which
  // resets `onboarded`) drops you straight back to a genuine first run.
  const showOnboarding = !profile.onboarded;

  const f = useMemo(
    () => makeFormatters(profile.currency, {
      showReal: profile.showRealDollars ?? true,
      inflation: profile.inflation ?? 0.03,
    }),
    [profile.currency, profile.showRealDollars, profile.inflation]
  );
  const cfg = useMemo(() => toSimConfig(profile), [profile]);
  const school = cfg.school;
  const equityOn = hasEquityHoldings(profile.balanceSheet ?? {});

  const tabs = [
    { id: "financing", label: "Financing" },
    { id: "career", label: "Go or don't" },
    ...(equityOn ? [{ id: "equity", label: "Equity" }] : []),
    { id: "fire", label: "Independence" },
    { id: "summary", label: "★ Summary" },
  ];

  // ── Core financing models. Everything derives from one config object, so
  // every tab stays internally consistent with every other. ──
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

  // ── Career ladder ──
  const tiers = useMemo(() => runOutcomeTiers({
    ...cfg,
    ladder: cfg.ladder,
    tiers: cfg.compTiers,
    acceleration: cfg.mbaAcceleration,
    founder: cfg.founderOption,
    years: cfg.ladderYears,
    schoolYears: Math.ceil(school.programYears ?? 2),
    mbaGrowth: cfg.paths.reduce((s, p, i, a) => s + p.growth / a.length, 0),
    mbaVol: cfg.paths.reduce((s, p, i, a) => s + p.vol / a.length, 0) * 0.4,
  }, { nSim: 2000 }), [cfg, school.programYears]);

  // ── Equity models, only when there is actually a position to model ──
  const sellHold = useMemo(
    () => (equityOn
      ? runSellVsHold(cfg, { nSim: 1200, horizonYears: profile.equityHorizonYears, afterTaxTerminal: profile.equityAfterTaxTerminal })
      : null),
    [cfg, equityOn, profile.equityHorizonYears, profile.equityAfterTaxTerminal]
  );
  const equityStrategies = useMemo(
    () => (equityOn ? runEquityStrategies(cfg, { nSim: 700 }) : null),
    [cfg, equityOn]
  );

  // ── Independence ──
  const fire = useMemo(() => runFire({
    ...cfg,
    marketReturn: cfg.marketReturn,
    volatility: cfg.portfolioVolatility,
  }, { nSim: 800 }), [cfg]);

  const pathSummary = useMemo(() => {
    const probs = normalizeWeights(cfg.paths.map(p => p.weight));
    return cfg.paths.map((p, i) => ({ id: p.id, label: p.label, year1: p.year1, prob: probs[i] }));
  }, [cfg.paths]);

  const maxDeployable = Math.max(0, financing.cost - scholarshipTotal(profile));
  const activeRate = effectiveApr(cfg);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: SANS }}>
      {showOnboarding && (
        <Onboarding profile={profile} update={update} onDone={() => update({ onboarded: true })} />
      )}

      {showSettings && (
        <SettingsPanel
          profile={profile} update={update} reset={reset}
          exportJson={exportJson} importJson={importJson}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Sticky tab bar */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: C.panelAlt, borderBottom: `1px solid ${C.border}`, padding: "10px 24px" }}>
        <div style={{ maxWidth: 1140, margin: "0 auto", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                padding: "7px 15px", borderRadius: 7, cursor: "pointer",
                border: `1px solid ${tab === t.id ? C.accent : "transparent"}`,
                background: tab === t.id ? C.accent + "1f" : C.borderSoft,
                color: tab === t.id ? C.accent : C.muted,
                fontWeight: tab === t.id ? 700 : 500, fontSize: 12.5,
              }}>
              {t.label}
            </button>
          ))}
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <Button size="sm" onClick={() => update({ onboarded: false })}>Setup</Button>
            <Button size="sm" variant="primary" onClick={() => setShowSettings(true)}>⚙ Settings</Button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 1140, margin: "0 auto", padding: "18px 24px 70px" }}>

        <header style={{ padding: "14px 0 16px", borderBottom: `1px solid ${C.border}`, marginBottom: 18 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", background: `linear-gradient(135deg, ${C.accent}, ${C.accent2})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            MBA Finance Simulator
          </h1>
          <p style={{ color: C.muted, fontSize: 12.5, marginTop: 5 }}>
            {school.name} · {profile.sims.toLocaleString()} simulations per update · everything stays in your browser
          </p>
        </header>

        <Callout tone="warn" title="This is a model, not advice" style={{ marginBottom: 20 }}>
          Every figure is an estimate built on assumptions you can and should
          change. Cost and salary data comes from published {SCHOOL_DATA_AS_OF} sources
          and goes stale quickly. Verify loan terms with lenders and costs with
          schools before making a decision this size.
        </Callout>

        {/* Funding controls: shared across the financing and equity tabs */}
        {(tab === "financing" || tab === "equity") && (
          <>
            <div style={{ background: `linear-gradient(135deg, ${C.panel}, ${C.panelAlt})`, border: `1px solid ${C.accent}44`, borderRadius: 14, padding: "22px 26px", marginBottom: 8, boxShadow: `0 0 40px ${C.accent}0a` }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", color: C.accent, marginBottom: 16, fontWeight: 600 }}>
                ⚙ Funding — drives every tab
              </div>
              <Grid cols="repeat(auto-fit, minmax(250px, 1fr))" gap={26}>
                <Slider label="Scholarship" value={scholarshipTotal(profile)}
                  min={0} max={Math.max(100000, Math.ceil(financing.cost / 10000) * 10000)} step={2500}
                  onChange={v => update(setScholarshipTotal(profile, v))} format={f.money}
                  description="Total award across the whole programme." />
                <Slider label="Cash deployed" value={Math.min(cfg.savingsDeployed, maxDeployable)}
                  min={0} max={Math.max(10000, Math.ceil(Math.max(cfg.liquidAssets, 10000) / 10000) * 10000)} step={2500}
                  onChange={v => update(setCashDeployed(profile, v))} format={f.money}
                  description={`Cash put toward tuition, from ${f.money(cfg.liquidAssets)} liquid. The rest stays invested.`} />
                {profile.useDirectApr ? (
                  <Slider label="Private APR (your quote)" value={profile.directApr}
                    min={0.02} max={0.2} step={0.0025}
                    onChange={v => update({ directApr: v })} format={v => (v * 100).toFixed(2) + "%"}
                    description="From your lender. Switch back to score-based estimates in Settings." />
                ) : (
                  <Slider label="Credit score" value={profile.creditScore}
                    min={580} max={820} step={10}
                    onChange={v => update({ creditScore: v })} format={v => String(v)}
                    description="Estimates your private APR. Enter a real quote in Settings if you have one." />
                )}
              </Grid>
            </div>
            <div style={{ fontSize: 11, color: C.fainter, marginBottom: 4, textAlign: "right" }}>
              Financing {f.money(financing.need)} · {f.money(financing.totalPmt)}/mo · {f.pct(activeRate)} private APR
            </div>
          </>
        )}

        {tab === "financing" && (
          <>
            <LoanStructure f={f} financing={financing} scenarios={scenarios} activeRate={activeRate} profile={cfg} school={school} />
            <MonteCarlo f={f} core={core} profile={cfg} pathSummary={pathSummary} />
            <CreditImpact f={f} financing={financing} credit={credit} profile={cfg} />
            <SchoolComparison f={f} schools={schools} profile={cfg} />
            <CapitalStack f={f} strategies={strategies} profile={cfg} />
            <Sensitivity f={f} sensitivity={sensitivity} tradeoff={tradeoff} profile={cfg} />
            <InvestVsDeploy f={f} invest={invest} update={update}
              profile={{ ...cfg, __schoolYears: Math.ceil(school.programYears) }} />
            <Recommendations f={f} financing={financing} core={core} schools={schools}
              nw={nw} invest={invest} profile={cfg} tradeoff={tradeoff} />
          </>
        )}

        {tab === "career" && (
          <>
            <NetWorthProjection f={f} nw={nw} profile={cfg} update={update} school={school} />
            <OutcomeTiers f={f} tiers={tiers} profile={cfg} update={update} />
          </>
        )}

        {tab === "equity" && equityOn && (
          <>
            <EquitySellVsHold f={f} result={sellHold} profile={cfg} update={update} />
            <EquityStrategy f={f} strategies={equityStrategies} profile={cfg} update={update} />
          </>
        )}

        {tab === "fire" && (
          <FireProjection f={f} fire={fire} profile={cfg} update={update} />
        )}

        {tab === "summary" && (
          <SummaryView
            f={f} financing={financing} core={core} nw={nw} invest={invest}
            tiers={tiers} fire={fire} sellHold={sellHold} schools={schools}
            profile={cfg} onNavigate={setTab}
          />
        )}

        {!equityOn && tab === "financing" && (
          <Callout tone="info" style={{ marginTop: 26 }}>
            Have vesting company stock? Add it in{" "}
            <button onClick={() => setShowSettings(true)}
              style={{ background: "none", border: "none", color: C.accent, cursor: "pointer", textDecoration: "underline", fontSize: "inherit", padding: 0 }}>
              Settings → Equity
            </button>{" "}
            to unlock the sell-versus-borrow and diversification models.
          </Callout>
        )}

        <footer style={{ textAlign: "center", fontSize: 10.5, color: C.fainter, padding: "34px 0 8px", lineHeight: 1.8 }}>
          Seeded PRNG (seed {profile.seed}) · no server, no analytics, no tracking<br />
          Open source under the MIT licence. Educational tool only — not financial, tax, or legal advice.
        </footer>
      </div>
    </div>
  );
}
