import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { findRoutes } from "@/lib/transit/engine";
import { getDataSource } from "@/lib/transit/data-source";
import type { RouteResponse } from "@/lib/transit/types";
import { recommend, type Recommendation } from "./recommender";
import { getPredictor } from "./travel-time-predictor";
import { timeOfDayLabel, yangonNow } from "./contracts";

const placeSchema = z.object({
  name: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  kind: z.enum(["stop", "place"]),
  detail: z.string().optional(),
});

const planSchema = z.object({
  origin: placeSchema,
  destination: placeSchema,
  preference: z.enum(["recommended", "fastest", "least_walking", "fewest_transfers", "cheapest"]),
  /** Optional override of departure hour (0–23) and weekday (0–6); defaults to now in Yangon */
  hour: z.number().int().min(0).max(23).optional(),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
});

export interface PlanResponse extends RouteResponse {
  ai: Recommendation;
  timeContext: { hour: number; dayOfWeek: number; label: string };
}

/**
 * Full pipeline: deterministic engine → valid routes → AI predictor + recommender.
 * The AI stage only re-orders and annotates the engine's output.
 */
export const planJourney = createServerFn({ method: "POST" })
  .inputValidator((input) => planSchema.parse(input))
  .handler(async ({ data }): Promise<PlanResponse> => {
    const now = yangonNow();
    const hour = data.hour ?? now.hour;
    const dayOfWeek = data.dayOfWeek ?? now.dayOfWeek;
    const bucket = timeOfDayLabel(
      hour < 6 ? "early" : hour < 10 ? "morning_peak" : hour < 16 ? "midday" : hour < 20 ? "evening_peak" : "night",
    );

    const network = await getDataSource().loadNetwork();
    // 1. Deterministic engine (unchanged) — generates the only routes that may be shown.
    const routes = findRoutes(network, {
      origin: data.origin,
      destination: data.destination,
      preference: data.preference,
      timeOfDay: bucket,
      dayOfWeek: dayOfWeek === 0 || dayOfWeek === 6 ? "weekend" : "weekday",
    });

    // 2. AI layer — predicts and ranks among those valid routes only.
    const predictor = getPredictor({ ML_PREDICTOR_URL: process.env["ML_PREDICTOR_URL"] });
    const ai = await recommend({ journeys: routes.journeys, preference: data.preference, hour, dayOfWeek }, predictor);

    const label = `${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dayOfWeek]} ${String(hour).padStart(2, "0")}:00`;
    return { ...routes, ai, timeContext: { hour, dayOfWeek, label } };
  });
