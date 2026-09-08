/**
 * Server-only inference for the passenger-demand Random Forest.
 * The trees in ./models/demand-forest.json were trained on ml/transport_data_5000.csv
 * with the same feature set as ml/train_model.py (route_id, hour, weather, is_holiday,
 * traffic_level, capacity, current_buses -> passenger_count).
 */
import forest from "./models/demand-forest.json";
import {
  BUS_CAPACITY,
  buildReasons,
  riskFromOccupancy,
  type DemandInput,
  type DemandModelInfo,
  type DemandResult,
} from "./demand-model";

type Node = { v: number } | { f: number; t: number; l: Node; r: Node };

interface Forest {
  name: string;
  version: string;
  features: string[];
  weather: string[];
  traffic: string[];
  metrics: { mae: number; r2: number; trainRows: number; testRows: number; trees: number; maxDepth: number };
  trees: Node[];
}

const F = forest as unknown as Forest;

export function demandModelInfo(): DemandModelInfo {
  return {
    name: F.name,
    version: F.version,
    algorithm: "Random Forest regressor (bagged CART, variance-reduction splits)",
    trees: F.metrics.trees,
    maxDepth: F.metrics.maxDepth,
    trainRows: F.metrics.trainRows,
    testRows: F.metrics.testRows,
    mae: F.metrics.mae,
    r2: F.metrics.r2,
    features: F.features,
  };
}

function encode(i: DemandInput): number[] {
  return [
    i.route_id,
    i.hour,
    i.is_holiday,
    i.capacity,
    i.current_buses,
    ...F.weather.map((w) => (i.weather === w ? 1 : 0)),
    ...F.traffic.map((t) => (i.traffic_level === t ? 1 : 0)),
  ];
}

function evalTree(node: Node, x: number[]): number {
  let n = node;
  while (!("v" in n)) n = (x[n.f] ?? 0) <= n.t ? n.l : n.r;
  return n.v;
}

export function predictDemand(input: DemandInput): DemandResult {
  const x = encode(input);
  const votes = F.trees.map((t) => evalTree(t, x));
  const mean = votes.reduce((a, b) => a + b, 0) / votes.length;
  const sd = Math.sqrt(votes.reduce((a, b) => a + (b - mean) ** 2, 0) / votes.length);

  const predictedDemand = Math.round(mean);
  const occupancyPercent = Math.round((predictedDemand / input.capacity) * 1000) / 10;
  const risk = riskFromOccupancy(occupancyPercent);
  const requiredBuses = Math.ceil(predictedDemand / BUS_CAPACITY);
  const additionalBuses = Math.max(0, requiredBuses - input.current_buses);

  const core = {
    input,
    predictedDemand,
    lower: Math.max(0, Math.round(mean - sd)),
    upper: Math.round(mean + sd),
    confidence: Math.max(0.3, Math.min(0.95, 1 - sd / Math.max(mean, 1))),
    occupancyPercent,
    risk,
    busCapacity: BUS_CAPACITY,
    requiredBuses,
    additionalBuses,
  };

  return { ...core, reasons: buildReasons(input, core), model: demandModelInfo() };
}

/** Hour-by-hour demand curve for one scenario (used by the chart). */
export function predictDayCurve(input: DemandInput): { hour: number; demand: number; risk: string }[] {
  return Array.from({ length: 24 }, (_, hour) => {
    const r = predictDemand({ ...input, hour });
    return { hour, demand: r.predictedDemand, risk: r.risk };
  });
}
