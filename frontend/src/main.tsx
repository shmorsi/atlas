import React, { useEffect, useRef, useState, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import {
  Globe2,
  Network,
  FlaskConical,
  ChartNoAxesCombined,
  BriefcaseBusiness,
  History,
  BookOpen,
  Search,
  Database,
  ChevronRight,
  Layers,
} from "lucide-react";
import { WorldMap } from "./WorldMap";
import { Chart } from "./Chart";
import { api, Country, Observation, format, indicators } from "./types";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "./style.css";
import "./guided.css";
import { GuidedAtlas } from "./GuidedExperience";
const ScenarioStudio = lazy(() =>
  import("./ScenarioStudio").then((m) => ({ default: m.ScenarioStudio })),
);
const CurrentEvents = lazy(() =>
  import("./CurrentEvents").then((m) => ({ default: m.CurrentEvents })),
);
const NetworkWorkspace = lazy(() =>
  import("./NetworkWorkspace").then((m) => ({ default: m.NetworkWorkspace })),
);
const StructuralLab = lazy(() =>
  import("./ResearchWorkspaces").then((m) => ({ default: m.StructuralLab })),
);
const RatesLab = lazy(() =>
  import("./ResearchWorkspaces").then((m) => ({ default: m.RatesLab })),
);
const PortfolioLab = lazy(() =>
  import("./ResearchWorkspaces").then((m) => ({ default: m.PortfolioLab })),
);
const ForecastLab = lazy(() =>
  import("./ResearchWorkspaces").then((m) => ({ default: m.ForecastLab })),
);
const HistoricalLab = lazy(() =>
  import("./ResearchWorkspaces").then((m) => ({ default: m.HistoricalLab })),
);
const guidedNames: Record<string, string> = {
  "World Atlas": "Explore the world",
  "Shock Laboratory": "What if?",
  "Portfolio Studio": "My portfolio",
  "Research & Methods": "How it works",
};
const modules = [
  ["World Atlas", Globe2],
  ["Economic Network", Network],
  ["Shock Laboratory", FlaskConical],
  ["Macro Forecasting", ChartNoAxesCombined],
  ["Rates & Markets", ChartNoAxesCombined],
  ["Portfolio Studio", BriefcaseBusiness],
  ["Historical Events", History],
  ["Research & Methods", BookOpen],
] as const;
function App() {
  const [latestYear, setLatestYear] = useState(2025);
  useEffect(() => {
    api<any>("/data/coverage")
      .then((d) => {
        setLatestYear(d.latest_year);
        setYear((y) => (y === 2025 ? d.latest_year : y));
      })
      .catch(() => {});
  }, []);

  const [experience, setExperience] = useState<"guided" | "research">("guided");
  const [countries, setCountries] = useState<Country[]>([]),
    [selected, setSelected] = useState("JPN"),
    [history, setHistory] = useState<Observation[]>([]),
    [year, setYear] = useState(2025),
    [query, setQuery] = useState(""),
    [region, setRegion] = useState("All regions"),
    [indicator, setIndicator] = useState("NY.GDP.MKTP.KD.ZG"),
    [globe, setGlobe] = useState(false),
    [workspace, setWorkspace] = useState("World Atlas"),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [detailError, setDetailError] = useState(""),
    [detailLoading, setDetailLoading] = useState(false),
    [refresh, setRefresh] = useState(0),
    [sources, setSources] = useState<any[]>([]),
    [sourcesError, setSourcesError] = useState("");
  const search = useRef<HTMLInputElement>(null);
  const [inspectorWidth, setInspectorWidth] = useState(285);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api<{ countries: Country[] }>(`/countries?year=${year}`)
      .then((d) => {
        if (active) setCountries(d.countries);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [year, refresh]);
  useEffect(() => {
    let active = true;
    setDetailLoading(true);
    setDetailError("");
    setHistory([]);
    api<{ observations: Observation[] }>(`/countries/${selected}`)
      .then((d) => {
        if (active) setHistory(d.observations);
      })
      .catch((e) => {
        if (active) setDetailError(e.message);
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selected, refresh]);
  useEffect(() => {
    api<any[]>("/sources")
      .then(setSources)
      .catch((e) => setSourcesError(String(e)));
    function key(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setWorkspace("World Atlas");
        setTimeout(() => {
          const target = document.getElementById(
            "guided-search",
          ) as HTMLInputElement | null;
          (target || search.current)?.focus();
        }, 0);
      }
      if (e.key === "Escape") setQuery("");
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [workspace]);
  const c = countries.find((c) => c.id === selected),
    filtered = countries
      .filter(
        (c) =>
          (region === "All regions" || c.region === region) &&
          (c.name.toLowerCase().includes(query.toLowerCase()) ||
            c.id.toLowerCase().includes(query.toLowerCase())),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  const series = history.filter(
    (o) => o.indicator === indicator && o.year >= 2000 && o.year <= year,
  );
  const available = countries.filter(
    (c) => c.indicators[indicator]?.value != null,
  ).length;
  return (
    <div
      className={`app ${experience === "guided" ? "guided-mode" : "research-mode"}`}
    >
      <a className="skip-link" href="#content">
        Skip to content
      </a>
      <aside className="rail">
        <a
          className="brand"
          href="#"
          onClick={() => setWorkspace("World Atlas")}
        >
          <span className="brand-mark">A</span>
          <span className="brand-word">ATLAS</span>
          <span className="edition">RESEARCH</span>
        </a>
        <div className="rail-label">
          {experience === "guided" ? "YOUR EXPLORATION" : "WORKSPACES"}
        </div>
        <nav>
          {modules
            .filter(
              ([name]) =>
                experience === "research" ||
                [
                  "World Atlas",
                  "Shock Laboratory",
                  "Portfolio Studio",
                  "Research & Methods",
                ].includes(name),
            )
            .map(([name, Icon], i) => (
              <button
                key={name}
                aria-label={
                  experience === "guided" ? guidedNames[name] || name : name
                }
                className={workspace === name ? "active" : ""}
                onClick={() => setWorkspace(name)}
              >
                <Icon size={17} />
                <span>
                  {experience === "guided" ? guidedNames[name] || name : name}
                </span>
                <small>{String(i + 1).padStart(2, "0")}</small>
              </button>
            ))}
        </nav>
        <div className="rail-bottom">
          <Database size={17} />
          <div>
            Local research environment
            <small>Cached data · CPU compatible</small>
          </div>
        </div>
      </aside>
      <div className="main" id="content" tabIndex={-1}>
        <header className="topbar">
          <div className="breadcrumb">
            Research terminal <ChevronRight size={14} />
            <strong>{workspace}</strong>
          </div>
          <div
            className="experience-switch"
            role="group"
            aria-label="Experience"
          >
            <button
              aria-pressed={experience === "guided"}
              onClick={() => setExperience("guided")}
            >
              Guided
            </button>
            <button
              aria-pressed={experience === "research"}
              onClick={() => setExperience("research")}
            >
              Research
            </button>
          </div>
          <span className="offline">SAVED DATA</span>
          <span className="version">ATLAS / 0.1.2</span>
        </header>
        {experience === "guided" && (
          <nav className="guided-mobile-nav" aria-label="Explore ATLAS">
            {[
              ["World Atlas", "Explore"],
              ["Shock Laboratory", "What if?"],
              ["Portfolio Studio", "Portfolio"],
              ["Research & Methods", "About"],
            ].map(([key, label]) => (
              <button
                key={key}
                aria-current={workspace === key ? "page" : undefined}
                onClick={() => setWorkspace(key)}
              >
                {label}
              </button>
            ))}
          </nav>
        )}
        <div className="page-heading">
          <div>
            <div className="eyebrow">GLOBAL ECONOMIC INTELLIGENCE</div>
            <h1>
              {workspace}
              <span>/ {workspace === "World Atlas" ? "01" : "RESEARCH"}</span>
            </h1>
          </div>
          <div className="heading-note">
            Explore the structure.
            <br />
            <strong>Understand the exposure.</strong>
          </div>
        </div>
        <Suspense
          fallback={
            <section className="research" role="status">
              Loading workspace…
            </section>
          }
        >
          {workspace === "World Atlas" ? (
            experience === "guided" ? (
              <GuidedAtlas
                latestYear={latestYear}
                countries={countries}
                selected={selected}
                onSelect={setSelected}
                year={year}
                onYear={setYear}
                history={history}
                loading={loading}
                error={error}
                detailLoading={detailLoading}
                detailError={detailError}
                onRetry={() => setRefresh((n) => n + 1)}
                onWorkspace={setWorkspace}
                onAdvanced={() => setExperience("research")}
              />
            ) : (
              <>
                <section className="toolbar">
                  <label className="search">
                    <Search size={16} />
                    <input
                      ref={search}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Find a country or ISO code"
                      aria-label="Search countries"
                    />
                    <kbd>⌘ K</kbd>
                  </label>
                  <label>
                    <span>REGION</span>
                    <select
                      aria-label="Region"
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                    >
                      {[
                        "All regions",
                        ...Array.from(
                          new Set(countries.map((c) => c.region)),
                        ).sort(),
                      ].map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>OBSERVATION YEAR</span>
                    <select
                      aria-label="Observation year"
                      value={year}
                      onChange={(e) => setYear(+e.target.value)}
                    >
                      {Array.from(
                        { length: latestYear - 1959 },
                        (_, i) => latestYear - i,
                      ).map((y) => (
                        <option key={y}>{y}</option>
                      ))}
                    </select>
                  </label>
                </section>
                {error ? (
                  <div className="error" role="alert">
                    <h2>Economic cache could not be loaded</h2>
                    <p>{error}</p>
                    <button onClick={() => setRefresh((n) => n + 1)}>
                      Retry connection
                    </button>
                  </div>
                ) : (
                  <>
                    <div
                      className="atlas-grid"
                      style={
                        {
                          "--inspector-width": `${inspectorWidth}px`,
                        } as React.CSSProperties
                      }
                      aria-busy={loading}
                    >
                      {loading && (
                        <div className="loading-overlay" role="status">
                          Loading observations for {year}…
                        </div>
                      )}
                      <section className="country-list">
                        <div className="panel-heading">
                          <span>COUNTRY INDEX</span>
                          <b>{filtered.length}</b>
                        </div>
                        <div className="list-scroll">
                          {loading && (
                            <div className="loading">Loading observations…</div>
                          )}
                          {!loading && filtered.length === 0 && (
                            <p className="muted pad">
                              No countries match this search.
                            </p>
                          )}
                          {filtered.map((x) => (
                            <button
                              key={x.id}
                              className={
                                x.id === selected
                                  ? "country selected"
                                  : "country"
                              }
                              onClick={() => setSelected(x.id)}
                            >
                              <span>
                                <strong>{x.name}</strong>
                                <small>
                                  {x.id} / {x.region}
                                </small>
                              </span>
                              <span className="country-value">
                                {format(
                                  x.indicators[indicator]?.value,
                                  indicator,
                                )}
                                {x.id === selected && (
                                  <ChevronRight size={13} />
                                )}
                              </span>
                            </button>
                          ))}
                        </div>
                        <div className="index-note">
                          Keyboard accessible country selection
                        </div>
                      </section>
                      <section className="map-panel">
                        <div className="panel-heading map-controls">
                          <span>
                            <Layers size={14} /> OBSERVATION LAYER
                          </span>
                          <select
                            aria-label="Map indicator"
                            value={indicator}
                            onChange={(e) => setIndicator(e.target.value)}
                          >
                            {Object.entries(indicators).map(([k, v]) => (
                              <option value={k} key={k}>
                                {v.label}
                              </option>
                            ))}
                          </select>
                          <button
                            className={globe ? "toggle active" : "toggle"}
                            onClick={() => setGlobe(!globe)}
                            aria-pressed={globe}
                          >
                            {globe ? "Globe" : "Flat map"}
                          </button>
                        </div>
                        <WorldMap
                          countries={countries}
                          selected={selected}
                          onSelect={setSelected}
                          indicator={indicator}
                          globe={globe}
                          region={region}
                        />
                        <div className="map-footer">
                          <span>
                            <b>{available}</b> economies with observations
                          </span>
                          <span>{year} annual data</span>
                          <span>WDI / NATURAL EARTH</span>
                        </div>
                      </section>
                      <aside className="inspector">
                        <div className="panel-heading">
                          <span>COUNTRY RESEARCH</span>
                          <input
                            className="panel-resizer"
                            aria-label="Inspector width"
                            type="range"
                            min="250"
                            max="400"
                            value={inspectorWidth}
                            onChange={(e) => setInspectorWidth(+e.target.value)}
                          />
                        </div>
                        {c && (
                          <>
                            <div className="country-title">
                              <div className="eyebrow">
                                {c.subregion} / {c.id}
                              </div>
                              <h2>{c.name}</h2>
                              <span className="tag">OBSERVED HISTORY</span>
                            </div>
                            <div className="metrics">
                              {Object.entries(indicators).map(([k, v]) => (
                                <div key={k}>
                                  <span>{v.label}</span>
                                  <strong
                                    className={k === indicator ? "accent" : ""}
                                  >
                                    {format(c.indicators[k]?.value, k)}
                                  </strong>
                                  <small>
                                    {year} · {v.unit}
                                  </small>
                                </div>
                              ))}
                            </div>
                            <div className="chart-heading">
                              <span>{indicators[indicator].label}</span>
                              <small>2000 – {year}</small>
                            </div>
                            {detailLoading ? (
                              <p className="pad">Loading history…</p>
                            ) : detailError ? (
                              <p className="error" role="alert">
                                {detailError}
                              </p>
                            ) : (
                              <Chart
                                option={{
                                  grid: {
                                    left: 50,
                                    right: 18,
                                    top: 20,
                                    bottom: 30,
                                  },
                                  tooltip: {
                                    trigger: "axis",
                                    valueFormatter: (v) =>
                                      format(Number(v), indicator),
                                  },
                                  xAxis: {
                                    type: "category",
                                    data: series.map((o) => o.year),
                                    axisLabel: {
                                      color: "#b1b6bc",
                                      interval: Math.max(
                                        1,
                                        Math.floor(series.length / 4),
                                      ),
                                    },
                                    axisLine: {
                                      lineStyle: { color: "#2a2e33" },
                                    },
                                  },
                                  yAxis: {
                                    type: "value",
                                    axisLabel: {
                                      color: "#b1b6bc",
                                      formatter: (v) => format(v, indicator),
                                    },
                                    splitLine: {
                                      lineStyle: { color: "#22262b" },
                                    },
                                  },
                                  series: [
                                    {
                                      type: "line",
                                      data: series.map((o) => o.value),
                                      connectNulls: false,
                                      showSymbol: false,
                                      lineStyle: { color: "#f4f5f7", width: 2 },
                                      areaStyle: {
                                        color: "#f4f5f7",
                                        opacity: 0.06,
                                      },
                                    },
                                  ],
                                }}
                              />
                            )}
                            <div className="source-note">
                              <Database size={14} />
                              <div>
                                World Bank · WDI
                                <small>
                                  Annual, revised historical observations.
                                  <br />
                                  Release dates and vintages unavailable.
                                </small>
                              </div>
                            </div>
                            <div className="not-available">
                              <span>Production & energy dependencies</span>
                              <p>
                                OECD historical flows are available for
                                2016–2022.
                                <button
                                  onClick={() =>
                                    setWorkspace("Economic Network")
                                  }
                                >
                                  Explore production dependencies
                                </button>
                              </p>
                            </div>
                          </>
                        )}
                      </aside>
                    </div>
                    <section className="comparison">
                      <div className="panel-heading">
                        <span>ECONOMIC CROSS-SECTION</span>
                        <small>
                          Common observation year / {year} · missing values are
                          not imputed
                        </small>
                      </div>
                      <div className="table-scroll">
                        <table>
                          <thead>
                            <tr>
                              <th>ECONOMY</th>
                              {Object.values(indicators).map((i) => (
                                <th key={i.label}>{i.label.toUpperCase()}</th>
                              ))}
                              <th>PERIOD</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(query
                              ? filtered
                              : countries.filter((x) =>
                                  [
                                    "USA",
                                    "CHN",
                                    "JPN",
                                    "DEU",
                                    "IND",
                                    "GBR",
                                    "CAN",
                                  ].includes(x.id),
                                )
                            ).map((x) => (
                              <tr
                                key={x.id}
                                onClick={() => setSelected(x.id)}
                                className={x.id === selected ? "selected" : ""}
                              >
                                <td>
                                  <button onClick={() => setSelected(x.id)}>
                                    {x.name}
                                    <small>{x.id}</small>
                                  </button>
                                </td>
                                {Object.keys(indicators).map((k) => (
                                  <td key={k}>
                                    {format(x.indicators[k]?.value, k)}
                                  </td>
                                ))}
                                <td>{year}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  </>
                )}
              </>
            )
          ) : workspace === "Economic Network" ? (
            <NetworkWorkspace selected={selected} onSelect={setSelected} />
          ) : workspace === "Shock Laboratory" ? (
            experience === "guided" ? (
              <ScenarioStudio onAdvanced={() => setExperience("research")} />
            ) : (
              <StructuralLab />
            )
          ) : workspace === "Rates & Markets" ? (
            <RatesLab />
          ) : workspace === "Portfolio Studio" ? (
            <>
              {experience === "guided" && (
                <section className="portfolio-guide">
                  <span className="eyebrow">YOUR PORTFOLIO, EXPLAINED</span>
                  <h2>See how your investments moved together.</h2>
                  <p>
                    Start with a price-history file from a source you’re allowed
                    to use. ATLAS compares the risk of your chosen mix with an
                    alternative based on that history.
                  </p>
                  <ol>
                    <li>
                      <strong>Bring your history.</strong> A CSV is a simple
                      spreadsheet saved as a text file.
                    </li>
                    <li>
                      <strong>Choose your mix.</strong> Weights are the fraction
                      invested in each asset: 0.5 means 50%.
                    </li>
                    <li>
                      <strong>Compare results.</strong> Past results describe
                      history and cannot guarantee future performance.
                    </li>
                  </ol>
                </section>
              )}
              <PortfolioLab />
            </>
          ) : workspace === "Macro Forecasting" ? (
            <ForecastLab />
          ) : workspace === "Historical Events" ? (
            <>
              <CurrentEvents onWorkspace={setWorkspace} />
              <HistoricalLab country={c} observations={history} />
            </>
          ) : workspace === "Research & Methods" ? (
            <section className="research">
              <div className="eyebrow">SOURCE REGISTER</div>
              <h2>Evidence before inference.</h2>
              <p>
                ATLAS separates observed history, hypothetical scenarios,
                structural estimates and learned predictions. World Atlas
                contains observed annual data. The laboratories label
                assumptions, structural estimates, historical portfolio analysis
                and retrospective neural evaluations separately.
              </p>
              {sourcesError && <p role="alert">{sourcesError}</p>}
              {sources.map((s, i) => (
                <article key={i}>
                  <h3>{s.label || s.source}</h3>
                  <p>{s.license}</p>
                  <a href={s.url} target="_blank" rel="noreferrer">
                    Inspect source
                  </a>
                  <small>
                    Retrieved {s.retrieved_at?.slice(0, 10)} ·{" "}
                    {s.indicator || s.scale}
                  </small>
                </article>
              ))}
              <h3>Interpretation limits</h3>
              <p>
                World Bank values are revised history, not original releases.
                Missing observations remain missing. Natural Earth boundaries
                are generalized and depict de facto control; map coverage does
                not imply a political position. Trade openness measures exports
                plus imports relative to GDP, not bilateral trade or
                supply-chain exposure.
              </p>
            </section>
          ) : (
            <section className="research empty" role="alert">
              <FlaskConical size={28} />
              <div className="eyebrow">UNKNOWN WORKSPACE</div>
              <h2>{workspace}</h2>
              <p>
                This name is not one of the workspaces in this release. The
                navigation lists every workspace that can show results.
              </p>
              <button onClick={() => setWorkspace("Research & Methods")}>
                View sources & methodology
              </button>
            </section>
          )}
        </Suspense>
        <footer>
          <span>
            ATLAS <b>RESEARCH TERMINAL</b>
          </span>
          <span>Observed ≠ forecast · Hypothetical ≠ realized</span>
          <span>LOCAL-FIRST / NO CLOUD SERVICES</span>
        </footer>
      </div>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
