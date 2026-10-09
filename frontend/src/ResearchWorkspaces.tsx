import {
  TreasuryCurves,
  InferenceReplay,
  WalkForward,
} from "./ReleaseWorkspaces";
import { useEffect, useState } from "react";
import { api, Observation, Country, format } from "./types";
import { Chart } from "./Chart";
const post = (path: string, body: unknown) =>
  api<any>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
function ResultError({ error }: { error: string }) {
  return error ? (
    <div className="error" role="alert">
      {error}
    </div>
  ) : null;
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
export function StructuralLab({ network = false }: { network?: boolean }) {
  const [matrix, setMatrix] = useState(
      "[[0.1, 0.2, 0.05], [0, 0.15, 0.2], [0, 0, 0.1]]",
    ),
    [shock, setShock] = useState("[0.1, 0, 0]"),
    [mode, setMode] = useState("price"),
    [result, setResult] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    setResult(null);
  }, [matrix, shock, mode]);
  async function run() {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      setResult(
        await post("/shocks", {
          coefficients: JSON.parse(matrix),
          shock: JSON.parse(shock),
          mode,
        }),
      );
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="lab-layout">
      <section className="research controls">
        <div className="eyebrow">HYPOTHETICAL / USER-SPECIFIED NETWORK</div>
        <h2>
          {network ? "Production relationships" : "Structural shock laboratory"}
        </h2>
        <p>
          The measured OECD network is available in Economic Network. This
          editable starting matrix is a{" "}
          <strong>synthetic three-sector teaching example</strong>, not measured
          economic exposure.
        </p>
        <label>
          Technical coefficients A
          <small>
            Rows supply inputs; columns purchase them. Fractions of buyer
            output.
          </small>
          <textarea
            aria-label="Technical coefficients"
            rows={5}
            value={matrix}
            onChange={(e) => setMatrix(e.target.value)}
          />
        </label>
        <label>
          Direct shock vector
          <small>
            Price mode: fractional exogenous unit-cost changes. Quantity mode:
            final-demand changes in common monetary units.
          </small>
          <textarea
            aria-label="Shock vector"
            rows={2}
            value={shock}
            onChange={(e) => setShock(e.target.value)}
          />
        </label>
        <label>
          Model
          <select
            aria-label="Structural model"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <option value="price">Fixed-coefficient price propagation</option>
            <option value="quantity">Leontief final-demand propagation</option>
          </select>
        </label>
        <button className="primary" onClick={run} disabled={busy}>
          {busy ? "Solving…" : "Run structural model"}
        </button>
        <ResultError error={error} />
        <p className="model-note">
          No substitution, dynamic response, identified oil supply shock, or
          mapping to ETF returns. Monetary-policy transmission is unavailable in
          this structural model.
        </p>
      </section>
      <section className="research results">
        {!result ? (
          <>
            <div className="eyebrow">MODEL OUTPUT</div>
            <h2>Specify assumptions, then solve.</h2>
            <p>
              ATLAS validates dimensions, input shares, spectral radius and
              numerical conditioning before calculating transmission.
            </p>
            <div className="equation">Δp = (I − Aᵀ)⁻¹ s</div>
            <p>
              The implementation solves the linear system directly. It does not
              form an explicit inverse.
            </p>
          </>
        ) : (
          <>
            <div className="eyebrow">HYPOTHETICAL STRUCTURAL ESTIMATE</div>
            <h2>
              {result.mode === "price"
                ? "Cost transmission"
                : "Output response"}
            </h2>
            <div className="stat-grid">
              <Stat
                label="Spectral radius"
                value={result.spectral_radius.toFixed(4)}
              />
              <Stat
                label="Condition number"
                value={result.condition_number.toFixed(3)}
              />
              <Stat
                label="Solver residual"
                value={result.residual.toExponential(1)}
              />
            </div>
            <Chart
              height={280}
              option={{
                tooltip: { trigger: "axis" },
                legend: {
                  top: 0,
                  data: ["Direct", "First-order", "Higher-order"],
                  textStyle: { color: "#9faebf" },
                },
                grid: { left: 55, right: 20, bottom: 40, top: 45 },
                xAxis: {
                  type: "category",
                  data: result.total.map(
                    (_: any, i: number) => `Sector ${i + 1}`,
                  ),
                  axisLabel: { color: "#9faebf" },
                },
                yAxis: {
                  type: "value",
                  axisLabel: { color: "#9faebf" },
                  splitLine: { lineStyle: { color: "#26313e" } },
                },
                series: [
                  ["Direct", "direct", "#d7ac65"],
                  ["First-order", "first_order", "#538b99"],
                  ["Higher-order", "higher_order", "#82b0a5"],
                ].map(([name, key, color]) => ({
                  name,
                  type: "bar" as const,
                  stack: "total",
                  itemStyle: { color },
                  data: result[key],
                })),
              }}
            />
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>SECTOR</th>
                    <th>DIRECT</th>
                    <th>FIRST</th>
                    <th>HIGHER</th>
                    <th>TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {result.total.map((v: number, i: number) => (
                    <tr key={i}>
                      <td>Sector {i + 1}</td>
                      {[
                        result.direct[i],
                        result.first_order[i],
                        result.higher_order[i],
                        v,
                      ].map((n, j) => (
                        <td key={j}>{n.toFixed(5)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              Units: {result.units}. Values depend entirely on the specified
              coefficients and shock.
            </p>
            {network && (
              <>
                <h3>Equilibrium relationship contributions</h3>
                <p>
                  Rows below are recipients; columns are contributing suppliers.
                  These contributions sum to the indirect response.
                </p>
                <pre>
                  {JSON.stringify(result.relationship_contributions, null, 2)}
                </pre>
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
}
export function RatesLab() {
  const [form, setForm] = useState({
      face: 100,
      coupon: 0.04,
      yield_rate: 0.04,
      years: 10,
      frequency: 2,
      shift_bp: 100,
    }),
    [result, setResult] = useState<any>(null),
    [error, setError] = useState("");
  useEffect(() => {
    setResult(null);
  }, [form]);
  async function run() {
    setError("");
    try {
      setResult(await post("/bonds", form));
    } catch (e) {
      setResult(null);
      setError(String(e));
    }
  }
  return (
    <div className="lab-layout">
      <TreasuryCurves />
      <section className="research controls">
        <div className="eyebrow">HYPOTHETICAL FIXED-CASH-FLOW VALUATION</div>
        <h2>Bond sensitivity</h2>
        <p>
          Use your own yield assumptions. The historical Treasury curve above
          provides separate observed context.
        </p>
        {Object.entries({
          face: "Face value",
          coupon: "Annual coupon (fraction)",
          yield_rate: "Annual yield (fraction)",
          years: "Years to maturity",
          shift_bp: "Parallel yield shift (basis points)",
        }).map(([k, label]) => (
          <label key={k}>
            {label}
            <input
              type="number"
              step={k === "coupon" || k === "yield_rate" ? 0.005 : 1}
              value={form[k as keyof typeof form]}
              onChange={(e) =>
                setForm({ ...form, [k]: Number(e.target.value) })
              }
            />
          </label>
        ))}
        <label>
          Coupon frequency
          <select
            value={form.frequency}
            onChange={(e) => setForm({ ...form, frequency: +e.target.value })}
          >
            <option value={1}>Annual</option>
            <option value={2}>Semiannual</option>
            <option value={4}>Quarterly</option>
          </select>
        </label>
        <button className="primary" onClick={run}>
          Calculate sensitivity
        </button>
        <ResultError error={error} />
      </section>
      <section className="research results">
        <div className="eyebrow">CASH FLOWS / DURATION / CONVEXITY</div>
        <h2>Reprice the bond.</h2>
        {result ? (
          <>
            <div className="stat-grid">
              <Stat label="Present value" value={result.price.toFixed(4)} />
              <Stat
                label="Modified duration"
                value={result.modified_duration.toFixed(4)}
              />
              <Stat label="Convexity" value={result.convexity.toFixed(4)} />
              <Stat
                label="Shifted value"
                value={result.shifted_price.toFixed(4)}
              />
              <Stat
                label="Exact price change"
                value={result.exact_change.toFixed(4)}
              />
              <Stat
                label="Second-order estimate"
                value={result.approximate_change.toFixed(4)}
              />
            </div>
            <p>
              {result.convention}. Parallel shift only; no credit risk,
              optionality or changing cash flows.
            </p>
          </>
        ) : (
          <p>
            At a 4% coupon and 4% yield, a bond on its coupon date prices at
            par. Change the yield and compare exact repricing with its
            duration-convexity approximation.
          </p>
        )}
        <div className="equation">ΔP / P ≈ −Dₘ Δy + ½ C (Δy)²</div>
      </section>
    </div>
  );
}
export function PortfolioLab() {
  const [csv, setCsv] = useState(""),
    [source, setSource] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [weights, setWeights] = useState("0.5, 0.5"),
    [method, setMethod] = useState("variance"),
    [periods, setPeriods] = useState(252),
    [cap, setCap] = useState(1),
    [turnover, setTurnover] = useState(2),
    [cost, setCost] = useState(10),
    [result, setResult] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    setResult(null);
  }, [csv, source, confirmed, weights, method, periods, cap, turnover, cost]);
  async function run() {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      setResult(
        await post("/portfolio", {
          csv_text: csv,
          source,
          total_return_confirmed: confirmed,
          weights: weights.split(",").map(Number),
          method,
          periods,
          cap,
          turnover_limit: turnover,
          cost_bps: cost,
        }),
      );
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="lab-layout">
      <section className="research controls">
        <div className="eyebrow">USER-SUPPLIED TOTAL-RETURN HISTORY</div>
        <h2>Portfolio Studio</h2>
        <p>
          Import a complete CSV with <code>date,SPY,TLT</code> (or your asset
          names), followed by strictly increasing ISO dates and positive
          total-return index levels. At least 21 rows and two assets.
        </p>
        <label>
          Price CSV
          <input
            aria-label="Price CSV"
            type="file"
            accept=".csv,text/csv"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) {
                if (f.size > 3_000_000) {
                  setError("CSV exceeds 3 MB");
                  return;
                }
                setCsv(await f.text());
                setResult(null);
              }
            }}
          />
        </label>
        {csv && (
          <small>
            {csv.split("\n")[0]} · {csv.length.toLocaleString()} characters
            loaded
          </small>
        )}
        <label>
          Source / licensing note
          <input
            aria-label="Price source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Your provider and permitted use"
          />
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          I confirm these are total-return adjusted prices or indices.
        </label>
        <label>
          Weights in CSV column order
          <input
            aria-label="Portfolio weights"
            value={weights}
            onChange={(e) => setWeights(e.target.value)}
          />
        </label>
        <label>
          Observation frequency
          <select value={periods} onChange={(e) => setPeriods(+e.target.value)}>
            <option value={252}>Daily / 252 periods per year</option>
            <option value={52}>Weekly / 52 periods per year</option>
            <option value={12}>Monthly / 12 periods per year</option>
          </select>
        </label>
        <label>
          Objective
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="variance">Minimum variance</option>
            <option value="cvar">Minimum 95% CVaR</option>
          </select>
        </label>
        <div className="form-pair">
          <label>
            Weight cap
            <input
              type="number"
              step="0.05"
              value={cap}
              onChange={(e) => setCap(+e.target.value)}
            />
          </label>
          <label>
            L1 turnover limit
            <input
              type="number"
              step="0.1"
              value={turnover}
              onChange={(e) => setTurnover(+e.target.value)}
            />
          </label>
        </div>
        <label>
          One-time cost (bps per L1 turnover)
          <input
            type="number"
            value={cost}
            onChange={(e) => setCost(+e.target.value)}
          />
        </label>
        <button
          disabled={!csv || !confirmed || busy}
          className="primary"
          onClick={run}
        >
          {busy ? "Optimizing…" : "Analyze & optimize"}
        </button>
        <ResultError error={error} />
      </section>
      <section className="research results">
        <div className="eyebrow">CHRONOLOGICAL HOLDOUT / LONG-ONLY</div>
        <h2>
          {result
            ? "Historical risk comparison"
            : "Bring your own market data."}
        </h2>
        {!result ? (
          <p>
            No ETF returns are bundled. Prices are validated and analyzed
            locally. The first 70% of return observations fit the allocation;
            the last 30% evaluate it. Annualization uses your selected
            frequency.
          </p>
        ) : (
          <>
            <p>
              Fit: {result.train_period.join(" to ")}
              <br />
              Holdout: {result.test_period.join(" to ")}
            </p>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>HOLDOUT METRIC</th>
                    <th>ORIGINAL</th>
                    <th>EQUAL WEIGHT</th>
                    <th>OPTIMIZED</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Total return", "total_return"],
                    ["Annualized volatility", "annualized_volatility"],
                    ["Max drawdown", "max_drawdown"],
                    ["95% CVaR / period", "cvar_95"],
                  ].map(([label, key]) => (
                    <tr key={key}>
                      <td>{label}</td>
                      {[
                        "original_held_out",
                        "equal_weight_held_out",
                        "held_out",
                      ].map((k) => (
                        <td key={k}>{(result[k][key] * 100).toFixed(2)}%</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <h3>Optimized allocation</h3>
            {result.assets.map((a: string, i: number) => (
              <div className="allocation" key={a}>
                <span>{a}</span>
                <meter min="0" max="1" value={result.optimization.weights[i]} />
                <strong>
                  {(result.optimization.weights[i] * 100).toFixed(2)}%
                </strong>
              </div>
            ))}
            <p>
              Holdout return after the one-time allocation cost:{" "}
              {(result.held_out.net_total_return * 100).toFixed(2)}%. Solver:{" "}
              {result.optimization.solver_status}.
            </p>
            <Chart
              height={240}
              option={{
                tooltip: { trigger: "axis" },
                legend: { top: 0, textStyle: { color: "#9aaaba" } },
                grid: { left: 48, right: 20, top: 35, bottom: 35 },
                xAxis: {
                  type: "category",
                  data: result.held_out.wealth.map((_: any, i: number) => i),
                  axisLabel: { color: "#9aaaba" },
                },
                yAxis: {
                  type: "value",
                  scale: true,
                  axisLabel: { color: "#9aaaba" },
                  splitLine: { lineStyle: { color: "#26313e" } },
                },
                series: [
                  {
                    name: "Original",
                    type: "line",
                    showSymbol: false,
                    data: result.original_held_out.wealth,
                    lineStyle: { color: "#638a9d" },
                  },
                  {
                    name: "Optimized",
                    type: "line",
                    showSymbol: false,
                    data: result.held_out.wealth,
                    lineStyle: { color: "#d7ac65" },
                  },
                ],
              }}
            />
            <h3>Limitations</h3>
            {result.limitations.map((l: string) => (
              <p key={l} className="model-note">
                {l}
              </p>
            ))}
          </>
        )}
      </section>
      <WalkForward
        enabled={!!csv && confirmed}
        request={{
          csv_text: csv,
          source,
          total_return_confirmed: confirmed,
          weights: weights.split(",").map(Number),
          method,
          periods,
          cap,
          turnover_limit: turnover,
          cost_bps: cost,
        }}
      />
    </div>
  );
}
export function ForecastLab() {
  const [report, setReport] = useState<any>(null),
    [error, setError] = useState(""),
    [model, setModel] = useState("gru_multivariate_seed17");
  useEffect(() => {
    api("/forecast/evaluation")
      .then(setReport)
      .catch((e) => setError(String(e)));
  }, []);
  const p = report?.predictions[model];
  return (
    <section className="research forecast">
      <div className="eyebrow">PYTORCH / RETROSPECTIVE EVALUATION</div>
      <h2>Annual macro forecasting</h2>
      <ResultError error={error} />
      {!report && !error ? (
        <p>Loading saved experiment…</p>
      ) : (
        report && (
          <>
            <p>
              {report.target}. Five-year sequences ending two years before the
              target. Compact GRU with a Gaussian output head, trained on CPU.
              This is a small-sample research experiment.
            </p>
            <div className="stat-grid">
              <Stat
                label="Training targets"
                value={`${report.train_years[0]}–${report.train_years.at(-1)}`}
              />
              <Stat
                label="Validation targets"
                value={`${report.validation_years[0]}–${report.validation_years.at(-1)}`}
              />
              <Stat
                label="Held-out targets"
                value={`${report.test_years[0]}–${report.test_years.at(-1)}`}
              />
            </div>
            <label>
              Saved model / baseline{" "}
              <select value={model} onChange={(e) => setModel(e.target.value)}>
                {Object.keys(report.predictions).map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </label>
            <Chart
              height={300}
              option={{
                tooltip: { trigger: "axis" },
                legend: { top: 0, textStyle: { color: "#a9b8c8" } },
                grid: { left: 55, right: 25, top: 40, bottom: 35 },
                xAxis: {
                  type: "category",
                  data: report.test_years,
                  axisLabel: { color: "#a9b8c8" },
                },
                yAxis: {
                  type: "value",
                  name: "annual %",
                  axisLabel: { color: "#a9b8c8" },
                  splitLine: { lineStyle: { color: "#26313e" } },
                },
                series: [
                  {
                    name: "Observed (revised)",
                    type: "line",
                    data: report.test_actual,
                    lineStyle: { color: "#d7ac65" },
                  },
                  {
                    name: "Prediction",
                    type: "line",
                    data: p.mean,
                    lineStyle: { color: "#79a8be" },
                  },
                  ...(p.lower80
                    ? [
                        {
                          name: "80% lower",
                          type: "line" as const,
                          data: p.lower80,
                          symbol: "none",
                          lineStyle: {
                            color: "#627e8f",
                            type: "dashed" as const,
                          },
                        },
                        {
                          name: "80% upper",
                          type: "line" as const,
                          data: p.upper80,
                          symbol: "none",
                          lineStyle: {
                            color: "#627e8f",
                            type: "dashed" as const,
                          },
                        },
                      ]
                    : []),
                ],
              }}
            />
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>MODEL</th>
                    <th>SEED</th>
                    <th>MAE (PP)</th>
                    <th>RMSE (PP)</th>
                    <th>80% COVERAGE</th>
                    <th>PARAMETERS</th>
                  </tr>
                </thead>
                <tbody>
                  {report.results.map((r: any, i: number) => (
                    <tr key={i}>
                      <td>{r.model}</td>
                      <td>{r.seed ?? "—"}</td>
                      <td>{r.mae.toFixed(3)}</td>
                      <td>{r.rmse.toFixed(3)}</td>
                      <td>
                        {r.coverage_80 == null
                          ? "—"
                          : `${(r.coverage_80 * 100).toFixed(0)}%`}
                      </td>
                      <td>{r.parameters ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <InferenceReplay model={model} />
            <h3>Interpretation</h3>
            {report.limitations.map((l: string) => (
              <p className="model-note" key={l}>
                {l}
              </p>
            ))}
            <p>
              Default display is preselected seed 17, not the best test result.
              All seeds and the domestic-only ablation are shown. Original
              vintages are unavailable; a two-year lag is a conservative timing
              convention, not proof of historical availability.
            </p>
          </>
        )
      )}
    </section>
  );
}
export function HistoricalLab({
  country,
  observations,
}: {
  country?: Country;
  observations: Observation[];
}) {
  const [event, setEvent] = useState(2020);
  const series = observations.filter(
    (o) =>
      o.indicator === "NY.GDP.MKTP.KD.ZG" &&
      o.year >= event - 3 &&
      o.year <= event + 2,
  );
  return (
    <section className="research">
      <div className="eyebrow">OBSERVED ANNUAL CONTEXT / REVISED HISTORY</div>
      <h2>{country?.name} · historical context</h2>
      <p>
        Country selection follows World Atlas. This view places GDP growth
        around a selected year. It does not identify an event's causal impact or
        replay point-in-time information.
      </p>
      <label>
        Reference year{" "}
        <select value={event} onChange={(e) => setEvent(+e.target.value)}>
          <option value={2020}>2020</option>
          <option value={2022}>2022</option>
          <option value={2008}>2008</option>
        </select>
      </label>
      <Chart
        height={300}
        option={{
          grid: { left: 55, right: 20, top: 30, bottom: 35 },
          xAxis: {
            type: "category",
            data: series.map((o) => o.year),
            axisLabel: { color: "#99aabb" },
          },
          yAxis: {
            type: "value",
            axisLabel: { color: "#99aabb" },
            splitLine: { lineStyle: { color: "#26313e" } },
          },
          series: [
            {
              type: "bar",
              data: series.map((o) => ({
                value: o.value,
                itemStyle: { color: o.year === event ? "#d7ac65" : "#4c7588" },
              })),
            },
          ],
        }}
      />
      <table>
        <thead>
          <tr>
            <th>YEAR</th>
            <th>REAL GDP GROWTH</th>
            <th>EVIDENCE TYPE</th>
          </tr>
        </thead>
        <tbody>
          {series.map((o) => (
            <tr key={o.year}>
              <td>{o.year}</td>
              <td>{format(o.value, o.indicator)}</td>
              <td>Observed · World Bank WDI</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        Daily oil prices, policy surprises, market returns and release-time
        vintages are not loaded. Event attribution and financial replay remain
        unavailable.
      </p>
    </section>
  );
}
