import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { TRAFFIC_OPTIONS, WEATHER_OPTIONS, type DemandResult, type DemandModelInfo } from "./demand-model";

const demandSchema = z.object({
  route_id: z.number().int().min(1).max(5),
  hour: z.number().int().min(0).max(23),
  weather: z.enum(WEATHER_OPTIONS),
  is_holiday: z.union([z.literal(0), z.literal(1)]),
  traffic_level: z.enum(TRAFFIC_OPTIONS),
  capacity: z.number().int().min(50).max(2000),
  current_buses: z.number().int().min(1).max(60),
});

export interface DemandForecast {
  result: DemandResult;
  curve: { hour: number; demand: number; risk: string }[];
}

/** Predicts passenger demand, overcrowding risk and required buses for one scenario. */
export const forecastDemand = createServerFn({ method: "POST" })
  .inputValidator((input) => demandSchema.parse(input))
  .handler(async ({ data }): Promise<DemandForecast> => {
    const { predictDemand, predictDayCurve } = await import("./demand-model.server");
    return { result: predictDemand(data), curve: predictDayCurve(data) };
  });

/** Metadata about the trained model, for the model card in the UI. */
export const getDemandModelInfo = createServerFn({ method: "GET" }).handler(async (): Promise<DemandModelInfo> => {
  const { demandModelInfo } = await import("./demand-model.server");
  return demandModelInfo();
});
