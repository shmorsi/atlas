export type Observation = {
  entity: string;
  indicator: string;
  value: number | null;
  year: number;
  unit: string;
  quality_flag?: string;
};
export type Country = {
  id: string;
  name: string;
  region: string;
  subregion: string;
  longitude: number;
  latitude: number;
  indicators: Record<string, Observation>;
};
export const indicators: Record<string, { label: string; unit: string }> = {
  "NY.GDP.MKTP.CD": { label: "Nominal GDP", unit: "US$" },
  "SP.POP.TOTL": { label: "Population", unit: "people" },
  "NY.GDP.MKTP.KD.ZG": { label: "Real GDP growth", unit: "%" },
  "NE.TRD.GNFS.ZS": { label: "Trade / GDP", unit: "%" },
};
/** Format one cached observation for display. Null stays "Not available". */
export function format(value: number | null | undefined, code: string): string {
  if (value == null) return "Not available";
  if (code === "NY.GDP.MKTP.KD.ZG" || code === "NE.TRD.GNFS.ZS")
    return `${value.toFixed(2)}%`;
  return `${code === "NY.GDP.MKTP.CD" ? "$" : ""}${Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 2 }).format(value)}`;
}
/** Fetch one local API path and surface the response status on failure. */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch("/api" + path, init);
  if (!r.ok) {
    let detail = "";
    try {
      detail = JSON.stringify((await r.json()).detail);
    } catch {}
    throw Error(`Request failed (${r.status}) ${detail}`);
  }
  return r.json();
}
