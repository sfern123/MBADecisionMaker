# MBA Finance Simulator

An open, client-side Monte Carlo simulator for the money side of an MBA
decision: how much you'll borrow, what it costs, whether the payment is
survivable, and how the whole thing compares to not going at all.

**Your numbers never leave your browser.** No server, no account, no
analytics, no network requests. Everything runs locally and persists only in
your own `localStorage`.

---

## What it does

Five tabs of linked analysis, all driven from one set of inputs, all
recalculating live as you change them.

### Financing
| | |
|---|---|
| **Loan structure** | Cost, financing need, the split between capped and private debt, and what each rate scenario costs |
| **Monte Carlo** | Thousands of simulated career outcomes → distributions for net wealth and first-year payment burden |
| **Credit impact** | What each credit tier does to the private tranche |
| **School comparison** | Up to six programmes side by side on cost, debt, expected wealth, and downside |
| **Capital stack** | How much of your cash to deploy vs. keep liquid |
| **Sensitivity** | How the picture responds across deployment levels, plus the stress-vs-wealth tradeoff curve |
| **Invest vs. deploy** | Pay down the loan, or keep the cash invested and borrow more? Month by month |

### Go or don't
| | |
|---|---|
| **Net worth trajectory** | Against staying in your current job, with a crossover year and a P10–P90 band |
| **Outcome tiers** | Odds of reaching each pay level and seniority rung, with and without the degree |

### Equity *(appears only if you hold company stock)*
| | |
|---|---|
| **Sell vs. hold** | Sell vested shares to cut tuition debt, or keep them and borrow more? Returns a distribution and a win probability, not a verdict |
| **Diversification strategy** | Four ways to handle vesting equity, scored on wealth, worst drawdown, *and* how concentrated you end up |

### Independence
| | |
|---|---|
| **FIRE / Coast FIRE** | When the portfolio could cover your spending, with tax-aware withdrawal ordering across account types |

### Summary
Every model's answer on one page, plus an explicit list of where they
**disagree** — and which single assumption each conclusion is resting on.

## Why it's built to be adapted

Most MBA cost calculators bake in one person's assumptions. This one makes
them all data:

- **Career paths are a library, not a constant.** Fifteen archetypes spanning
  consulting, banking, PE/VC, tech, industry, healthcare, entrepreneurship,
  and the nonprofit/public sector — each with its own growth rate, volatility,
  and optional lumpy upside (carried interest, an equity event, a promote).
  Weight the ones you'd actually consider, edit any figure, or add your own.
- **Programme length is modelled.** A one-year European MBA has roughly half
  the opportunity cost of a two-year US programme, and the simulation treats
  that properly rather than assuming two years.
- **Loan rules are swappable.** Presets for US federal borrowing before and
  after the July 2026 OBBBA changes, plus a fully custom mode for non-US
  programmes, employer sponsorship, or a lender quote you already hold.
  Repayment term, grace period, caps, and the score→APR tiers are all editable.
