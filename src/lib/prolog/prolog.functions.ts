import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getDataSource } from "@/lib/transit/data-source";
import { buildKnowledgeBase } from "./knowledge-base";

/** Bus numbers offered in the Prolog demo (kept small so the program loads instantly). */
export const DEFAULT_BUS_NUMBERS = ["21", "41", "65A"];

/** All bus numbers available in the dataset, for the picker. */
export const listBusNumbers = createServerFn({ method: "GET" }).handler(async (): Promise<string[]> => {
  const network = await getDataSource().loadNetwork();
  return network.routes
    .map((r) => r.route_number)
    .sort((a, b) => (Number(a) || 0) - (Number(b) || 0) || a.localeCompare(b));
});

/** Generates the Prolog program (facts + rules) for the selected buses. */
export const getPrologKnowledgeBase = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ buses: z.array(z.string()).min(1).max(8) }).parse(input))
  .handler(async ({ data }) => {
    const network = await getDataSource().loadNetwork();
    return buildKnowledgeBase(network, data.buses);
  });
