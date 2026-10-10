# ATLAS Scenario Studio — research and proposed design

Research date: 2026-10-09. This is the design recommendation before implementation, not a claim that these capabilities are already built. Default product direction: understand world events and optionally connect them to an ETF portfolio. The existing application is unchanged by this research pass.

## Product decision

Replace the introductory three-industry slider as the main What if? experience. Retain it as a short optional lesson. Make the main experience a Scenario Studio that answers four questions in order: What changed? How could it spread? What am I exposed to? How sensitive is the result to the assumptions?

Include ETFs as the portfolio layer. An ETF is an investment instrument holding exposures, not a mechanism that converts a headline into a return. Its market price can differ from its underlying net asset value. Track price/NAV return conventions explicitly. [SEC investor education](https://www.investor.gov/introduction-investing/investing-basics/investment-products/mutual-funds-and-exchange-traded-2).

Professional scenario systems combine narratives, risk-factor assumptions and portfolio analysis. The useful pattern for ATLAS is an inspectable chain of assumptions and attribution, not reproducing proprietary systems or implying comparable coverage. [BlackRock scenario construction](https://www.blackrock.com/aladdin/platforms/solutions/aladdin-wealth/making-of-a-market-driven-scenario), [MSCI credit-crisis scenario](https://www.msci.com/research-and-insights/blog-post/scenario-analysis-how-could-a-credit-crisis-affect-portfolios).

## The user journey

1. Choose a scenario: Higher interest rates, Energy supply disruption, Recession, Credit stress, Trade disruption, or Stronger productivity. Each card explains the question and the supported method. Unsupported quantitative channels remain explanatory, not assigned invented numbers.
2. Choose the view: Explore the world, Test an ETF basket, or My portfolio. The world view must work without creating holdings.
3. Inspect assumptions: reference date, affected places, severity, horizon where supported, and the factor changes. A narrative preset is an editable hypothesis. Mild/moderate/severe labels only become numerical presets after a documented calibration; they are not event probabilities.
4. Run and read a plain-language summary, exposure map, portfolio contribution chart and assumption sensitivity. Expand methods only when needed.
5. Compare baseline with scenario A/B/C, save a reproducible scenario, or adjust holdings and rerun exactly the same assumptions.

On the first screen show one clear action and at most three decisions. Advanced factor edits and diagnostics open progressively. This applies established progressive-disclosure principles to ATLAS; the exact layout remains a design proposal. [NN/g complex application design](https://www.nngroup.com/articles/complex-application-design/).

## Three calculation modes that must remain distinct

| Mode | Question | Required evidence | Result label |
|---|---|---|---|
| Historical replay | How would this fixed basket have performed over a specified past period? | Actual total-return histories, common dates, weights and trading convention | Historical replay of today's hypothetical basket |
| Explicit stress | What if these market factors moved by these amounts? | User-specified or documented calibrated shocks, exposures and pricing assumptions | Conditional stress estimate |
| Model simulation | What range arises under this fitted model and scenario? | Trained factor model, chronological validation, dependent residual sampling and uncertainty checks | Model-conditioned simulation |

Historical examples can include 2008, March 2020 and the 2022 tightening period, with explicit start/end dates. An ETF that did not yet exist cannot acquire fabricated returns. A substituted benchmark must be labeled as a proxy; current holdings must not be presented as historical holdings. Comparing different inception windows requires either a common period or separate results.

Stress tests are conditional exercises. Even the Federal Reserve explicitly distinguishes its stress scenarios from forecasts. ATLAS should not display the chance of an event unless an independently validated probability model exists. [Federal Reserve 2026 scenarios](https://www.federalreserve.gov/publications/2026-stress-test-scenarios.htm).

## Separate economic and market channels

The conceptual flow is event narrative → explicit assumptions → economic dependencies and market factors → instrument valuation/exposure → portfolio effects. This is a proposed workflow, not proof that every arrow is causally estimated.

The OECD module can explain historical supplier dependence and fixed-coefficient unit-cost propagation. Its 2022 structure, broad Energy group and gross-output weighting do not directly estimate oil-price changes, inflation, GDP losses or ETF returns. Keep that economic pane separate from the financial return calculation until a bridge is genuinely estimated and validated. Never feed a modeled production-cost percentage directly into a stock-return coefficient.

Different causes of an oil-price move can imply different stock-market responses. An energy-supply disruption and an oil-demand boom therefore need different narratives and assumptions, even if both posit the same oil price. [Kilian and Park, original research](https://doi.org/10.1111/J.1468-2354.2009.00568.X).

For the first financial engine:

- Government bonds: approximate immediate price sensitivity from dated duration/key-rate exposures, with convexity only when definitions and units match. A policy-rate change is not automatically an equal shift of every Treasury yield. Issuer pages expose relevant fields, but availability and methodology must be checked per instrument. [Example: GOVT issuer data](https://www.ishares.com/us/products/239468/GOVT).
- Corporate bonds: separate government-curve and credit-spread shocks. Default losses/liquidity effects need separate assumptions; avoid counting the spread effect twice.
- Equity ETFs: transparent fitted market/sector/style/FX factor sensitivities, validated against simple baselines. Factor associations are not identified causal effects of news. Flag severe extrapolation.
- Portfolio: aggregate instrument effects using explicit holdings, reporting return and currency P&L. For immediate stress, do not invent a time path, recovery time, drawdown or annualized return.

For longer horizons, require an explicit path model that handles carry, changing exposures, distributions, FX, compounding and rebalancing. Do not rescale an immediate stress to 12 months. Joint-event scenarios specify one coherent factor vector/path; they do not add separately computed scenario returns. Correlations and nonlinearities may change under stress.

## ETF coverage and data contract

Start with a deliberately small research universe: broad US equities, developed ex-US equities, emerging markets, technology, energy, short/intermediate/long government bonds, investment-grade credit and high-yield credit. A gold exposure can follow once the product structure and data convention are supported. This is a coverage design, not a list of funds to buy. Defer leveraged/inverse products, options strategies and futures-based commodity products because their path/roll/derivative behavior requires additional modeling.

Every instrument needs ticker plus stable identifier, exchange, currency, fund structure, inception date, benchmark, source/terms, observation date and retrieval date. Historical returns must specify price versus NAV, corporate actions, distributions and FX convention. Holdings/exposures need an as-of date; current holdings are insufficient to establish past composition. Listing country, company domicile, revenue geography and production location are distinct exposure concepts.

Audit publicly accessible sources for actual reuse permission and coverage before bundling data. A public webpage does not guarantee rights to redistribute a historical feed. The existing local CSV import remains a useful fallback, but user-attested data cannot be labeled independently verified. Missing or stale exposures must remain visible.

## What results should show

The first result is an explanation tied to the chosen inputs: which exposure dominates and why. Below it: portfolio baseline/stressed value if computable, top contributors, country/sector exposure, and the assumptions that most change the answer. Every number carries its method, horizon and data date.

Distinguish three different ranges: a range from changing assumptions, an estimated parameter interval, and a simulated outcome distribution. Do not relabel all of them as confidence intervals. Simulation draws preserve cross-asset dependence; scenario likelihood is separate. Validate coverage before interpreting nominal quantiles as reliable uncertainty bounds.

Compare portfolios across the same scenario set. Later optimization should expose concentration, turnover, cost and multiple-scenario tradeoffs; never present a single optimized basket as universally safe or a guaranteed best portfolio. Stress selection can materially change the preferred allocation.

## PyTorch's role

Keep Python/FastAPI as the backend, PyTorch for learned models, and NumPy/SciPy/CVXPY for deterministic valuation and optimization. Do not replace correct pricing mathematics with a neural network just to use PyTorch.

The current annual GRU and tiny OECD graph experiment are not ETF event-response models. Train any new return model on its own suitable dataset with chronological splits, train-only preprocessing, purged overlapping target windows where applicable, baselines, all seeds, regime diagnostics and a held-out model-selection protocol. Retain a model only if its validated behavior warrants the complexity. Monte Carlo generates consequences of assumptions; more paths do not establish those assumptions as true.

## Futuristic visual direction

A calm, spatial research interface: retain graphite and amber, add restrained cyan for selection/connectivity, and reserve semantic colors for clearly labeled changes. Use large readable typography, thin borders, subtle depth and a quiet background grid. Make the scenario narrative and result explanation visually dominant.

Desktop: a compact scenario strip above the map, an adjacent impact panel and a scrollable explanation below. Mobile: scenario → summary → explanation → exposures, with stacked ETF/result cards. The map is a supporting view, not the only way to read results. A 3D globe may be optional; no always-running cinematic scene or artificial live ticker.

Animate only to explain a transition, with reduced-motion support and no dependence on hover or color alone. Maintain keyboard access, visible focus, sufficient contrast and text/table alternatives. Target WCAG 2.2 AA and voluntarily respect reduced-motion preferences; a futuristic appearance must not reduce readability. [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/).

## Implementation order and release evidence

1. Replace the main scenario journey and connect existing real-network analysis, with explicit separate economic/financial panes. Move the fictional lesson into Learn.
2. Establish the instrument registry and source/return contracts; implement historical replay and immediate bond/portfolio stress with testable conventions.
3. Add validated equity-factor scenarios and joint-event comparisons. Keep unsupported channels visibly unquantified.
4. Add model-conditioned paths and uncertainty only after the evaluation gates; then test constrained multi-scenario allocation.

Acceptance: zero shocks preserve baseline; P&L contributions reconcile; curve/spread units are verified; scenario edits clear stale outputs; saved runs replay exactly; no historical return precedes inception; no future-held-out data enter training; combined scenarios avoid duplicate factors; supported data dates are visible; missing inputs do not become zeros. Test mobile, keyboard, reduced-motion behavior and offline cached operation. Ask five unfamiliar users to explain the scenario assumptions and distinguish history from modeled results before calling the workflow understandable.

## Decision

Build one coherent Scenario Studio with optional ETF/portfolio analysis. Keep world exploration useful on its own. Its sophistication should come from traceable assumptions, explainable dependencies, realistic portfolio calculations and honest uncertainty. The present single-slider teaching example belongs in learning material rather than serving as the product's central What if? feature.