- **Non-USD programmes work.** Currency is a display setting (no FX
  conversion — the app tells you when you're comparing across currencies).
- **Equity is a generic holding, not one company.** Growth presets are
  asset-class reference points (broad index, mature large-cap, high-growth,
  stagnation) rather than one employer's past decade — anchoring on a single
  stock's history is how concentration risk gets rationalised.
- **The career ladder is defined in multiples, not dollars.** The same
  structure describes a consulting partner track, a banking MD track, or a
  corporate GM track. You supply the base; the multiples scale from it.
- **The MBA's promotion acceleration is a visible slider.** It is the single
  most contestable input in the tool and it decides the answer, so it sits on
  the page at `1.60×` by default rather than buried in the code. Set it to
  `1.00×` and the two paths differ only by starting salary and two lost years.
- **Tax is progressive where it matters.** Current-year US federal brackets
  plus a state rate for capital gains and retirement withdrawals, with a flat
  rate everywhere else — and a flat-rate mode for use outside the US.

## Data, and how much to trust it

Every shipped figure carries its source and date in the data files:

- **Cost of attendance** — [Clear Admit's 2025-26 COA table](https://www.clearadmit.com/real-numbers-of-mba-admissions/cost-of-mba-programs-in-the-u-s/), for a single non-resident student living off campus.
- **School compensation** — [Poets&Quants' Class of 2025 salary and bonus data](https://poetsandquants.com/2026/05/31/high-low-mba-salaries-bonuses-at-the-top-100-u-s-b-schools/). Schools without a confirmed figure are flagged in the UI and do **not** silently scale your salary assumptions.
- **Career-path compensation** — employment reports and recruiter surveys where available. Paths marked `est` in the UI are reasoned industry estimates, not published figures, and are labelled as such.
- **Tax brackets** — [IRS Revenue Procedure 2025-32 via the Tax Foundation](https://taxfoundation.org/data/all/federal/2026-tax-brackets/), tax year 2026, single filer. State rates are flat approximations of the top marginal combined rate.
- **The career ladder is structural, not empirical.** Nobody publishes reliable long-run promotion rates by degree. Those multiples and probabilities are reasoned defaults, useful for asking *"how much acceleration would the degree need to provide for this to be worth it?"* — not as a forecast.
- **Rows with inconsistent source data** carry an explicit warning (e.g. a school whose listed COA swung implausibly year over year, usually a resident/non-resident reporting change).

**These numbers go stale every single year.** Schools revise cost of
attendance annually and federal loan rates reset every 1 July. Treat the
shipped data as a starting point and replace it with the figures on your own
admit letter and the school's own employment report. Every field is editable.

## Running it

```bash
npm install
npm run dev
```

Then open the URL it prints. To build:

```bash
npm run build
```

### Deploying to GitHub Pages

A workflow is included at `.github/workflows/deploy.yml`. Enable Pages for the
repository with "GitHub Actions" as the source, and push to `main`. The
workflow sets `VITE_BASE` to your repository name so asset paths resolve
correctly on a project page.

## Your data

- Stored in `localStorage` on your device, nowhere else.
- **Export / import** a scenario as JSON to keep a snapshot or move between devices.
- **Copy a share link** encodes your inputs in the URL fragment. Fragments aren't sent to servers, but anyone holding the link can read your figures — the UI says so before you use it.
- **Clear my data** wipes local storage and returns the app to a clean first run.

## Project layout

```
src/
├── data/        schools · careerPaths · loanPresets      (sourced and dated)
│                taxData · equityPresets · ladder
├── lib/         random · finance · stats · tax · equity  (pure, no UI, testable)
│                simulation · equityDecisions · ladder · fire
├── state/       defaults · useProfile                    (localStorage persistence)
└── components/  ui · Onboarding · SettingsPanel · sections/
```

Every module under `src/lib/` is pure JavaScript with no React dependency, so
you can run scenarios headlessly:

```bash
node --input-type=module -e "
  import('./src/lib/simulation.js').then(async sim => {
    const d = await import('./src/state/defaults.js');
    const cfg = d.toSimConfig(d.makeDefaultProfile());
    console.log(sim.resolveFinancing(cfg));
  });"
```

## Contributing

The most useful contribution is **fresher data**. If a school's cost of
attendance or employment report has been updated, edit the row in
`src/data/schools.js` and update its `coaAsOf` / `compAsOf` and source URL in
the same change. Same for `src/data/careerPaths.js`.

## Disclaimer

This is an educational tool, not financial, tax, or legal advice. Every output
is an estimate built on assumptions you control, using data that ages. It does
not model income-driven repayment, loan forgiveness, employer sponsorship, tax
brackets, relocation, or scholarship renewal conditions — and it cannot price
the things people actually cite about business school afterwards. Verify loan
terms with lenders and costs with schools before making a decision this size.

## Licence

MIT. See [LICENSE](LICENSE).
