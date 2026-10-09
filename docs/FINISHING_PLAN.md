# Finishing ATLAS

Updated 2026-10-09. The goal is a clear, trustworthy product with reproducible research. “Perfect” is not a verifiable release criterion. The gates below distinguish a usable atlas from completion of the original quantitative specification.

## 1. Make the first visit understandable

Implemented: Guided mode is the default; four navigation choices replace eight for beginners. The page moves from choosing a country to understanding four measures, then comparing economies. Technical options are disclosed on demand. The What if? example has one input, a plain-language result and visible assumptions. Research mode retains the detailed tools. The map lets ordinary scrolling pass through.

Evidence: browser checks at 390, 820, 1440 and 1920 pixels; desktop/mobile visual baselines; country/year/comparison interactions; missing-data and service-error states; scenario recalculation and stale-result clearing; full research regression coverage.

Before calling the beginner experience validated, run a moderated trial with at least five people unfamiliar with economics. Ask each to find a country, explain the growth figure, compare the same year, and distinguish a hypothetical result from observed history. Proposed acceptance: at least four of five complete every task without coaching and all five recognize the hypothetical example. Record misunderstandings and revise copy/navigation before repeating. Automated tests cannot establish this comprehension.

## 2. Finish the real economic network

Implemented: the supplied OECD archive and metadata are imported. Seven 405-node aggregates preserve raw flow/output sums, retain source accounting exceptions, pass stability checks and agree with independent Decimal CSV samples. The UI exposes supplier flows, geographic relationships, direct/indirect scenarios and an exploratory graph/no-graph evaluation. The fictional teaching network remains separate.

Further evidence requires a longer historical panel and genuine release vintages. Current graph results have only one held-out year; ridge wins. The historical structure ends in 2022 and must not be labeled current.

## 3. Complete finance and forecasting evidence

Implemented in the local release: observed Treasury curves, trailing-window portfolio re-estimation, drifting weights, repeated transaction costs and original/equal-weight comparisons over identical dates. Still required: appropriately licensed ETF total-return histories, historical release vintages, defined multiple stress scenarios and defensible expected-return models.

For forecasts, freeze a chronological evaluation protocol before experiments. Fit transformations on training data only, respect actual release availability, report every seed and baseline, and evaluate uncertainty coverage. The trained graph/no-graph experiment now uses the verified network and matched output panel. Present negative results. Do not infer causal macro-to-market transmission from predictive associations.

Acceptance: clean replay reproduces data splits, predictions, tables and saved checkpoints; limitations are visible beside results. No profitability, causal effect or model-superiority claim without supporting evidence.

## 4. Harden the release

- Run keyboard and screen-reader review, contrast checks, reduced-motion checks and touch-device testing. Current browser automation is Chromium on macOS; it is not a full accessibility audit.
- Verify clean installation and offline operation on supported macOS, Windows and Linux environments, plus Safari and Firefox where WebGL2 is available.
- Measure cold startup, interaction latency and memory on a representative ordinary laptop. Split large research/chart bundles if measured loading warrants it; the current production build retains a size advisory.
- Exercise malformed uploads, long country names, empty historical series, connection loss/retry and unavailable research data. Keep results tied to current inputs.
- Rerun backend, production-build and browser suites; inspect intentional visual changes before accepting new baselines. Package source, dependency locks, provenance and a clear limitations page.

Release labels should match the evidence: the current app is a working local atlas with teaching and research foundations. The remaining research and release boundaries are recorded in BUILD_STATUS.md, alongside implemented features. Do not hide the unfinished modules behind polished presentation.
