import { useEffect, useRef, useState } from "react";
import * as maplibre from "maplibre-gl";
maplibre.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
export function ExposureMap({
  profile,
  scenario,
  onSelect,
}: {
  profile: any;
  scenario: any;
  onSelect: (s: string) => void;
}) {
  const el = useRef<HTMLDivElement>(null),
    map = useRef<maplibre.Map | null>(null),
    [ready, setReady] = useState(false),
    [error, setError] = useState("");
  const callback = useRef(onSelect);
  callback.current = onSelect;
  useEffect(() => {
    const m = new maplibre.Map({
      container: el.current!,
      style: {
        version: 8,
        sources: {},
        layers: [
          {
            id: "ocean",
            type: "background",
            paint: { "background-color": "#07080a" },
          },
        ],
      },
      center: [20, 20],
      zoom: 0.8,
      renderWorldCopies: false,
      cooperativeGestures: true,
    });
    map.current = m;
    const resize = new ResizeObserver(() => m.resize());
    resize.observe(el.current!);
    m.addControl(new maplibre.NavigationControl({ showCompass: false }));
    m.on("load", () => {
      m.resize();
      m.fitBounds(
        [
          [-170, -55],
          [180, 75],
        ],
        { padding: 12, duration: 0 },
      );
      m.addSource("world", { type: "geojson", data: "/data/world.geojson" });
      m.addLayer({
        id: "countries",
        type: "fill",
        source: "world",
        paint: { "fill-color": "#1c1f23", "fill-outline-color": "#3a3f45" },
      });
      m.addSource("connections", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      m.addLayer({
        id: "connections",
        type: "line",
        source: "connections",
        paint: {
          "line-color": "#8e949b",
          "line-opacity": 0.65,
          "line-width": [
            "interpolate",
            ["linear"],
            ["get", "share"],
            0,
            0.5,
            0.01,
            2,
            0.1,
            6,
          ],
        },
      });
      m.on("click", "countries", (e) => {
        const id = e.features?.[0]?.properties?.id;
        if (id) callback.current(id);
      });
      setReady(true);
    });
    m.on("error", (e) => setError(e.error.message));
    return () => {
      resize.disconnect();
      m.remove();
    };
  }, []);
  useEffect(() => {
    if (!ready || !map.current) return;
    const rows = (scenario ? scenario.countries : profile?.suppliers) || [];
    const edges =
      !scenario && profile?.coordinates
        ? profile.suppliers
            .filter(
              (s: any) =>
                !s.domestic && s.coordinates && s.flow_million_usd > 0,
            )
            .slice(0, 8)
            .map((s: any) => ({
              type: "Feature",
              properties: { share: s.share_of_buyer_output },
              geometry: {
                type: "LineString",
                coordinates: [s.coordinates, profile.coordinates],
              },
            }))
        : [];
    (map.current.getSource("connections") as maplibre.GeoJSONSource).setData({
      type: "FeatureCollection",
      features: edges,
    });
    const values = new Map<string, number>(
      rows.map((r: any) => [
        r.country,
        scenario ? r.total : r.share_of_buyer_output,
      ]),
    );
    const expression: any[] = ["match", ["get", "id"]];
    values.forEach((v, code) => {
      const magnitude = Math.abs(v || 0);
      expression.push(
        code,
        magnitude > 0.05
          ? "#e7eaee"
          : magnitude > 0.01
            ? "#8e949b"
            : magnitude > 0.001
              ? "#5c636a"
              : magnitude > 0
                ? "#3a3e44"
                : "#1c1f23",
      );
    });
    expression.push("#1c1f23");
    if (!values.size) {
      map.current.setPaintProperty("countries", "fill-color", "#1c1f23");
      return;
    }
    map.current.setPaintProperty("countries", "fill-color", expression as any);
  }, [ready, profile, scenario]);
  return (
    <>
      <div
        ref={el}
        style={{ height: 360 }}
        aria-label="Historical network exposure map"
      />
      <p>
        {scenario
          ? "Absolute modeled country cost change"
          : "Supplier inputs as a share of the selected buyer’s gross output"}
        : light &gt;5%; mid &gt;1%; dim &gt;0.1%; faint &gt;0. Near-black
        includes zero and unavailable. Exact values and direction appear in the
        tables.{" "}
        {profile &&
          !scenario &&
          "Lines connect the eight largest mapped foreign suppliers; they are relationships, not transport routes. "}
        Some small economies and Rest of World have no map geometry.
      </p>
      {error && (
        <p role="alert">
          Map unavailable: {error}. Use the country selector and tables.
        </p>
      )}
    </>
  );
}
