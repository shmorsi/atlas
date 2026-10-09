import { useEffect, useState } from "react";
import { api } from "./types";
export function CurrentEvents({
  onWorkspace,
}: {
  onWorkspace: (s: string) => void;
}) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [status, setStatus] = useState<any>({ status: "idle" }),
    [filter, setFilter] = useState("");
  function load() {
    api("/events")
      .then(setData)
      .catch((e) => setError(String(e)));
  }
  useEffect(load, []);
  useEffect(() => {
    if (status.status !== "running") return;
    const timer = setInterval(() => {
      api<any>("/updates")
        .then((s) => {
          setStatus(s);
          if (s.status !== "running") load();
        })
        .catch((e) => {
          setError(String(e));
          setStatus({ status: "failed" });
        });
    }, 2000);
    return () => clearInterval(timer);
  }, [status.status]);
  async function refresh() {
    setError("");
    try {
      setStatus(
        await api("/updates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        }),
      );
    } catch (e) {
      setError(String(e));
    }
  }
  const entries =
    data?.entries.filter((r: any) =>
      (r.title + " " + r.source).toLowerCase().includes(filter.toLowerCase()),
    ) || [];
  return (
    <section className="research official-events">
      <div className="eyebrow">DATED OFFICIAL RELEASES · SAVED LOCALLY</div>
      <h2>Events and possible transmission channels</h2>
      <p>
        Read the official announcement, inspect the relevant data, then choose
        explicit assumptions for a scenario. ATLAS does not infer a causal
        market shock from a headline.
      </p>
      <button
        className="primary"
        disabled={status.status === "running"}
        onClick={refresh}
      >
        {status.status === "running"
          ? "Updating official sources…"
          : "Update rates & events"}
      </button>
      {data && (
        <p>
          Cache retrieved: {data.retrieved_at.slice(0, 19).replace("T", " ")}{" "}
          UTC. Latest headline: {data.entries[0]?.published_at.slice(0, 10)}.
          Coverage: selected Federal Reserve and ECB releases.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {status.status !== "idle" && status.status !== "running" && (
        <div role="status">
          <p>
            Update status: {status.status.replace("_", " ")}. Failed sources
            retain the previously published cache.
          </p>
          {status.results?.map((r: any, i: number) => (
            <p key={i}>
              {r.source}: {r.status} {r.detail}
            </p>
          ))}
        </div>
      )}
      <div className="concept-grid">
        <div>
          <h3>Interest rates</h3>
          <p>
            A specified yield increase lowers the present value of fixed bond
            cash flows, holding other inputs fixed.
          </p>
          <button onClick={() => onWorkspace("Rates & Markets")}>
            Inspect yields & bond sensitivity
          </button>
        </div>
        <div>
          <h3>Production costs</h3>
          <p>
            A specified input-cost increase can spread through supplier
            relationships under fixed input shares and full pass-through.
          </p>
          <button onClick={() => onWorkspace("Economic Network")}>
            Trace measured dependencies
          </button>
        </div>
        <div>
          <h3>Portfolio risk</h3>
          <p>
            Asset returns affect holdings and drawdowns. Test uploaded history
            with explicit allocation and transaction-cost assumptions.
          </p>
          <button onClick={() => onWorkspace("Portfolio Studio")}>
            Analyze a portfolio
          </button>
        </div>
      </div>
      <label>
        Filter official releases
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search headlines or source"
        />
      </label>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Published</th>
              <th>Source</th>
              <th>Official announcement</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((r: any) => (
              <tr key={r.url}>
                <td>{r.published_at.slice(0, 10)}</td>
                <td>{r.source}</td>
                <td>
                  <a href={r.url} target="_blank" rel="noreferrer">
                    {r.title}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data && entries.length === 0 && <p>No releases match this filter.</p>}
    </section>
  );
}
