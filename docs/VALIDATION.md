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
