import { useEffect, useRef, useState } from "react";
import { api } from "./types";
import { ExposureMap } from "./ExposureMap";
export function NetworkWorkspace({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (s: string) => void;
}) {
  const [meta, setMeta] = useState<any>(null),
    [profile, setProfile] = useState<any>(null),
    [year, setYear] = useState(2022),
    [source, setSource] = useState("SAU"),
    [sector, setSector] = useState("Energy"),
    [shock, setShock] = useState(10),
    [result, setResult] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [report, setReport] = useState<any>(null);
  const generation = useRef(0);
  useEffect(() => {
    api("/network")
      .then(setMeta)
      .catch((e) => setError(String(e)));
    api("/network/evaluation")
      .then(setReport)
      .catch(() => {});
  }, []);
  useEffect(() => {
    let live = true;
    setProfile(null);
    setError("");
    api(`/network/country/${selected}?year=${year}`)
      .then((p) => {
        if (live) setProfile(p);
      })
      .catch((e) => {
        if (live) setError(String(e));
      });
    return () => {
      live = false;
    };
  }, [selected, year]);
  useEffect(() => {
    generation.current++;
    setResult(null);
    setBusy(false);
  }, [source, sector, shock, year]);
  async function run() {
    const id = ++generation.current;
    setBusy(true);
    setError("");
    try {
      const value = await api("/network/scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country: source,
          sector,
          shock: shock / 100,
          year,
        }),
      });
      if (id === generation.current) setResult(value);
    } catch (e) {
      if (id === generation.current) setError(String(e));
    } finally {
      if (id === generation.current) setBusy(false);
    }
  }
  const countries =
    meta?.nodes.filter((_: any, i: number) => i % 5 === 0) || [];
  return (
    <div className="lab-layout network-workspace">
      <section className="research" style={{ gridColumn: "1 / -1" }}>
        <div className="eyebrow">
          OBSERVED OECD NETWORK · HISTORICAL STRUCTURE
        </div>
        <h2>Who supplies an economy?</h2>
        <p>
          Explore measured production inputs, then test how a hypothetical cost
          change spreads. Seven annual tables connect 81 areas through five
          aggregated sectors.
        </p>
        {error && <p role="alert">{error}</p>}
        <div className="form-pair">
          <label>
            Network buyer country
            <select
              aria-label="Network buyer country"
              value={selected}
              onChange={(e) => onSelect(e.target.value)}
            >
              {!countries.some((c: any) => c.country === selected) && (
                <option value={selected}>{selected} — unavailable</option>
              )}
              {countries.map((c: any) => (
                <option key={c.country} value={c.country}>
                  {c.country_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Network observation year
            <select value={year} onChange={(e) => setYear(+e.target.value)}>
              {[2016, 2017, 2018, 2019, 2020, 2021, 2022].map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </label>
        </div>
        <ExposureMap profile={profile} scenario={result} onSelect={onSelect} />
        {profile && (
          <>
            <h3>
              {profile.sectors[0].country_name}: measured suppliers in {year}
            </h3>
            <p>
              Values are intermediate inputs in current USD millions. Shares use
              the buyer’s gross output, not GDP or total imports.
            </p>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Supplier</th>
                    <th>Inputs (USD million)</th>
                    <th>Share of buyer output</th>
                  </tr>
                </thead>
                <tbody>
                  {profile.suppliers.slice(0, 12).map((s: any) => (
                    <tr key={s.country}>
                      <td>
                        {s.name}
                        {s.domestic ? " (domestic)" : ""}
                      </td>
                      <td>
                        {s.flow_million_usd.toLocaleString(undefined, {
                          maximumFractionDigits: 1,
                        })}
                      </td>
                      <td>{(s.share_of_buyer_output * 100).toFixed(3)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <details>
              <summary>Sector output and foreign input dependence</summary>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Sector</th>
                      <th>Output (USD million)</th>
                      <th>Foreign input share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.sectors.map((s: any) => (
                      <tr key={s.id}>
                        <td>{s.sector}</td>
                        <td>
                          {s.output_million_usd.toLocaleString(undefined, {
                            maximumFractionDigits: 1,
                          })}
                        </td>
                        <td>
                          {s.foreign_input_share == null
                            ? "Unavailable"
                            : (s.foreign_input_share * 100).toFixed(2) + "%"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </>
        )}
      </section>
      <section className="research controls">
        <div className="eyebrow">HYPOTHETICAL COST SCENARIO</div>
        <h2>Follow a cost change</h2>
        <p>
          Apply a direct unit-cost change to one historical country-sector.
          Energy includes coal, oil/gas, refining, mining support and utilities.
          This is not an oil-price forecast.
        </p>
        <label>
          Shock source country
          <select value={source} onChange={(e) => setSource(e.target.value)}>
            {countries.map((c: any) => (
              <option key={c.country} value={c.country}>
                {c.country_name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Shock source sector
          <select value={sector} onChange={(e) => setSector(e.target.value)}>
            {[
              "Primary",
              "Energy",
              "Manufacturing",
              "Construction",
              "Services",
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Direct cost change (%)
          <input
            type="number"
            min={-50}
            max={50}
            value={shock}
            onChange={(e) => setShock(+e.target.value)}
          />
        </label>
        <button className="primary" disabled={busy || !meta} onClick={run}>
          {busy ? "Solving network…" : "Run observed-network scenario"}
        </button>
      </section>
      <section className="research results">
        <h2>Modeled cost transmission</h2>
        {!result ? (
          <p>
            Run a scenario to update the map and see the largest output-weighted
            country effects.
          </p>
        ) : (
          <div role="status">
            <p>
              {result.source_node}:{" "}
              {(result.direct_cost_change * 100).toFixed(1)}% direct cost change
              on {result.network_year} coefficients. Results are hypothetical,
              not observed outcomes.
              <button onClick={() => setResult(null)}>
                Return to supplier map
              </button>
            </p>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Country</th>
                    <th>Modeled cost change</th>
                  </tr>
                </thead>
                <tbody>
                  {result.countries.slice(0, 12).map((c: any) => (
                    <tr key={c.country}>
                      <td>{c.name}</td>
                      <td>{(c.total * 100).toFixed(4)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <details>
              <summary>Inspect propagation and numerical checks</summary>
              <p>
                Linear-system residual: {result.residual.toExponential(2)}.{" "}
                {result.units}.
              </p>
              <pre style={{ overflow: "auto", maxHeight: 300 }}>
                {JSON.stringify(
                  result.largest_recipient_contributions,
                  null,
                  2,
                )}
              </pre>
              {result.assumptions.map((s: string) => (
                <p key={s}>{s}</p>
              ))}
            </details>
          </div>
        )}
      </section>
      <section className="research" style={{ gridColumn: "1 / -1" }}>
        <h2>Does the graph help prediction?</h2>
        <p>
          Exploratory PyTorch experiment: predict next-year nominal USD output
          changes across the 405 related nodes. Three training years
          (2018–2020), one validation year (2021), and only one test year
          (2022). This is too little temporal evidence for a dependable
          forecasting claim.
        </p>
        {report && (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Model / seed</th>
                  <th>MAE (log pp)</th>
                  <th>RMSE (log pp)</th>
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
        )}
        <details>
          <summary>Source, aggregation and validation</summary>
          {meta?.limitations.map((s: string) => (
            <p key={s}>{s}</p>
          ))}
          <p>
            Industry aggregation sums transactions and output first, then
            derives input shares. It preserves totals, but changes within-sector
            detail. Accounting residuals are retained; they are not repaired.
          </p>
          <pre style={{ overflow: "auto", maxHeight: 260 }}>
            {JSON.stringify(
              meta?.validation.find((r: any) => r.year === year),
              null,
              2,
            )}
          </pre>
          <a href={meta?.url} target="_blank" rel="noreferrer">
            OECD ICIO source
          </a>
        </details>
      </section>
    </div>
  );
}
