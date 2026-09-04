/**
 * ⚠️ DEMO DATA — NOT A REAL YANGON BUS SERVICE.
 *
 * Stop names use well-known Yangon neighbourhoods so the map is readable,
 * but the route numbers (DEMO-1 … DEMO-6), connections, travel times and
 * fares are fictional. Replace this via the database / CSV import.
 */
import type { BusRoute, BusStop, Fare, RouteStop, TransitNetwork, TravelData } from "./types";
import { haversineMeters, BUS_METERS_PER_MIN } from "./geo";

const S = (id: string, name: string, latitude: number, longitude: number): BusStop => ({
  id,
  name,
  latitude,
  longitude,
});

export const DEMO_STOPS: BusStop[] = [
  S("s01", "Sule Pagoda", 16.7746, 96.1583),
  S("s02", "Bogyoke Market", 16.7803, 96.155),
  S("s03", "Central Railway Station", 16.783, 96.161),
  S("s04", "Kandawgyi", 16.788, 96.17),
  S("s05", "Shwedagon South Gate", 16.795, 96.149),
  S("s06", "Bahan", 16.806, 96.156),
  S("s07", "Hledan", 16.8275, 96.1315),
  S("s08", "Myaynigone", 16.813, 96.137),
  S("s09", "Sanchaung", 16.809, 96.129),
  S("s10", "Kamayut", 16.832, 96.136),
  S("s11", "Inya Lake", 16.84, 96.147),
  S("s12", "Kabaraye", 16.842, 96.156),
  S("s13", "8 Mile", 16.86, 96.145),
  S("s14", "Yankin Centre", 16.829, 96.165),
  S("s15", "Tamwe", 16.8, 96.173),
  S("s16", "Thingangyun", 16.825, 96.188),
  S("s17", "South Okkalapa", 16.848, 96.18),
  S("s18", "North Dagon", 16.87, 96.195),
  S("s19", "Botahtaung", 16.77, 96.172),
  S("s20", "Pansodan", 16.774, 96.163),
  S("s21", "Lanmadaw", 16.78, 96.144),
  S("s22", "Kyeemyindaing", 16.79, 96.125),
  S("s23", "Ahlone", 16.786, 96.133),
  S("s24", "Insein", 16.89, 96.108),
  S("s25", "Mayangone", 16.862, 96.13),
  S("s26", "Thamaing", 16.875, 96.13),
  S("s27", "Yangon Airport", 16.904, 96.134),
  S("s28", "Kyauk Myaung", 16.805, 96.18),
  S("s29", "Parami", 16.858, 96.156),
  S("s30", "Bayint Naung", 16.856, 96.12),
];

export const DEMO_ROUTES: BusRoute[] = [
  { id: "r1", route_number: "DEMO-1", route_name: "Insein – Sule (Pyay Road)", description: "Demo trunk line down Pyay Road" },
  { id: "r2", route_number: "DEMO-2", route_name: "Airport – Sule (Kabaraye)", description: "Demo line via Kabaraye and Kandawgyi" },
  { id: "r3", route_number: "DEMO-3", route_name: "Kyeemyindaing – Thingangyun", description: "Demo east–west line through downtown" },
  { id: "r4", route_number: "DEMO-4", route_name: "Hledan – North Dagon", description: "Demo northern crosstown" },
  { id: "r5", route_number: "DEMO-5", route_name: "Sanchaung – Sule (riverside)", description: "Demo loop via Tamwe and Botahtaung" },
  { id: "r6", route_number: "DEMO-6", route_name: "Bayint Naung – Thingangyun", description: "Demo northern ring" },
];

const ROUTE_SEQUENCES: Record<string, string[]> = {
  r1: ["s24", "s26", "s25", "s13", "s10", "s07", "s08", "s05", "s21", "s02", "s01"],
  r2: ["s27", "s13", "s29", "s12", "s11", "s06", "s04", "s03", "s20", "s01"],
  r3: ["s22", "s23", "s21", "s02", "s03", "s15", "s28", "s16"],
  r4: ["s07", "s11", "s12", "s14", "s17", "s18"],
  r5: ["s09", "s08", "s06", "s15", "s19", "s20", "s01"],
  r6: ["s30", "s25", "s29", "s14", "s16"],
};

export const DEMO_ROUTE_STOPS: RouteStop[] = Object.entries(ROUTE_SEQUENCES).flatMap(([routeId, seq]) =>
  seq.map((stopId, i) => ({ id: `${routeId}-${i + 1}`, route_id: routeId, stop_id: stopId, stop_sequence: i + 1 })),
);

