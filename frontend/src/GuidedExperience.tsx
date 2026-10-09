import { useEffect, useState } from "react";
import { Search, ArrowDown, ArrowUpRight } from "lucide-react";
import { WorldMap } from "./WorldMap";
import { Chart } from "./Chart";
import { api, Country, Observation, format } from "./types";
const concepts = [
  {
    code: "NY.GDP.MKTP.KD.ZG",
    name: "Is the economy growing?",
    label: "Economic growth",
    meaning:
      "How much economic output changed over a year, after adjusting for price changes. A negative number means output fell.",
  },
  {
    code: "NY.GDP.MKTP.CD",
    name: "How large is the economy?",
    label: "Economic size",
    meaning:
      "The value of goods and services produced in a year, measured in current US dollars. Exchange rates and prices also affect this number.",
  },
  {
    code: "SP.POP.TOTL",
    name: "How many people live here?",
    label: "Population",
    meaning:
      "The estimated number of residents. It provides context for economic size; a large economy does not necessarily mean high income per person.",
  },
  {
    code: "NE.TRD.GNFS.ZS",
    name: "How much does it trade?",
    label: "Trade relative to the economy",
    meaning:
      "Exports plus imports compared with economic output. It can exceed 100%. It does not measure dependence on a particular trading partner.",
  },
];
export function GuidedAtlas({
  latestYear,
  countries,
  selected,
  onSelect,
  year,
  onYear,
  history,
  loading,
  error,
  detailLoading,
  detailError,
  onRetry,
  onWorkspace,
  onAdvanced,
}: {
  latestYear: number;
  countries: Country[];
  selected: string;
  onSelect: (id: string) => void;
  year: number;
  onYear: (n: number) => void;
  history: Observation[];
  loading: boolean;
  error: string;
  detailLoading: boolean;
  detailError: string;
  onRetry: () => void;
  onWorkspace: (name: string) => void;
  onAdvanced: () => void;
}) {
  const [search, setSearch] = useState(""),
    [region, setRegion] = useState("All regions"),
    [globe, setGlobe] = useState(false),
    [compare, setCompare] = useState("USA");
  const country = countries.find((c) => c.id === selected);
  const other = countries.find((c) => c.id === compare);
  const matches = countries
    .filter(
      (c) =>
        (region === "All regions" || c.region === region) &&
        (c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.id.toLowerCase().includes(search.toLowerCase())),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
  const growth = country?.indicators["NY.GDP.MKTP.KD.ZG"]?.value;
  const headline =
    growth == null
      ? "Growth data are unavailable for this year."
      : growth === 0
        ? "Economic output was unchanged."
        : `The economy ${growth > 0 ? "grew" : "shrank"} ${Math.abs(growth).toFixed(2)}% in ${year}.`;
  const series = history.filter(
    (o) =>
      o.indicator === "NY.GDP.MKTP.KD.ZG" && o.year >= 2000 && o.year <= year,
  );
  useEffect(() => {
    if (compare === selected) setCompare(selected === "USA" ? "CAN" : "USA");
  }, [selected, compare]);
  function choose(id: string) {
    onSelect(id);
    setSearch("");
  }
  if (error)
    return (
      <section className="guide-error" role="alert">
        <h2>We couldn’t load the country data.</h2>
        <p>The local data service may be unavailable.</p>
        <button onClick={onRetry}>Retry connection</button>
        <details>
          <summary>Technical details</summary>
          {error}
        </details>
      </section>
    );
  return (
    <div className="guided-atlas">
      <section className="guide-intro">
        <div>
          <span className="eyebrow">A CLEARER VIEW OF THE WORLD</span>
          <h2>
            Start with a country.
            <br />
            See the bigger picture.
          </h2>
          <p>
            Explore real economic data, understand what the numbers mean, and
            learn how changes can spread.
          </p>
        </div>
        <a href="#understand" className="scroll-cue">
          <span>
            Explore
            <br />
            Understand
            <br />
            Go deeper
          </span>
          <ArrowDown size={20} />
        </a>
      </section>
      <section className="guide-explore" aria-labelledby="explore-title">
        <div className="guide-section-heading">
          <div>
            <span className="step-number">01</span>
            <h2 id="explore-title">Explore a country</h2>
          </div>
          <span className="evidence-chip">HISTORICAL DATA · WORLD BANK</span>
        </div>
        <div className="guide-search-row">
          <div className="guide-search-box">
            <Search size={18} />
            <input
              id="guided-search"
              aria-label="Find a country"
              placeholder="Where would you like to explore?"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
              onKeyDown={(e) => {
                if (e.key === "Escape") setSearch("");
              }}
            />
            {search && (
              <div
                className="guide-search-results"
                aria-label="Country results"
              >
                {matches.length ? (
                  matches.map((c) => (
                    <button key={c.id} onClick={() => choose(c.id)}>
                      <span>{c.name}</span>
                      <small>{c.region}</small>
                    </button>
                  ))
                ) : (
                  <p>No countries match your search.</p>
                )}
              </div>
            )}
          </div>
          <label className="guide-year">
            Year
            <select
              aria-label="Observation year"
              value={year}
              onChange={(e) => onYear(+e.target.value)}
            >
              {Array.from(
                { length: latestYear - 1959 },
                (_, i) => latestYear - i,
              ).map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="guide-country-picks">
          <span>Start with</span>
          {["JPN", "USA", "CHN", "IND", "DEU"]
            .map((id) => countries.find((c) => c.id === id))
            .filter((c): c is Country => !!c)
            .map((c) => (
              <button
                key={c.id}
                aria-pressed={selected === c.id}
                onClick={() => choose(c.id)}
              >
                {c.id === "USA" ? "United States" : c.name}
              </button>
            ))}
        </div>
        <div className="guide-map-layout" aria-busy={loading}>
          {loading && (
            <div className="loading-overlay" role="status">
              Loading {year} observations…
            </div>
          )}
          <div className="guide-map">
            <WorldMap
              cooperativeGestures
              countries={countries}
              selected={selected}
              onSelect={choose}
              indicator="NY.GDP.MKTP.KD.ZG"
              globe={globe}
              region={region}
            />
            <div className="guide-map-bottom">
              <span>Click a country to explore it. Use + / − to zoom.</span>
              <button onClick={() => setGlobe(!globe)} aria-pressed={globe}>
                {globe ? "View flat map" : "View globe"}
              </button>
            </div>
          </div>
          <aside className="guide-country-summary">
            <span className="eyebrow">
              {country?.region} / {year}
            </span>
            <h2>{country?.name || "Loading country…"}</h2>
            <div className="guide-takeaway">
              <span>AT A GLANCE</span>
              <h3>{headline}</h3>
              <p>
                Growth measures the change in goods and services produced,
                adjusted for changing prices.
              </p>
            </div>
            <dl>
              {concepts.slice(1).map((item) => (
                <div key={item.code}>
                  <dt>{item.label}</dt>
                  <dd>
                    {format(country?.indicators[item.code]?.value, item.code)}
                  </dd>
                </div>
              ))}
            </dl>
            <a className="text-link" href="#understand">
              What do these numbers mean? <ArrowDown size={14} />
            </a>
          </aside>
        </div>
        <details className="guide-details">
          <summary>Map options & data notes</summary>
          <div className="guide-options">
            <label>
              Show region
              <select
                aria-label="Region"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              >
                {[
                  "All regions",
                  ...Array.from(new Set(countries.map((c) => c.region))).sort(),
                ].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            <p>
              The map shows annual economic growth. These are historical
              observations through {latestYear}, not a live feed. Missing values
              remain unavailable. Boundaries are generalized. Population
              circles, when enabled, use country reference points.
            </p>
          </div>
        </details>
      </section>
      <section id="understand" className="guide-understand">
        <div className="guide-section-heading">
          <div>
            <span className="step-number">02</span>
            <h2>Understand the numbers</h2>
          </div>
          <span>
            {country?.name} · {year}
          </span>
        </div>
        <p className="unit-guide">
          M = million · B = billion · T = trillion · Dollar values are in US
          dollars.
        </p>
        <div className="concept-grid">
          {concepts.map((item) => (
            <article key={item.code}>
              <h3>{item.name}</h3>
              <strong>
                {format(country?.indicators[item.code]?.value, item.code)}
              </strong>
              <p>{item.meaning}</p>
            </article>
          ))}
        </div>
        <div className="guide-trend">
          <div>
            <span className="eyebrow">PUT THIS YEAR IN CONTEXT</span>
            <h3>One year is part of a longer story.</h3>
            <p>
              See how {country?.name}’s growth changed over time. This chart
              describes what happened; it does not explain why.
            </p>
          </div>
          <div>
            {detailLoading ? (
              <p role="status">Loading history…</p>
            ) : detailError ? (
              <p role="alert">
                Country history is unavailable.{" "}
                <button onClick={onRetry}>Retry history</button>
              </p>
            ) : (
              <>
                <Chart
                  height={245}
                  option={{
                    grid: { left: 48, right: 20, top: 20, bottom: 35 },
                    tooltip: {
                      trigger: "axis",
                      valueFormatter: (v) => `${Number(v).toFixed(2)}%`,
                    },
                    xAxis: {
                      type: "category",
                      data: series.map((o) => o.year),
                      axisLabel: { color: "#93a7b9" },
                    },
                    yAxis: {
                      type: "value",
                      axisLabel: { color: "#93a7b9", formatter: "{value}%" },
                      splitLine: { lineStyle: { color: "#263542" } },
                    },
                    series: [
                      {
                        type: "line",
                        data: series.map((o) => o.value),
                        showSymbol: false,
                        connectNulls: false,
                        lineStyle: { color: "#d7ac65", width: 2 },
                      },
                    ],
                  }}
                />
                <details className="guide-details">
                  <summary>Read the chart as a table</summary>
                  <table>
                    <thead>
                      <tr>
                        <th>Year</th>
                        <th>Economic growth</th>
                      </tr>
                    </thead>
                    <tbody>
                      {series.map((o) => (
                        <tr key={o.year}>
                          <td>{o.year}</td>
                          <td>{format(o.value, o.indicator)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              </>
            )}
          </div>
        </div>
      </section>
      <section className="guide-compare">
        <div className="guide-section-heading">
          <div>
            <span className="step-number">03</span>
            <h2>Add perspective</h2>
          </div>
        </div>
        <div className="guide-comparison-head">
          <p>
            Compare the same year across two economies. Different sizes and
            populations matter when interpreting the numbers.
          </p>
          <label>
            Compare with
            <select
              aria-label="Compare with"
              value={compare}
              onChange={(e) => setCompare(e.target.value)}
            >
              {countries
                .filter((c) => c.id !== selected)
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </label>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Measure</th>
                <th>{country?.name}</th>
                <th>{other?.name}</th>
              </tr>
            </thead>
            <tbody>
              {concepts.map((i) => (
                <tr key={i.code}>
                  <td>{i.label}</td>
                  <td>{format(country?.indicators[i.code]?.value, i.code)}</td>
                  <td>{format(other?.indicators[i.code]?.value, i.code)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="guide-next">
        <div>
          <span className="eyebrow">KEEP EXPLORING</span>
          <h2>What happens when costs rise?</h2>
          <p>
            Try a clearly labeled teaching example to see how a change can reach
            connected industries.
          </p>
          <button
            className="primary"
            onClick={() => onWorkspace("Shock Laboratory")}
          >
            Explore a what-if example
          </button>
        </div>
        <div className="guide-depth">
          <h3>Ready for the details?</h3>
          <p>
            Open the full research view for model diagnostics, financial tools
            and source-level analysis.
          </p>
          <button onClick={onAdvanced}>
            Open research view <ArrowUpRight size={14} />
          </button>
          <button
            className="text-button"
            onClick={() => onWorkspace("Research & Methods")}
          >
            How ATLAS uses data
          </button>
        </div>
      </section>
    </div>
  );
}
export function GuidedScenario({ onAdvanced }: { onAdvanced: () => void }) {
  const [pressure, setPressure] = useState(10),
    [result, setResult] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    setResult(null);
    setError("");
  }, [pressure]);
  async function run() {
    setBusy(true);
    setError("");
    try {
      setResult(
        await api("/shocks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            coefficients: [
              [0.1, 0.2, 0.05],
              [0, 0.15, 0.2],
              [0, 0, 0.1],
            ],
            shock: [pressure / 100, 0, 0],
            mode: "price",
          }),
        }),
      );
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="guided-scenario">
      <div className="guide-section-heading">
        <div>
          <span className="step-number">01</span>
          <h2>Follow a change through the economy</h2>
        </div>
        <span className="evidence-chip hypothetical">
          HYPOTHETICAL TEACHING EXAMPLE
        </span>
      </div>
      <p className="guide-lead">
        Energy suppliers sell to manufacturers. Manufacturers sell to service
        businesses. When one faces higher costs, some of that pressure can
        travel along the chain.
      </p>
      <div className="guide-scenario-grid">
        <div className="scenario-input">
          <h3>Start with cost pressure</h3>
          <p>
            Choose a direct increase in costs for the energy sector of this
            fictional, three-industry economy.
          </p>
          <label htmlFor="cost-pressure">
            Direct cost pressure <strong>{pressure}%</strong>
          </label>
          <input
            id="cost-pressure"
            type="range"
            min="0"
            max="30"
            step="1"
            value={pressure}
            disabled={busy}
            onChange={(e) => setPressure(+e.target.value)}
          />
          <div className="range-labels">
            <span>No change</span>
            <span>30% increase</span>
          </div>
          <button className="primary" disabled={busy} onClick={run}>
            {busy ? "Calculating…" : "See how it spreads"}
          </button>
          <p className="guide-small">
            This is not an oil-price forecast or a result for the country you
            selected. Measured OECD data are available in the Research view’s
            Economic Network.
          </p>
        </div>
        <div className="scenario-explanation">
          <h3>
            {result
              ? "The pressure reaches all three industries."
              : "Three connected industries."}
          </h3>
          <div className="transmission-steps">
            {["Energy", "Manufacturing", "Services"].map((name, i) => (
              <div key={name}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                <h4>{name}</h4>
                <strong>
                  {result ? `${(result.total[i] * 100).toFixed(2)}%` : "—"}
                </strong>
                <p>
                  {result
                    ? "Modeled total cost change"
                    : i === 0
                      ? "Receives the direct cost increase."
                      : i === 1
                        ? "Buys inputs from energy suppliers."
                        : "Buys inputs from both industries."}
                </p>
              </div>
            ))}
          </div>
          {result && (
            <p className="scenario-result" role="status">
              With {pressure}% direct cost pressure on energy, manufacturing
              costs rise {(result.total[1] * 100).toFixed(2)}% in this example.
              These results assume firms pass costs on and keep using the same
              inputs.
            </p>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
      <details className="guide-details">
        <summary>What does this example assume?</summary>
        <p>
          The input relationships are synthetic teaching values. The model holds
          them fixed, allows repeated cost transmission, and assumes full
          pass-through. It does not include substitution, consumer demand,
          policy responses, timing, or financial-market prices. A result is an
          implication of these assumptions, not a prediction of an actual event.
        </p>
      </details>
      <button className="text-button" onClick={onAdvanced}>
        Inspect the equations & change the network
      </button>
    </section>
  );
}
