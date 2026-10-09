import { useEffect, useRef, useState } from "react";
import type { MapboxOverlay as PopulationOverlay } from "@deck.gl/mapbox";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
import type { Country } from "./types";
import { format, indicators } from "./types";
export function WorldMap({
  countries,
  selected,
  onSelect,
  indicator,
  globe,
  region,
  cooperativeGestures = false,
}: {
  countries: Country[];
  selected: string;
  onSelect: (id: string) => void;
  indicator: string;
  globe: boolean;
  region: string;
  cooperativeGestures?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null),
    map = useRef<maplibregl.Map | null>(null),
    current = useRef({ countries, onSelect, indicator });
  current.current = { countries, onSelect, indicator };
  const [population, setPopulation] = useState(false);
  const [ready, setReady] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let m: maplibregl.Map;
    try {
      m = new maplibregl.Map({
        container: container.current!,
        style: {
          version: 8,
          sources: {},
          layers: [
            {
              id: "ocean",
              type: "background",
              paint: { "background-color": "#0b1520" },
            },
          ],
        },
        center: [24, 23],
        zoom: 0.2,
        renderWorldCopies: false,
        minZoom: -1,
        maxZoom: 7,
        attributionControl: false,
        cooperativeGestures,
      });
      map.current = m;
    } catch (e) {
      setError(String(e));
      return;
    }
    m.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right",
    );
    m.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution: "Natural Earth · Public domain · 1:110m",
      }),
      "bottom-right",
    );
    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 14,
    });
    m.on("load", () => {
      m.fitBounds(
        [
          [-180, -60],
          [180, 82],
        ],
        { padding: 30, duration: 0 },
      );
      m.addSource("world", {
        type: "geojson",
        data: "/data/world.geojson",
        promoteId: "id",
      });
      m.addLayer({
        id: "land",
        type: "fill",
        source: "world",
        paint: { "fill-color": "#253949", "fill-opacity": 0.95 },
      });
      m.addLayer({
        id: "borders",
        type: "line",
        source: "world",
        paint: {
          "line-color": "#526374",
          "line-width": 0.65,
          "line-opacity": 0.65,
        },
      });
      m.addLayer({
        id: "selection",
        type: "line",
        source: "world",
        filter: ["==", "id", "JPN"],
        paint: { "line-color": "#e0b36b", "line-width": 2 },
      });
      m.addLayer({
        id: "hover",
        type: "line",
        source: "world",
        filter: ["==", "id", ""],
        paint: { "line-color": "#c2d6e2", "line-width": 1.5 },
      });
      const graticule: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: [],
      };
      for (let lon = -180; lon < 180; lon += 30)
        graticule.features.push({
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: Array.from({ length: 33 }, (_, i) => [
              lon,
              -80 + i * 5,
            ]),
          },
        });
      for (let lat = -60; lat <= 60; lat += 30)
        graticule.features.push({
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: Array.from({ length: 73 }, (_, i) => [
              -180 + i * 5,
              lat,
            ]),
          },
        });
      m.addSource("grid", { type: "geojson", data: graticule });
      m.addLayer(
        {
          id: "grid",
          type: "line",
          source: "grid",
          paint: {
            "line-color": "#73869a",
            "line-opacity": 0.1,
            "line-width": 1,
          },
        },
        "land",
      );
      setReady(true);
    });
    m.on("mousemove", "land", (e) => {
      const id = e.features?.[0]?.properties.id;
      const c = current.current.countries.find((x) => x.id === id);
      if (!c) return;
      m.getCanvas().style.cursor = "pointer";
      m.setFilter("hover", ["==", "id", id]);
      const el = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = c.name;
      const value = document.createElement("div");
      value.textContent = `${indicators[current.current.indicator].label}: ${format(c.indicators[current.current.indicator]?.value, current.current.indicator)}`;
      el.append(name, value);
      popup.setLngLat(e.lngLat).setDOMContent(el).addTo(m);
    });
    m.on("mouseleave", "land", () => {
      m.getCanvas().style.cursor = "";
      m.setFilter("hover", ["==", "id", ""]);
      popup.remove();
    });
    m.on("click", "land", (e) => {
      const id = e.features?.[0]?.properties.id;
      if (id) current.current.onSelect(id);
    });
    m.on("idle", () => {
      if (container.current)
        container.current.dataset.renderedFeatures = String(
          m.queryRenderedFeatures({ layers: ["land"] }).length,
        );
    });
    m.on("error", (e) => setError(e.error.message));
    return () => {
      popup.remove();
      m.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    if (!ready || !map.current || !countries.length) return;
    const m = map.current;
    m.setFilter("selection", ["==", "id", selected]);
    m.setProjection({ type: globe ? "globe" : "mercator" });
    const expression: any = ["match", ["get", "id"]];
    countries.forEach((c) => {
      const v = c.indicators[indicator]?.value;
      let color = "#243341";
      if (v != null) {
        if (indicator === "NY.GDP.MKTP.KD.ZG")
          color =
            v < 0
              ? "#77484b"
              : v < 2
                ? "#344f58"
                : v < 5
                  ? "#3c7377"
                  : "#6ba397";
        else {
          const t =
            indicator === "NY.GDP.MKTP.CD"
              ? Math.log10(Math.max(v, 1)) / 14
              : indicator === "SP.POP.TOTL"
                ? Math.log10(Math.max(v, 1)) / 10
                : v / 180;
          color =
            t > 0.8
              ? "#608e94"
              : t > 0.65
                ? "#426a77"
                : t > 0.45
                  ? "#304e60"
                  : "#243b4d";
        }
      }
      expression.push(c.id, color);
    });
    expression.push("#243341");
    m.setPaintProperty("land", "fill-color", expression);
    const filter: any =
      region === "All regions" ? null : ["==", ["get", "region"], region];
    m.setFilter("land", filter);
    m.setFilter("borders", filter);
  }, [ready, countries, selected, indicator, globe, region]);
  useEffect(() => {
    if (!ready || !map.current) return;
    const c = countries.find((c) => c.id === selected);
    if (c)
      map.current.easeTo({ center: [c.longitude, c.latitude], duration: 700 });
  }, [selected]);
  useEffect(() => {
    if (!ready || !map.current) return;
    const m = map.current;
    const markers = countries
      .filter((c) => region === "All regions" || c.region === region)
      .map((c) => {
        const el = document.createElement("span");
        el.className = "country-map-label";
        el.textContent = c.name;
        return new maplibregl.Marker({ element: el })
          .setLngLat([c.longitude, c.latitude])
          .addTo(m);
      });
    const update = () =>
      markers.forEach(
        (marker) =>
          (marker.getElement().style.display =
            m.getZoom() >= 2.5 ? "block" : "none"),
      );
    update();
    m.on("zoom", update);
    return () => {
      m.off("zoom", update);
      markers.forEach((marker) => marker.remove());
    };
  }, [ready, countries, region]);
  useEffect(() => {
    if (!ready || !map.current || !population || globe) return;
    const m = map.current;
    let live = true;
    let overlay: PopulationOverlay | null = null;
    Promise.all([import("@deck.gl/mapbox"), import("@deck.gl/layers")])
      .then(([{ MapboxOverlay }, { ScatterplotLayer }]) => {
        if (!live) return;
        overlay = new MapboxOverlay({
          layers: [
            new ScatterplotLayer<Country>({
              id: "observed-population",
              data: countries.filter(
                (c) =>
                  (region === "All regions" || c.region === region) &&
                  c.indicators["SP.POP.TOTL"]?.value != null,
              ),
              getPosition: (c) => [c.longitude, c.latitude],
              getRadius: (c) =>
                Math.sqrt(c.indicators["SP.POP.TOTL"].value!) * 15,
              getFillColor: [215, 172, 101, 95],
              getLineColor: [215, 172, 101, 180],
              stroked: true,
              lineWidthMinPixels: 1,
              pickable: false,
            }),
          ],
        });
        m.addControl(overlay);
      })
      .catch((e) => {
        if (live) setError("Population overlay unavailable: " + String(e));
      });
    return () => {
      live = false;
      if (overlay && m.hasControl(overlay)) m.removeControl(overlay);
    };
  }, [ready, population, globe, countries, region]);
  return (
    <div className="map-wrap">
      <div
        ref={container}
        className="map"
        data-testid="world-map"
        aria-label="Interactive world map. Use country search for keyboard selection."
      />
      {error && (
        <div className="map-error">
          Map unavailable: {error}. Country search and tables remain available.
        </div>
      )}
      <div className="map-caption">
        <span>WORLD DEVELOPMENT INDICATORS</span>
        <strong>{indicators[indicator].label}</strong>
        <div className="legend">
          {indicator === "NY.GDP.MKTP.KD.ZG" ? (
            <>
              <i style={{ background: "#77484b" }} /> &lt;0%{" "}
              <i style={{ background: "#344f58" }} /> 0–2%{" "}
              <i style={{ background: "#3c7377" }} /> 2–5% <b /> ≥5%
            </>
          ) : (
            <>
              <i /> Lower <b /> Higher
            </>
          )}
          <em /> No data
        </div>
      </div>
      <div className="map-note">Historical observations · No live feed</div>
      <button
        className="population-toggle"
        disabled={globe}
        aria-pressed={population && !globe}
        onClick={() => setPopulation(!population)}
      >
        Population circles
      </button>
      {population && !globe && (
        <div className="population-note">
          Circle area ∝ observed population · Country label coordinates
        </div>
      )}
    </div>
  );
}
