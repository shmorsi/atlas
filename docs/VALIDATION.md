# Scenario Studio validation — 2026-10-10

The v0.1.2 update passed **44 backend tests** (5.57 seconds) and the complete **27-test Chromium suite** (1.0 minute) against a production FastAPI build at localhost:8002. TypeScript/Vite build and source/model integrity checks also passed. The suite replays all six GRU and six graph/no-graph checkpoints.

New mathematical checks compare PyTorch against the independent SciPy network solver, test superposition and zero pass-through, reconcile source contributions and the finite-round tail, verify autograd using finite differences, and reject ambiguous or invalid requests. Browser checks exercise combined shocks, exports, live checkpoint replay, failed and superseded requests, and 1440/820/390 pixel layouts. All existing tests remain in the suite; the former fictional guided scenario journey now checks the observed-network studio and access to the mathematical sandbox.

Desktop/mobile screenshots were inspected. A narrow-screen map framing issue was corrected with container resize observation and initial geographic bounds. The new studio is lazy-loaded (22.46 kB JS / 7.31 kB gzip, plus 8.40 kB CSS / 2.37 kB gzip). The pre-existing large map/chart bundle advisory and upstream TestClient deprecation warning remain. These are local Chromium results, not cross-browser or human comprehension certification.

The historical records below describe the previous v0.1.1 baseline; its cross-platform CI results should not be mistaken for validation of a later commit.

---

# Validation record — 2026-10-09

Environment: macOS ARM64, Python 3.12.14, Node 22.23.3, Playwright Chromium 156. All model execution used CPU. Final browser checks target a single production FastAPI server on loopback port 8001.

| Check | Observed result |
|---|---|
| `npm run test:backend` | **40 passed**, 5.09 seconds; upstream TestClient/httpx deprecation warning |
| `npm run build` | TypeScript and Vite passed; large-bundle advisory remains; no circular chunk warning |
| Full `npm run test:ui` | **22 passed**, 45.7 seconds: country search/year/comparison, equations, portfolios, inference, network scenarios, event filters/update failure, offline map, actual geographic interactions, four responsive widths and screenshot comparisons |
| `npm run verify:release` | Six GRU models × 10 targets (means/intervals) and six graph models × 405 nodes replayed; all source/evaluation hashes passed |
| Independent raw ICIO audit | Six transaction blocks plus buyer outputs across 2016/2020/2022 agree with standard-library CSV/Decimal sums within 1e-7 million USD; actual maximum transaction error 4.55e-13 |
| OECD integrity | Seven aggregates, orientation, conservation, spectral stability, raw missingness and retained accounting exceptions checked |
| Public refresh failures | Total and partial source failures preserve previously published caches and staged raw files; untrusted browser mutation origin rejected |
| Latest annual cache | 660 separate 2025 rows, 592 nonmissing; frozen forecasting dataset hash unchanged |
| Dependency consistency | `pip check`: no broken requirements |
| Offline UI | All non-local requests blocked in browser test; normal exploration remains functional |

Desktop and mobile screenshots are visually inspected. The 2025 default year and OECD navigation copy intentionally changed the research desktop and guided desktop/mobile baselines; subsequent comparisons passed without updating them. Network desktop/mobile and official-event desktop/mobile screenshots cover the newly implemented views. Official announcements use stacked headline cards on narrow screens, keeping the titles directly readable. A real mobile grid overflow found by testing was fixed. No failing tests were removed.

The population overlay now loads on demand. The initial main JavaScript bundle decreased from 2,648.66 kB (777.24 kB gzip) to 1,884.09 kB (561.01 kB gzip), about 28% less compressed initial JavaScript. Browser checks verify that its chunk is absent before use and that its canvas appears, disappears and reappears on toggles. Map/chart assets remain substantial; this is not a whole-page speed benchmark.

LOCAL_LATENCY.json records ten warm sequential loopback requests per operation: median 6.47 ms for 2025 countries, 5.31 ms for Japan's network profile, 11.00 ms for a 405-node scenario and 40.51 ms for GRU replay. These are measurements on this machine, not concurrent-load, cold-start or other-hardware guarantees.

Earlier evidence: all three learning notebooks executed with saved outputs; setup and dependency checks passed. Setup now retains supplied processed caches and runs the release gate rather than unnecessarily rewriting frozen Parquet files. Windows/Linux/Safari/Firefox clean installation and human accessibility/comprehension tests are not verified here.

A passing engineering suite does not establish causal identification, investment profitability or forecast reliability. The graph experiment has only one held-out year; ridge is the best tested baseline. Read RESEARCH_REPORT.md and BUILD_STATUS.md for the scientific boundary.

After the full suite, the three new network/event tests passed again (10.4 seconds), including readable mobile headline cards and the extended resize check.

## Cross-platform CI — 2026-10-10

[GitHub Actions run 38019581232](https://github.com/shmorsi/atlas/actions/runs/38019581232) passed on ubuntu-latest, macos-latest and windows-latest after fixing shell invocation of the Windows Python executable. Each job installed dependencies, ran setup and artifact checks, ran all backend tests, verified model replay and built the production frontend. This establishes clean runner setup/backend/build coverage; browser interaction tests remain local Chromium evidence.