export const DEMO_FARES: Fare[] = [
  { id: "f1", route_id: "r1", fare: 300 },
  { id: "f2", route_id: "r2", fare: 300 },
  { id: "f3", route_id: "r3", fare: 200 },
  { id: "f4", route_id: "r4", fare: 200 },
  { id: "f5", route_id: "r5", fare: 200 },
  { id: "f6", route_id: "r6", fare: 300 },
];

/** Demo travel_data derived deterministically from distance; peak hours are 30% slower. */
export const DEMO_TRAVEL_DATA: TravelData[] = (() => {
  const byId = new Map(DEMO_STOPS.map((s) => [s.id, s]));
  const rows: TravelData[] = [];
  let n = 0;
  for (const [routeId, seq] of Object.entries(ROUTE_SEQUENCES)) {
    for (let i = 0; i < seq.length - 1; i++) {
      const a = byId.get(seq[i]!)!;
      const b = byId.get(seq[i + 1]!)!;
      const meters = haversineMeters({ lat: a.latitude, lng: a.longitude }, { lat: b.latitude, lng: b.longitude });
      const base = Math.max(2, Math.round((meters * 1.2) / BUS_METERS_PER_MIN));
      for (const [tod, factor] of [
        ["offpeak", 1],
        ["morning_peak", 1.3],
        ["evening_peak", 1.35],
      ] as const) {
        for (const dir of [
          [a.id, b.id],
          [b.id, a.id],
        ]) {
          rows.push({
            id: `t${++n}`,
            route_id: routeId,
            from_stop_id: dir[0]!,
            to_stop_id: dir[1]!,
            time_of_day: tod,
            day_of_week: "all",
            average_travel_minutes: Math.round(base * factor),
          });
        }
      }
    }
  }
  return rows;
})();

export const DEMO_NETWORK: TransitNetwork = {
  stops: DEMO_STOPS,
  routes: DEMO_ROUTES,
  routeStops: DEMO_ROUTE_STOPS,
  travelData: DEMO_TRAVEL_DATA,
  fares: DEMO_FARES,
  source: { label: "Demo dataset (fictional routes)", isDemo: true, currency: "MMK" },
};

/** Well-known places used to seed the location search (approximate coordinates). */
export const DEMO_PLACES: { name: string; detail: string; lat: number; lng: number }[] = [
  { name: "Sule Pagoda", detail: "Downtown Yangon", lat: 16.7745, lng: 96.1581 },
  { name: "Shwedagon Pagoda", detail: "Dagon Township", lat: 16.7983, lng: 96.1497 },
  { name: "Bogyoke Aung San Market", detail: "Pabedan Township", lat: 16.7806, lng: 96.1553 },
  { name: "Yangon Central Railway Station", detail: "Mingalar Taung Nyunt", lat: 16.7833, lng: 96.1614 },
  { name: "Hledan Junction", detail: "Kamayut Township", lat: 16.8278, lng: 96.1312 },
  { name: "Inya Lake", detail: "Kamayut / Bahan", lat: 16.8395, lng: 96.1462 },
  { name: "Kandawgyi Lake", detail: "Bahan Township", lat: 16.7882, lng: 96.1698 },
  { name: "Yangon International Airport", detail: "Mingaladon", lat: 16.9045, lng: 96.1345 },
  { name: "Junction City", detail: "Pabedan Township", lat: 16.7795, lng: 96.1567 },
  { name: "Myanmar Plaza", detail: "Kabaraye Pagoda Road", lat: 16.8384, lng: 96.1564 },
  { name: "Junction Square", detail: "Kamayut Township", lat: 16.8255, lng: 96.1373 },
  { name: "Botahtaung Pagoda", detail: "Botahtaung Township", lat: 16.7696, lng: 96.1722 },
  { name: "Thingangyun Market", detail: "Thingangyun Township", lat: 16.8248, lng: 96.1885 },
  { name: "Insein Market", detail: "Insein Township", lat: 16.8905, lng: 96.1082 },
  { name: "Yangon University", detail: "Kamayut Township", lat: 16.8295, lng: 96.1345 },
  { name: "Yangon General Hospital", detail: "Lanmadaw Township", lat: 16.7795, lng: 96.1497 },
  { name: "Times City", detail: "Kamayut Township", lat: 16.8176, lng: 96.1338 },
  { name: "Kyauk Myaung Market", detail: "Tamwe Township", lat: 16.8052, lng: 96.1798 },
];
