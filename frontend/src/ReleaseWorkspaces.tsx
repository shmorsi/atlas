import { useEffect, useRef, useState } from "react";
import { api } from "./types";
import { Chart } from "./Chart";

export function TreasuryCurves() {
  const [data, setData] = useState<any>(null),
    [date, setDate] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    api<any>("/rates/treasury")
      .then((d) => {
        if (live) {
          setData(d);
          setDate(d.curves.at(-1).date);
        }
      })
      .catch((e) => {
        if (live) setError(String(e));
      });
    return () => {
      live = false;
    };
  }, []);
  const curve = data?.curves.find((c: any) => c.date === date);
  return (
    <section className="research" style={{ gridColumn: "1 / -1" }}>
      <div className="eyebrow">OBSERVED HISTORY · US TREASURY</div>
      <h2>Historical yield curve</h2>
      <p>
        Historical annual yields across US Treasury maturities. These are
        historical par yields, not today's rates or investment returns.
      </p>
      {error && <p role="alert">{error}</p>}
      {!data && !error && <p>Loading the local Treasury cache…</p>}
      {curve && (
        <>
          <label>
            Curve observation date{" "}
            <select value={date} onChange={(e) => setDate(e.target.value)}>
              {data.curves.map((c: any) => (
                <option key={c.date}>{c.date}</option>
              ))}
            </select>
          </label>
          <Chart
            height={260}
            option={{
              tooltip: { trigger: "axis" },
              grid: { left: 55, right: 25, top: 35, bottom: 40 },
              xAxis: {
                type: "category",
                data: curve.points.map((p: any) =>
                  p.months < 12 ? `${p.months}m` : `${p.months / 12}y`,
                ),
                axisLabel: { color: "#a9b8c8" },
              },
              yAxis: {
                type: "value",
                name: "Yield (%)",
                scale: true,
                axisLabel: { color: "#a9b8c8" },
                splitLine: { lineStyle: { color: "#26313e" } },
              },
              series: [
                {
                  name: "Par yield (%)",
                  type: "line",
                  data: curve.points.map((p: any) => p.yield_percent),
                  connectNulls: false,
                  lineStyle: { color: "#d7ac65" },
                },
              ],
            }}
          />
          <details>
            <summary>Read yields as a table and inspect the source</summary>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Maturity</th>
                    <th>Annual yield</th>
                  </tr>
                </thead>
                <tbody>
                  {curve.points.map((p: any) => (
                    <tr key={p.tenor}>
                      <td>{p.months} months</td>
                      <td>
                        {p.yield_percent == null
                          ? "Unavailable"
                          : `${p.yield_percent.toFixed(2)}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              Latest observation:{" "}
              {data.source.latest_observation || data.curves.at(-1).date}.{" "}
              {data.source.dates} dates · {data.source.unit} · Retrieved{" "}
              {data.source.retrieved_at}. {data.source.limitation}
            </p>
            <a href={data.source.source_url} target="_blank" rel="noreferrer">
              Official Treasury source
            </a>
          </details>
        </>
      )}
    </section>
  );
}

export function InferenceReplay({ model }: { model: string }) {
  const [year, setYear] = useState(2024),
    [result, setResult] = useState<any>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const generation = useRef(0);
  useEffect(() => {
    generation.current++;
    setResult(null);
    setError("");
    setBusy(false);
  }, [model, year]);
  async function run() {
    const id = ++generation.current;
    setBusy(true);
    setResult(null);
    setError("");
    try {
      const d = await api(
        `/forecast/replay?model=${encodeURIComponent(model)}&year=${year}`,
      );
      if (id === generation.current) setResult(d);
    } catch (e) {
      if (id === generation.current) setError(String(e));
    } finally {
      if (id === generation.current) setBusy(false);
    }
  }
  if (!model.startsWith("gru_")) return null;
  return (
    <div className="research">
      <div className="eyebrow">SAVED WEIGHTS · PYTORCH CPU INFERENCE</div>
      <h3>Run the trained model</h3>
      <p>
        Recompute one held-out prediction from the actual historical input
        window. The backend executes the saved neural network; it does not
        retrain it.
      </p>
      <label>
        Prediction target year{" "}
        <select value={year} onChange={(e) => setYear(+e.target.value)}>
          {Array.from({ length: 10 }, (_, i) => 2015 + i).map((y) => (
            <option key={y}>{y}</option>
          ))}
        </select>
      </label>{" "}
      <button className="primary" disabled={busy} onClick={run}>
        {busy ? "Running PyTorch…" : "Run saved PyTorch model"}
      </button>
      {error && <p role="alert">{error}</p>}
      {result && (
        <div role="status">
          <p>
            <strong>Predicted growth: {result.mean.toFixed(2)}%</strong> ·
            Observed growth: {result.observed.toFixed(2)}%
          </p>
          <p>
            Model's 80% interval: {result.lower80.toFixed(2)}% to{" "}
            {result.upper80.toFixed(2)}%. Interval reliability is evaluated in
            the table above; it is not guaranteed.
          </p>
          <p>
            Inputs: {result.input_years[0]}–{result.input_years.at(-1)} ·{" "}
            {result.framework} / {result.device}. {result.limitation}.
          </p>
          <details>
            <summary>Inspect the real model inputs</summary>
            <pre style={{ overflowX: "auto" }}>
              {JSON.stringify(
                {
                  features: result.features,
                  years: result.input_years,
                  values: result.window,
                },
                null,
                2,
              )}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}

export function WalkForward({
  request,
  enabled,
}: {
  request: Record<string, unknown>;
  enabled: boolean;
}) {
  const [window, setWindow] = useState(60),
    [interval, setInterval] = useState(20),
    [result, setResult] = useState<any>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const key = JSON.stringify(request),
    generation = useRef(0);
  useEffect(() => {
    generation.current++;
    setResult(null);
    setError("");
    setBusy(false);
  }, [key, window, interval]);
  async function run() {
    const id = ++generation.current;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const d = await api("/portfolio/walk-forward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...request,
          train_window: window,
          rebalance_every: interval,
        }),
      });
      if (id === generation.current) setResult(d);
    } catch (e) {
      if (id === generation.current) setError(String(e));
    } finally {
      if (id === generation.current) setBusy(false);
    }
  }
  return (
    <section className="research" style={{ gridColumn: "1 / -1" }}>
      <div className="eyebrow">WALK-FORWARD · COSTS AT EVERY REBALANCE</div>
      <h2>Test an allocation through time</h2>
      <p>
        Each decision uses only the preceding training window. Holdings drift
        between rebalances. The same per-trade cost rate applies to all three
        strategies. This uses the CSV and portfolio settings above.
      </p>
      <div className="form-pair">
        <label>
          Training observations
          <input
            type="number"
            min={10}
            value={window}
            onChange={(e) => setWindow(+e.target.value)}
          />
        </label>
        <label>
          Rebalance every N observations
          <input
            type="number"
            min={1}
            value={interval}
            onChange={(e) => setInterval(+e.target.value)}
          />
        </label>
      </div>
      <button className="primary" disabled={!enabled || busy} onClick={run}>
        {busy ? "Evaluating…" : "Run walk-forward backtest"}
      </button>
      {error && <p role="alert">{error}</p>}
      {result && (
        <div role="status">
          <p>
            Out-of-sample dates: {result.dates[0]}–{result.dates.at(-1)}.
            Returns below include repeated transaction costs.
          </p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Strategy</th>
                  <th>Net return</th>
                  <th>Volatility</th>
                  <th>Max drawdown</th>
                  <th>Rebalances</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(result.strategies).map(
                  ([name, value]: [string, any]) => (
                    <tr key={name}>
                      <td>{name.replace("_", " ")}</td>
                      {[
                        "total_return",
                        "annualized_volatility",
                        "max_drawdown",
                      ].map((k) => (
                        <td key={k}>
                          {(value.statistics[k] * 100).toFixed(2)}%
                        </td>
                      ))}
                      <td>{value.rebalances.length}</td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
          <details>
            <summary>Inspect every allocation and cost</summary>
            <pre style={{ maxHeight: 350, overflow: "auto" }}>
              {JSON.stringify(result.strategies.optimized.rebalances, null, 2)}
            </pre>
          </details>
          {result.limitations.map((s: string) => (
            <p key={s}>{s}</p>
          ))}
        </div>
      )}
    </section>
  );
}
