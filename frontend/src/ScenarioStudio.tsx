import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUpRight,
  Download,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { api } from "./types";
import { Chart } from "./Chart";
import { ExposureMap } from "./ExposureMap";
import "./studio.css";

type Shock = { country: string; sector: string; shock: number };
type Node = {
  id: string;
  country: string;
  country_name: string;
  sector: string;
};
type Impact = {
  country: string;
  name: string;
  total: number;
  direct: number;
  first_order: number;
  higher_order: number;
};
type Result = {
  framework: string;
  network_year: number;
  pass_through: number;
  shocks: Shock[];
  countries: Impact[];
  nodes: (Node & { total: number })[];
  focus: Impact;
  rounds: { round: number; total: number }[];
  remaining_after_rounds: number;
  sensitivity: {
    pass_through: number;
    total: number;
    within_price_domain: boolean;
  }[];
  attribution: (Node & { shock: number; contribution: number })[];
  drivers: (Node & { derivative: number })[];
  residual: number;
  equation: string;
  units: string;
  assumptions: string[];
};
const sectors = [
  "Primary",
  "Energy",
  "Manufacturing",
  "Construction",
  "Services",
];
const presets = [
  {
    title: "Energy gets more expensive",
    detail: "Saudi Arabia · energy costs +10%",
    shocks: [{ country: "SAU", sector: "Energy", shock: 0.1 }],
  },
  {
    title: "Manufacturing under pressure",
    detail: "China · manufacturing costs +10%",
    shocks: [{ country: "CHN", sector: "Manufacturing", shock: 0.1 }],
  },
  {
    title: "Two pressures at once",
    detail: "Saudi energy +10% · China manufacturing +5%",
    shocks: [
      { country: "SAU", sector: "Energy", shock: 0.1 },
      { country: "CHN", sector: "Manufacturing", shock: 0.05 },
    ],
  },
  {
    title: "Energy costs ease",
    detail: "United States · energy costs −10%",
    shocks: [{ country: "USA", sector: "Energy", shock: -0.1 }],
  },
];
const pct = (v: number) => `${v > 0 ? "+" : ""}${(v * 100).toFixed(3)}%`;
const axis = {
  axisLabel: { color: "#9bb0c0" },
  axisLine: { lineStyle: { color: "#2d404b" } },
};
export function ScenarioStudio({ onAdvanced }: { onAdvanced: () => void }) {
  const [nodes, setNodes] = useState<Node[]>([]),
    [shocks, setShocks] = useState<Shock[]>(presets[0].shocks),
    [focus, setFocus] = useState("JPN"),
    [year, setYear] = useState(2022),
    [pass, setPass] = useState(1),
    [result, setResult] = useState<Result | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [view, setView] = useState("scenario"),
    [report, setReport] = useState<any>(null),
    [loadError, setLoadError] = useState("");
  const generation = useRef(0);
  useEffect(() => {
    let live = true;
    api<{ nodes: Node[] }>("/network")
      .then((meta) => {
        if (live) setNodes(meta.nodes);
      })
      .catch((e) => {
        if (live) setLoadError(String(e));
      });
    api("/network/evaluation")
      .then((r) => {
        if (live) setReport(r);
      })
      .catch((e) => {
        if (live) setReport({ error: String(e) });
      });
    return () => {
      live = false;
      generation.current++;
    };
  }, []);
  useEffect(() => {
    generation.current++;
    setResult(null);
    setBusy(false);
    setError("");
  }, [shocks, focus, year, pass]);
  const countries = nodes.filter((n, i) => i % 5 === 0);
  async function run() {
    const id = ++generation.current;
    setBusy(true);
    setError("");
    try {
      const data = await api<Result>("/studio/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shocks, focus, year, pass_through: pass }),
      });
      if (id === generation.current) setResult(data);
    } catch (e) {
      if (id === generation.current) setError(String(e));
    } finally {
      if (id === generation.current) setBusy(false);
    }
  }
  function change(index: number, field: keyof Shock, value: string | number) {
    setShocks(
      shocks.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    );
  }
  function download() {
    if (!result) return;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(result, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `atlas-scenario-${year}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  const international = result?.countries.find(
    (c) => !shocks.some((s) => s.country === c.country),
  );
  return (
    <div className="studio">
      <header className="studio-hero">
        <div>
          <div className="eyebrow">ATLAS / THE CONNECTED ECONOMY</div>
          <h2>
            One change.
            <br />
            <em>A world of connections.</em>
          </h2>
          <p>
            Follow a cost shock through real economic relationships. Understand
            the mechanism. Explore the evidence.
          </p>
        </div>
        <div className="studio-seal">
          <Sparkles size={22} />
          <strong>405</strong>
          <span>connected country-sectors</span>
          <small>81 areas · OECD 2016–2022</small>
        </div>
      </header>
      <div className="studio-tabs" aria-label="Studio views">
        <button
          aria-pressed={view === "scenario"}
          onClick={() => setView("scenario")}
        >
          01 / Scenario Studio
        </button>
        <button
          aria-pressed={view === "evidence"}
          onClick={() => setView("evidence")}
        >
          02 / Neural evidence
        </button>
        <span>PyTorch · inspectable mathematics</span>
      </div>
      {loadError && (
        <p role="alert">
          Could not load the research data. {loadError}{" "}
          <button onClick={() => window.location.reload()}>Retry</button>
        </p>
      )}
      {view === "evidence" ? (
        <NeuralEvidence report={report} countries={countries} />
      ) : (
        <>
          <section className="studio-start">
            <div className="studio-section-title">
              <span>01 / CHOOSE A STARTING POINT</span>
              <p>
                Illustrative cost assumptions, not predictions of real events.
              </p>
            </div>
            <div className="studio-presets">
              {presets.map((p) => (
                <button
                  key={p.title}
                  aria-pressed={
                    JSON.stringify(shocks) === JSON.stringify(p.shocks)
                  }
                  onClick={() => setShocks(p.shocks.map((s) => ({ ...s })))}
                >
                  <ArrowUpRight size={18} />
                  <strong>{p.title}</strong>
                  <span>{p.detail}</span>
                </button>
              ))}
            </div>
          </section>
          <div className="studio-workbench">
            <section className="studio-controls">
              <div className="eyebrow">DESIGN YOUR SCENARIO</div>
              <h3>What changes?</h3>
              <p>
                Set direct unit-cost changes. Energy includes extraction,
                refining and utilities; this is not a barrel-of-oil price
                change.
              </p>
              {shocks.map((s, i) => (
                <fieldset key={i}>
                  <legend>Shock {i + 1}</legend>
                  <label>
                    Source country
                    <select
                      aria-label={`Shock ${i + 1} country`}
                      value={s.country}
                      onChange={(e) => change(i, "country", e.target.value)}
                    >
                      {countries.map((c) => (
                        <option key={c.country} value={c.country}>
                          {c.country_name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Industry
                    <select
                      aria-label={`Shock ${i + 1} industry`}
                      value={s.sector}
                      onChange={(e) => change(i, "sector", e.target.value)}
                    >
                      {sectors.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Direct cost change{" "}
                    <strong>{(s.shock * 100).toFixed(0)}%</strong>
                    <input
                      aria-label={`Shock ${i + 1} cost change`}
                      type="range"
                      min={-50}
                      max={50}
                      step={1}
                      value={s.shock * 100}
                      onChange={(e) =>
                        change(i, "shock", +e.target.value / 100)
                      }
                    />
                  </label>
                  <div className="studio-range">
                    <span>−50% / lower costs</span>
                    <span>+50% / higher costs</span>
                  </div>
                  {shocks.length > 1 && (
                    <button
                      className="studio-remove"
                      onClick={() =>
                        setShocks(shocks.filter((_, j) => i !== j))
                      }
                    >
                      <X size={13} /> Remove shock {i + 1}
                    </button>
                  )}
                </fieldset>
              ))}
              {shocks.length < 5 && (
                <button
                  className="studio-add"
                  onClick={() => {
                    const next = nodes.find(
                      (n) =>
                        !shocks.some(
                          (s) =>
                            s.country === n.country && s.sector === n.sector,
                        ),
                    );
                    if (next)
                      setShocks([
                        ...shocks,
                        {
                          country: next.country,
                          sector: next.sector,
                          shock: 0.05,
                        },
                      ]);
                  }}
                  disabled={!nodes.length}
                >
                  <Plus size={14} /> Add another shock
                </button>
              )}
              <label>
                Economy to understand
                <select
                  aria-label="Focus economy"
                  value={focus}
                  onChange={(e) => setFocus(e.target.value)}
                >
                  {countries.map((c) => (
                    <option key={c.country} value={c.country}>
                      {c.country_name}
                    </option>
                  ))}
                </select>
              </label>
              <details className="studio-assumptions">
                <summary>Adjust the assumptions</summary>
                <label>
                  Historical production network
                  <select
                    aria-label="Scenario network year"
                    value={year}
                    onChange={(e) => setYear(+e.target.value)}
                  >
                    {[2022, 2021, 2020, 2019, 2018, 2017, 2016].map((y) => (
                      <option key={y}>{y}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Intermediate cost pass-through{" "}
                  <strong>{Math.round(pass * 100)}%</strong>
                  <input
                    aria-label="Cost pass-through"
                    type="range"
                    min={0}
                    max={100}
                    value={pass * 100}
                    onChange={(e) => setPass(+e.target.value / 100)}
                  />
                </label>
                <p>
                  At 100%, buyers pass all extra input costs onward. At 0%, only
                  your direct shocks remain. Direct shocks are never scaled by
                  this control.
                </p>
              </details>
              <button
                className="primary studio-run"
                disabled={busy || !nodes.length}
                onClick={run}
              >
                {busy ? "Solving 405 connections…" : "See how it spreads"}
                <ArrowUpRight size={16} />
              </button>
              {error && <p role="alert">{error}</p>}
              <small className="studio-note">
                Historical structure · hypothetical outcomes
              </small>
            </section>
            <section className="studio-map-panel">
              <div className="studio-map-heading">
                <div className="eyebrow">02 / FOLLOW THE CONNECTIONS</div>
                <h3>
                  {result
                    ? "The footprint of your scenario"
                    : "Every economy is connected."}
                </h3>
                <p>
                  {result
                    ? `Modeled costs relative to an unchanged baseline · ${year} network`
                    : "Choose a scenario and run the model to reveal its cost footprint."}
                </p>
              </div>
              <ExposureMap
                profile={null}
                scenario={result}
                onSelect={(code) => {
                  if (countries.some((c) => c.country === code)) setFocus(code);
                }}
              />
              <div className="studio-mechanism">
                <article>
                  <span>01</span>
                  <strong>Direct pressure</strong>
                  <p>Your selected industries receive the cost change.</p>
                </article>
                <ArrowDown size={16} />
                <article>
                  <span>02</span>
                  <strong>Input connections</strong>
                  <p>Their buyers face changed input costs.</p>
                </article>
                <ArrowDown size={16} />
                <article>
                  <span>03</span>
                  <strong>Repeated transmission</strong>
                  <p>Further effects travel through the same network.</p>
                </article>
              </div>
            </section>
          </div>
          {result && (
            <section className="studio-results" aria-label="Scenario results">
              <div className="studio-section-title">
                <span>03 / UNDERSTAND THE IMPACT</span>
                <button onClick={download}>
                  <Download size={14} /> Export scenario & assumptions
                </button>
              </div>
              <div className="studio-takeaways" role="status">
                <article>
                  <span>YOUR FOCUS / {result.focus.name}</span>
                  <strong>{pct(result.focus.total)}</strong>
                  <p>
                    Modeled average unit-cost change. Industries are weighted by
                    their historical gross output.
                  </p>
                </article>
                <article>
                  <span>BEYOND THE SHOCK SOURCES</span>
                  <strong>{international?.name || "—"}</strong>
                  <p>
                    {international
                      ? `${pct(international.total)} — largest absolute country effect outside your source economies.`
                      : "No external effect available."}
                  </p>
                </article>
                <article>
                  <span>WHAT THIS MEANS</span>
                  <strong>A conditional result.</strong>
                  <p>
                    Compared with zero cost change. This is not a GDP, inflation
                    or market forecast; no timing or event probability is
                    estimated.
                  </p>
                </article>
              </div>
              <div className="studio-chart-grid">
                <article className="studio-card">
                  <h3>How pressure reaches {result.focus.name}</h3>
                  <p>
                    Cumulative transmission rounds, not days or years. Mixed
                    positive and negative shocks can offset each other.
                  </p>
                  <Chart
                    height={240}
                    option={{
                      grid: { left: 65, right: 20, top: 20, bottom: 35 },
                      tooltip: {
                        trigger: "axis",
                        valueFormatter: (v) => `${Number(v).toFixed(4)}%`,
                      },
                      xAxis: {
                        type: "category",
                        data: result.rounds.map((r) =>
                          r.round === 0 ? "Direct" : `Round ${r.round}`,
                        ),
                        ...axis,
                      },
                      yAxis: {
                        type: "value",
                        axisLabel: { color: "#9bb0c0", formatter: "{value}%" },
                        splitLine: { lineStyle: { color: "#24313d" } },
                      },
                      series: [
                        {
                          type: "line",
                          data: result.rounds.map((r) => r.total * 100),
                          lineStyle: { color: "#d7ac65", width: 3 },
                          areaStyle: { color: "#d7ac65", opacity: 0.08 },
                        },
                      ],
                    }}
                  />
                  <p className="studio-note">
                    Remaining beyond round 8:{" "}
                    {pct(result.remaining_after_rounds)}. The headline includes
                    all rounds.
                  </p>
                  <details>
                    <summary>Read the values</summary>
                    <table>
                      <thead>
                        <tr>
                          <th>Round</th>
                          <th>Cumulative cost change</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.rounds.map((r) => (
                          <tr key={r.round}>
                            <td>{r.round}</td>
                            <td>{pct(r.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </details>
                </article>
                <article className="studio-card">
                  <h3>What if firms pass on less?</h3>
                  <p>
                    Same shocks and network, different pass-through assumptions.
                    These points are not confidence bounds.
                  </p>
                  <Chart
                    height={240}
                    option={{
                      grid: { left: 65, right: 20, top: 20, bottom: 35 },
                      tooltip: {
                        trigger: "axis",
                        valueFormatter: (v) => `${Number(v).toFixed(4)}%`,
                      },
                      xAxis: {
                        type: "category",
                        data: result.sensitivity.map(
                          (r) => `${Math.round(r.pass_through * 100)}%`,
                        ),
                        ...axis,
                      },
                      yAxis: {
                        type: "value",
                        axisLabel: { color: "#9bb0c0", formatter: "{value}%" },
                        splitLine: { lineStyle: { color: "#24313d" } },
                      },
                      series: [
                        {
                          type: "bar",
                          data: result.sensitivity.map((r) =>
                            r.within_price_domain ? r.total * 100 : null,
                          ),
                          itemStyle: {
                            color: "#75b5bd",
                            borderRadius: [4, 4, 0, 0],
                          },
                          barMaxWidth: 36,
                        },
                      ],
                    }}
                  />
                  <details>
                    <summary>Read the assumption comparison</summary>
                    <table>
                      <thead>
                        <tr>
                          <th>Pass-through</th>
                          <th>Cost change</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.sensitivity.map((r) => (
                          <tr key={r.pass_through}>
                            <td>{r.pass_through * 100}%</td>
                            <td>
                              {r.within_price_domain
                                ? pct(r.total)
                                : "Outside price domain"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </details>
                </article>
              </div>
              <div className="studio-chart-grid">
                <article className="studio-card">
                  <h3>Which economies feel it most?</h3>
                  <p>
                    Ranked by absolute cost change. Direction is shown
                    separately; these are not measures of welfare.
                  </p>
                  <div className="studio-rankings">
                    {result.countries.slice(0, 10).map((c) => (
                      <button
                        key={c.country}
                        onClick={() => setFocus(c.country)}
                      >
                        <span>{c.name}</span>
                        <div className="studio-bar">
                          <i
                            style={{
                              width: `${(Math.abs(c.total) / (Math.abs(result.countries[0].total) || 1)) * 100}%`,
                              background: c.total < 0 ? "#75b5bd" : "#d7ac65",
                            }}
                          />
                        </div>
                        <strong>{pct(c.total)}</strong>
                      </button>
                    ))}
                  </div>
                  <p className="studio-note">
                    Select an economy, then rerun to inspect it. Export includes
                    all 81 areas.
                  </p>
                </article>
                <article className="studio-card">
                  <h3>Explain the result for {result.focus.name}</h3>
                  <p>
                    Contributions add to the total. Opposing shocks can offset
                    each other.
                  </p>
                  <table>
                    <thead>
                      <tr>
                        <th>Your shock</th>
                        <th>Contribution</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.attribution.map((n) => (
                        <tr key={n.id}>
                          <td>
                            {n.country_name}
                            <small>
                              {n.sector} · {pct(n.shock)} direct
                            </small>
                          </td>
                          <td>{pct(n.contribution)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <th>Total</th>
                        <th>{pct(result.focus.total)}</th>
                      </tr>
                    </tfoot>
                  </table>
                  <details>
                    <summary>Direct, first-round and later effects</summary>
                    <table>
                      <tbody>
                        {[
                          ["Direct", result.focus.direct],
                          ["First round", result.focus.first_order],
                          ["Later rounds", result.focus.higher_order],
                        ].map(([label, value]) => (
                          <tr key={String(label)}>
                            <td>{label}</td>
                            <td>{pct(Number(value))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </details>
                  <details>
                    <summary>Which source sectors matter most?</summary>
                    <p>
                      PyTorch autograd computes the change in this economy’s
                      cost index for a one percentage-point direct cost increase
                      in each source sector, holding everything else fixed.
                    </p>
                    <table>
                      <thead>
                        <tr>
                          <th>Potential source</th>
                          <th>pp per 1 pp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.drivers.map((n) => (
                          <tr key={n.id}>
                            <td>
                              {n.country_name}
                              <small>{n.sector}</small>
                            </td>
                            <td>{n.derivative.toFixed(4)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </details>
                </article>
              </div>
              <details className="studio-math">
                <summary>The mathematics behind the picture</summary>
                <div className="studio-equation">{result.equation}</div>
                <p>
                  A contains observed supplier inputs per unit of buyer output.
                  s is your direct cost shock; α is the pass-through assumption;
                  p is the resulting cost change. The transpose makes costs
                  travel from suppliers to buyers.
                </p>
                <p>
                  PyTorch solves the linear system in float64 and differentiates
                  the selected country’s output-weighted cost index. This
                  component is exact structural mathematics, not a trained
                  neural forecast. Numerical residual:{" "}
                  {result.residual.toExponential(2)}.
                </p>
                {result.assumptions.map((a) => (
                  <p key={a}>• {a}</p>
                ))}
                <p>
                  The seven tables are revised historical observations. Changing
                  the year compares production structures; it does not
                  reconstruct information available at the time.
                </p>
                <a
                  href="https://www.oecd.org/en/data/datasets/inter-country-input-output-tables.html"
                  target="_blank"
                  rel="noreferrer"
                >
                  OECD ICIO source ↗
                </a>
              </details>
            </section>
          )}
          <footer className="studio-footer">
            <div>
              <h3>Curious about the neural models?</h3>
              <p>
                Run an actual PyTorch checkpoint. Compare it with observed
                outcomes and simple baselines.
              </p>
            </div>
            <button
              onClick={() => {
                setView("evidence");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              Explore neural evidence <ArrowUpRight size={15} />
            </button>
            <button onClick={onAdvanced}>Open the mathematical sandbox</button>
          </footer>
        </>
      )}
    </div>
  );
}
function NeuralEvidence({
  report,
  countries,
}: {
  report: any;
  countries: Node[];
}) {
  const [country, setCountry] = useState("JPN"),
    [model, setModel] = useState("graph_seed17"),
    [pred, setPred] = useState<number[] | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    setPred(null);
    setError("");
    api<{ predictions: number[] }>(`/network/replay?model=${model}`)
      .then((r) => {
        if (live) setPred(r.predictions);
      })
      .catch((e) => {
        if (live) setError(String(e));
      });
    return () => {
      live = false;
    };
  }, [model]);
  if (!report) return <p role="status">Loading the experiment…</p>;
  if (report.error)
    return (
      <p role="alert">
        Neural evidence is unavailable. {report.error} Reload to retry.
      </p>
    );
  const rows = report.nodes
    .map((n: Node, i: number) => ({ ...n, i }))
    .filter((n: Node) => n.country === country);
  return (
    <section className="studio-evidence">
      <div className="eyebrow">TRAINED MODELS / VISIBLE EVIDENCE</div>
      <h2>Does learning the network help?</h2>
      <p className="studio-lead">
        A small PyTorch graph neural network learns from each industry and its
        suppliers. Test it against a simpler model, and see where it falls
        short.
      </p>
      <div className="studio-takeaways">
        <article>
          <span>TRAINING</span>
          <strong>2018–2020</strong>
          <p>
            Three target years; features and network come from each preceding
            year.
          </p>
        </article>
        <article>
          <span>VALIDATION / TEST</span>
          <strong>2021 / 2022</strong>
          <p>
            Validation selects checkpoints. The single held-out test year
            evaluates performance.
          </p>
        </article>
        <article>
          <span>THE HONEST FINDING</span>
          <strong>Ridge wins RMSE.</strong>
          <p>
            The graph model does not consistently beat simpler alternatives. 405
            connected nodes are not 405 independent years.
          </p>
        </article>
      </div>
      <div className="studio-card">
        <h3>Replay the held-out year</h3>
        <p>
          This runs saved weights on the backend in PyTorch. It predicts nominal
          USD output growth in 2022, not your cost scenario or current economic
          conditions.
        </p>
        <div className="studio-replay-controls">
          <label>
            Economy
            <select
              aria-label="Neural economy"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            >
              {countries.map((c) => (
                <option key={c.country} value={c.country}>
                  {c.country_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Checkpoint
            <select
              aria-label="Neural checkpoint"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            >
              {["graph", "no_graph"].flatMap((kind) =>
                [17, 29, 43].map((seed) => (
                  <option
                    key={`${kind}_seed${seed}`}
                    value={`${kind}_seed${seed}`}
                  >
                    {kind === "graph" ? "With network" : "Without network"} ·
                    seed {seed}
                  </option>
                )),
              )}
            </select>
          </label>
        </div>
        {error && <p role="alert">{error}</p>}
        {!pred && !error && <p role="status">Running PyTorch inference…</p>}
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Industry</th>
                <th>Observed</th>
                <th>Neural estimate</th>
                <th>Ridge baseline</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((n: Node & { i: number }) => (
                <tr key={n.id}>
                  <td>{n.sector}</td>
                  <td>{report.actual[n.i].toFixed(2)}</td>
                  <td>{pred ? pred[n.i].toFixed(2) : "…"}</td>
                  <td>{report.predictions.ridge[n.i].toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="studio-note">
          Units: 100 × log(output this year / output last year), in log
          percentage points. Nominal USD output mixes real activity, prices and
          exchange rates.
        </p>
      </div>
      <details className="studio-math">
        <summary>All seeds, ablations and baselines</summary>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Model</th>
                <th>MAE</th>
                <th>RMSE ↓</th>
              </tr>
            </thead>
            <tbody>
              {report.results.map((r: any) => (
                <tr key={r.model}>
                  <td>{r.model}</td>
                  <td>{r.mae_log_percentage_points.toFixed(3)}</td>
                  <td>{r.rmse_log_percentage_points.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <details className="studio-math">
        <summary>Open the neural mathematics</summary>
        <div className="studio-equation">
          ŷ = W₂ tanh(W₁x + WₘAᵀx + b₁) + b₂
        </div>
        <p>
          Each node combines its own features with input-weighted supplier
          features. Four inputs, eight hidden units and 81 learned parameters.
          Training uses mean squared error, Adam, training-only normalization
          and validation-selected early stopping. The no-network ablation
          removes supplier messages.
        </p>
        <p>
          Input features: previous output growth, log output, total
          intermediate-input share and foreign-input share. The output is
          standardized during training and converted back for display.
        </p>
        <p>
          No calibrated uncertainty or causal shock conditioning has been
          established. We do not turn disagreement across seeds into a
          confidence interval. More independent historical years are needed
          before trusting generalization.
        </p>
      </details>
    </section>
  );
}
