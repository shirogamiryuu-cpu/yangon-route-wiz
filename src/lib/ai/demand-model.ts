/**
 * Passenger-demand model — shared types and the pure decision logic that turns a
 * predicted passenger count into an overcrowding risk level and a bus-allocation
 * recommendation.
 *
 * The regressor itself is a Random Forest trained on transport_data_5000.csv
 * (see /ml). Only the trained trees live server-side (demand-model.server.ts);
 * everything in this file is browser-safe.
 */

export const WEATHER_OPTIONS = ["Sunny", "Cloudy", "Rainy"] as const;
export const TRAFFIC_OPTIONS = ["Low", "Medium", "High"] as const;
export type Weather = (typeof WEATHER_OPTIONS)[number];
export type TrafficLevel = (typeof TRAFFIC_OPTIONS)[number];

export interface DemandInput {
  /** Corridor id 1–5 as used by the operations dataset */
  route_id: number;
  /** 0–23 local hour */
  hour: number;
  weather: Weather;
  is_holiday: 0 | 1;
  traffic_level: TrafficLevel;
  /** Corridor passenger capacity per hour */
  capacity: number;
  current_buses: number;
}

export interface DemandModelInfo {
  name: string;
  version: string;
  algorithm: string;
  trees: number;
  maxDepth: number;
  trainRows: number;
  testRows: number;
  mae: number;
  r2: number;
  features: string[];
}

export type CrowdRisk = "Low" | "Medium" | "High" | "Critical";

export interface DemandResult {
  input: DemandInput;
  /** Mean prediction across the forest, rounded to whole passengers */
  predictedDemand: number;
  /** Spread across the individual trees (uncertainty proxy) */
  lower: number;
  upper: number;
  /** 0–1, higher when the trees agree */
  confidence: number;
  occupancyPercent: number;
  risk: CrowdRisk;
  busCapacity: number;
  requiredBuses: number;
  additionalBuses: number;
  reasons: string[];
  model: DemandModelInfo;
}

/** Seats per bus assumed by the allocation calculation (from bus_allocation.py). */
export const BUS_CAPACITY = 50;

export function riskFromOccupancy(occupancy: number): CrowdRisk {
  if (occupancy < 70) return "Low";
  if (occupancy < 90) return "Medium";
  if (occupancy <= 100) return "High";
  return "Critical";
}

export function riskTone(risk: CrowdRisk): string {
  switch (risk) {
    case "Low":
      return "text-success";
    case "Medium":
      return "text-gold-foreground";
    case "High":
      return "text-warning";
    default:
      return "text-destructive";
  }
}

export function buildReasons(i: DemandInput, r: Omit<DemandResult, "reasons" | "model">): string[] {
  const out: string[] = [];
  const peak = (i.hour >= 7 && i.hour <= 9) || (i.hour >= 16 && i.hour <= 19);
  out.push(
    `The forest predicts ${r.predictedDemand} passengers at ${String(i.hour).padStart(2, "0")}:00${peak ? " (peak hour)" : ""} on corridor ${i.route_id}.`,
  );
  out.push(`${i.weather.toLowerCase()} weather and ${i.traffic_level.toLowerCase()} traffic were part of the prediction.`);
  if (i.is_holiday) out.push("The day is marked as a public holiday, which usually lowers commuter demand.");
  out.push(
    `That is ${r.occupancyPercent}% of the ${i.capacity}-passenger corridor capacity, so crowding risk is ${r.risk.toLowerCase()}.`,
  );
  out.push(
    r.additionalBuses > 0
      ? `${r.requiredBuses} buses of ${BUS_CAPACITY} seats are needed against ${i.current_buses} running — add ${r.additionalBuses}.`
      : `${i.current_buses} buses already cover the ${r.requiredBuses} needed, so no extra buses are required.`,
  );
  return out;
}
