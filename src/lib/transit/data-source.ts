/**
 * Data-source abstraction. The route engine only ever sees a TransitNetwork,
 * so swapping the demo dataset for a Supabase-backed or CSV-backed source
 * requires no engine changes.
 *
 * To connect a database: implement `TransitDataSource.loadNetwork()` by
 * selecting from bus_stops, bus_routes, route_stops, travel_data and fares
 * (see supabase/schema.sql) and return `getDataSource()` accordingly.
 */
import type { TransitNetwork } from "./types";
import { DEMO_NETWORK } from "./demo-data";

export interface TransitDataSource {
  loadNetwork(): Promise<TransitNetwork>;
}

export const demoDataSource: TransitDataSource = {
  async loadNetwork() {
    return DEMO_NETWORK;
  },
};

/** Parses CSV text (header row required) into row objects. Used for imports. */
export function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = (lines[0] ?? "").split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(",").map((c) => c.trim());
    return Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? ""]));
  });
}

/** Build a TransitNetwork from CSV exports of the five tables. */
export function networkFromCsv(files: {
  bus_stops: string;
  bus_routes: string;
  route_stops: string;
  travel_data: string;
  fares: string;
  label?: string;
}): TransitNetwork {
  const num = (v: string) => Number(v);
  const g = (r: Record<string, string>, k: string) => r[k] ?? "";
  return {
    stops: parseCsv(files.bus_stops).map((r) => ({
      id: g(r, "id"),
      name: g(r, "name"),
      latitude: num(g(r, "latitude")),
      longitude: num(g(r, "longitude")),
    })),
    routes: parseCsv(files.bus_routes).map((r) => ({
      id: g(r, "id"),
      route_number: g(r, "route_number"),
      route_name: g(r, "route_name"),
      description: g(r, "description") || null,
    })),
    routeStops: parseCsv(files.route_stops).map((r) => ({
      id: g(r, "id"),
      route_id: g(r, "route_id"),
      stop_id: g(r, "stop_id"),
      stop_sequence: num(g(r, "stop_sequence")),
    })),
    travelData: parseCsv(files.travel_data).map((r) => ({
      id: g(r, "id"),
      route_id: g(r, "route_id"),
      from_stop_id: g(r, "from_stop_id"),
      to_stop_id: g(r, "to_stop_id"),
      time_of_day: g(r, "time_of_day") || "all",
      day_of_week: g(r, "day_of_week") || "all",
      average_travel_minutes: num(g(r, "average_travel_minutes")),
    })),
    fares: parseCsv(files.fares).map((r) => ({ id: g(r, "id"), route_id: g(r, "route_id"), fare: num(g(r, "fare")) })),
    source: { label: files.label ?? "Imported CSV", isDemo: false, currency: "MMK" },
  };
}

let activeSource: TransitDataSource = demoDataSource;

export function getDataSource(): TransitDataSource {
  return activeSource;
}

export function setDataSource(source: TransitDataSource) {
  activeSource = source;
}
