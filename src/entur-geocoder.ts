/**
 * Entur Geocoder API – search for stops by name and get NSR:StopPlace IDs.
 * Same API as search-stops.sh.
 * Supports filtering by transport type (train, bus) via category/mode.
 */

const GEOCODER_URL = "https://api.entur.io/geocoder/v1/autocomplete";
const ET_CLIENT_NAME = "openclaw-entur-test";

export type TransportType = "train" | "bus";

export interface StopResult {
  name: string;
  id: string;
  layer: string;
  /** Transport types at this stop (train, bus, or both). Empty for non-venue results. */
  transportTypes: TransportType[];
}

type GeocoderFeature = {
  properties?: {
    label?: string;
    id?: string;
    layer?: string;
    category?: string[];
    mode?: Array<Record<string, unknown>>;
  };
};

function getTransportTypes(properties: GeocoderFeature["properties"]): TransportType[] {
  const types: TransportType[] = [];
  if (!properties) return types;
  const cat = properties.category ?? [];
  const mode = properties.mode ?? [];
  const hasRail =
    cat.includes("railStation") || mode.some((m) => Object.prototype.hasOwnProperty.call(m, "rail"));
  const hasBus =
    cat.includes("busStation") ||
    cat.includes("onstreetBus") ||
    mode.some((m) => Object.prototype.hasOwnProperty.call(m, "bus"));
  if (hasRail) types.push("train");
  if (hasBus) types.push("bus");
  return types;
}

function matchesTransportFilter(
  transportTypes: TransportType[],
  filter: "train" | "bus" | "both"
): boolean {
  if (filter === "both") return transportTypes.length > 0;
  return transportTypes.includes(filter);
}

export async function searchStops(
  text: string,
  options: { lang?: string; size?: number; transportMode?: "train" | "bus" | "both" } = {}
): Promise<StopResult[]> {
  const { lang = "en", size = 10, transportMode } = options;
  const params = new URLSearchParams({
    text,
    lang,
    size: String(Math.min(100, Math.max(1, size))),
  });
  const res = await fetch(`${GEOCODER_URL}?${params}`, {
    headers: { "ET-Client-Name": ET_CLIENT_NAME },
  });
  if (!res.ok) {
    throw new Error(`Entur Geocoder error: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as { features?: GeocoderFeature[] };
  const features = data.features ?? [];
  let results: StopResult[] = features.map((f) => {
    const transportTypes = getTransportTypes(f.properties);
    return {
      name: f.properties?.label ?? "",
      id: f.properties?.id ?? "",
      layer: f.properties?.layer ?? "",
      transportTypes,
    };
  });
  if (transportMode) {
    results = results.filter((s) => matchesTransportFilter(s.transportTypes, transportMode));
  }
  return results;
}
