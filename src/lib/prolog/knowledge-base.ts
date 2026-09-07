/**
 * Prolog knowledge-base generator.
 *
 * Turns the (deterministic) YBS transit network into a Prolog program:
 * facts are generated ONLY from real dataset rows — no invented stops,
 * bus numbers or fares. The rules on top are pure logic over those facts.
 */
import type { TransitNetwork } from "@/lib/transit/types";

/** Escapes a value into a quoted Prolog atom. */
function atom(v: string | number): string {
  return `'${String(v).replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

export const PROLOG_RULES = `% ---------- Rules (pure logic over the facts above) ----------

% serves(Bus, Stop) — bus Bus calls at stop named Stop
serves(Bus, StopName) :-
    stop_on_route(Bus, StopId, _),
    stop(StopId, StopName, _, _).

% direct(Bus, From, To) — one bus goes From -> To in the timetable order
direct(Bus, From, To) :-
    stop_on_route(Bus, A, SeqA),
    stop(A, From, _, _),
    stop_on_route(Bus, B, SeqB),
    stop(B, To, _, _),
    SeqA < SeqB.

% next_stop(Bus, From, To) — consecutive stops on the same bus
next_stop(Bus, From, To) :-
    stop_on_route(Bus, A, SeqA),
    stop(A, From, _, _),
    SeqB is SeqA + 1,
    stop_on_route(Bus, B, SeqB),
    stop(B, To, _, _).

% interchange(StopName, Bus1, Bus2) — a stop where you can change buses
interchange(StopName, Bus1, Bus2) :-
    serves(Bus1, StopName),
    serves(Bus2, StopName),
    Bus1 \\== Bus2.

% one_transfer(From, To, Bus1, Change, Bus2) — trip with exactly one change
one_transfer(From, To, Bus1, Change, Bus2) :-
    direct(Bus1, From, Change),
    direct(Bus2, Change, To),
    Bus1 \\== Bus2.

% fare(Bus, Mmk) — assumed flat fare per boarding (estimate, not dataset data)
fare(_, 200).

% trip_fare(NumberOfBuses, TotalMmk)
trip_fare(N, Total) :- Total is N * 200.
`;

export interface KnowledgeBase {
  /** The full Prolog program: facts + rules. */
  program: string;
  routeNumbers: string[];
  factCount: number;
  stopCount: number;
  sampleStops: string[];
}

/** Builds a Prolog program for the given bus numbers (kept small so it loads fast). */
export function buildKnowledgeBase(network: TransitNetwork, routeNumbers: string[]): KnowledgeBase {
  const routes = network.routes.filter((r) => routeNumbers.includes(r.route_number));
  const routeIds = new Set(routes.map((r) => r.id));
  const rs = network.routeStops
    .filter((r) => routeIds.has(r.route_id))
    .sort((a, b) => a.route_id.localeCompare(b.route_id) || a.stop_sequence - b.stop_sequence);

  const byId = new Map(network.routes.map((r) => [r.id, r]));
  const usedStopIds = new Set(rs.map((r) => r.stop_id));
  const stops = network.stops.filter((s) => usedStopIds.has(s.id));

  const lines: string[] = [];
  lines.push("% ---------- Facts generated from the YBS open dataset ----------");
  lines.push("% bus(Number, Name).");
  for (const r of routes) lines.push(`bus(${atom(r.route_number)}, ${atom(r.route_name)}).`);
  lines.push("");
  lines.push("% stop(Id, Name, Lat, Lng).");
  for (const s of stops) lines.push(`stop(${atom(s.id)}, ${atom(s.name)}, ${s.latitude}, ${s.longitude}).`);
  lines.push("");
  lines.push("% stop_on_route(Bus, StopId, Sequence).");
  for (const r of rs) {
    const bus = byId.get(r.route_id);
    if (bus) lines.push(`stop_on_route(${atom(bus.route_number)}, ${atom(r.stop_id)}, ${r.stop_sequence}).`);
  }
  const factCount = routes.length + stops.length + rs.length;
  lines.push("");

  return {
    program: `${lines.join("\n")}\n${PROLOG_RULES}`,
    routeNumbers: routes.map((r) => r.route_number),
    factCount,
    stopCount: stops.length,
    sampleStops: [...new Set(stops.map((s) => s.name))].slice(0, 40),
  };
}
