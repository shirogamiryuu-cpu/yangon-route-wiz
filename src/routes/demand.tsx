import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Activity, BrainCircuit, BusFront, Gauge, TrendingUp, Users } from "lucide-react";
import { forecastDemand, getDemandModelInfo, type DemandForecast } from "@/lib/ai/demand.functions";
import {
  TRAFFIC_OPTIONS,
  WEATHER_OPTIONS,
  riskTone,
  type DemandInput,
  type DemandModelInfo,
  type TrafficLevel,
  type Weather,
} from "@/lib/ai/demand-model";
import { cn } from "@/lib/utils";

const TITLE = "Demand & Crowding AI — TransitAI Yangon";
const DESC =
  "Random Forest passenger-demand forecasting for Yangon bus corridors: predicted ridership, overcrowding risk and how many extra buses each hour needs.";

export const Route = createFileRoute("/demand")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DemandPage,
});

const CAPACITY_BY_CORRIDOR: Record<number, number> = { 1: 500, 2: 450, 3: 400, 4: 350, 5: 300 };

function DemandPage() {
  const run = useServerFn(forecastDemand);
  const loadInfo = useServerFn(getDemandModelInfo);

  const [input, setInput] = useState<DemandInput>({
    route_id: 2,
    hour: 8,
    weather: "Rainy",
    is_holiday: 0,
    traffic_level: "High",
    capacity: 450,
    current_buses: 9,
  });
  const [data, setData] = useState<DemandForecast | null>(null);
  const [info, setInfo] = useState<DemandModelInfo | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadInfo({}).then(setInfo).catch(() => setInfo(null));
  }, [loadInfo]);

  const predict = useCallback(
    async (payload: DemandInput) => {
      setBusy(true);
      try {
        setData(await run({ data: payload }));
      } finally {
        setBusy(false);
      }
    },
    [run],
  );

  useEffect(() => {
    void predict(input);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  const set = <K extends keyof DemandInput>(k: K, v: DemandInput[K]) =>
    setInput((cur) => ({ ...cur, [k]: v, ...(k === "route_id" ? { capacity: CAPACITY_BY_CORRIDOR[v as number] ?? cur.capacity } : {}) }));

  const r = data?.result;
  const maxDemand = data ? Math.max(...data.curve.map((c) => c.demand), 1) : 1;

  return (
    <main className="min-h-screen paper-grid">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BusFront className="size-4" />
          </span>
          TransitAI
        </Link>
        <Link to="/prolog" className="rounded-full border bg-card px-3 py-1 text-xs font-semibold text-primary transition hover:bg-accent">
          Prolog Logic Lab
        </Link>
      </header>

      <section className="mx-auto max-w-6xl px-5 pb-16">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
          <BrainCircuit className="size-3.5" /> Machine learning · Random Forest
        </p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">Demand & crowding forecast</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          A Random Forest trained on 5,000 hourly ridership records predicts how many passengers a corridor will carry, how crowded
          the buses will be, and how many extra buses are needed. Route finding stays deterministic — this model only forecasts.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[340px_1fr]">
          {/* Scenario controls */}
          <div className="rounded-2xl border bg-card p-5 shadow-card">
            <h2 className="font-display text-lg font-bold">Scenario</h2>
            <div className="mt-4 space-y-4 text-sm">
              <Field label="Corridor">
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Chip key={n} active={input.route_id === n} onClick={() => set("route_id", n)}>
                      {n}
                    </Chip>
                  ))}
                </div>
              </Field>

              <Field label={`Hour of day — ${String(input.hour).padStart(2, "0")}:00`}>
                <input
                  type="range"
                  min={0}
                  max={23}
                  value={input.hour}
                  onChange={(e) => set("hour", Number(e.target.value))}
                  className="w-full accent-[var(--color-gold)]"
                />
              </Field>

              <Field label="Weather">
                <div className="grid grid-cols-3 gap-1.5">
                  {WEATHER_OPTIONS.map((w) => (
                    <Chip key={w} active={input.weather === w} onClick={() => set("weather", w as Weather)}>
                      {w}
                    </Chip>
                  ))}
                </div>
              </Field>

              <Field label="Traffic level">
                <div className="grid grid-cols-3 gap-1.5">
                  {TRAFFIC_OPTIONS.map((t) => (
                    <Chip key={t} active={input.traffic_level === t} onClick={() => set("traffic_level", t as TrafficLevel)}>
                      {t}
                    </Chip>
                  ))}
                </div>
              </Field>

              <Field label="Public holiday">
                <div className="grid grid-cols-2 gap-1.5">
                  <Chip active={input.is_holiday === 0} onClick={() => set("is_holiday", 0)}>
                    Normal day
                  </Chip>
                  <Chip active={input.is_holiday === 1} onClick={() => set("is_holiday", 1)}>
                    Holiday
                  </Chip>
                </div>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Capacity / hour">
                  <input
                    type="number"
                    value={input.capacity}
                    min={50}
                    max={2000}
                    step={50}
                    onChange={(e) => set("capacity", Number(e.target.value))}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="Buses running">
                  <input
                    type="number"
                    value={input.current_buses}
                    min={1}
                    max={60}
                    onChange={(e) => set("current_buses", Number(e.target.value))}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  />
                </Field>
              </div>
            </div>

            {info && (
              <div className="mt-5 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
                <div className="font-semibold text-foreground">Model card</div>
                <p className="mt-1">{info.algorithm}</p>
                <p className="mt-1">
                  {info.trees} trees · depth {info.maxDepth} · trained on {info.trainRows.toLocaleString()} rows, tested on{" "}
                  {info.testRows.toLocaleString()}
                </p>
                <p className="mt-1">
                  Accuracy on held-out data: MAE {info.mae} passengers · R² {info.r2}
                </p>
                <p className="mt-1">Features: {info.features.join(", ")}</p>
              </div>
            )}
          </div>

          {/* Results */}
          <div className={cn("space-y-4 transition-opacity", busy && "opacity-60")}>
            <div className="grid gap-4 sm:grid-cols-3">
              <Stat icon={Users} label="Predicted passengers" value={r ? String(r.predictedDemand) : "—"} sub={r ? `${r.lower}–${r.upper} range` : ""} />
              <Stat
                icon={Gauge}
                label="Occupancy"
                value={r ? `${r.occupancyPercent}%` : "—"}
                sub={r ? `Risk: ${r.risk}` : ""}
                tone={r ? riskTone(r.risk) : undefined}
              />
              <Stat
                icon={BusFront}
                label="Buses needed"
                value={r ? String(r.requiredBuses) : "—"}
                sub={r ? (r.additionalBuses > 0 ? `Add ${r.additionalBuses} more` : "Current fleet is enough") : ""}
              />
            </div>

            <section className="rounded-2xl ink-panel p-5 shadow-card">
              <h2 className="flex items-center gap-2 font-display text-base font-bold">
                <span className="flex size-7 items-center justify-center rounded-lg bg-gold text-gold-foreground">
                  <BrainCircuit className="size-4" />
                </span>
                Why the model says this
              </h2>
              <ul className="mt-3 space-y-1.5 text-sm">
                {(r?.reasons ?? []).map((reason, i) => (
                  <li key={i} className="flex gap-2 text-ink-foreground/90">
                    <TrendingUp className="mt-0.5 size-3.5 shrink-0 text-gold" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
              {r && (
                <p className="mt-3 text-xs text-ink-muted">
                  Forest agreement (confidence): {Math.round(r.confidence * 100)}% · {r.busCapacity} seats assumed per bus.
                </p>
              )}
            </section>

            <section className="rounded-2xl border bg-card p-5 shadow-card">
              <h2 className="flex items-center gap-2 font-display text-base font-bold">
                <Activity className="size-4 text-primary" /> Predicted demand across the day
              </h2>
              <div className="mt-4 flex h-44 items-end gap-1">
                {(data?.curve ?? []).map((c) => (
                  <div key={c.hour} className="group flex flex-1 flex-col items-center justify-end gap-1">
                    <span className="text-[9px] text-muted-foreground opacity-0 transition group-hover:opacity-100">{c.demand}</span>
                    <div
                      className={cn(
                        "w-full rounded-t transition-all",
                        c.hour === input.hour ? "bg-gold" : c.risk === "Critical" || c.risk === "High" ? "bg-primary/70" : "bg-primary/35",
                      )}
                      style={{ height: `${Math.max(4, (c.demand / maxDemand) * 100)}%` }}
                      title={`${String(c.hour).padStart(2, "0")}:00 — ${c.demand} passengers (${c.risk})`}
                    />
                    <span className="text-[9px] text-muted-foreground">{c.hour % 3 === 0 ? c.hour : ""}</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Same weather, traffic and fleet settings, hour by hour. Gold bar is the hour you selected.
              </p>
            </section>

            <p className="text-xs text-muted-foreground">
              Trained on an operations dataset of 5,000 hourly records for five corridors (route_id 1–5). These corridor ids come
              from that dataset, not from the YBS bus numbers used in journey planning, and the passenger figures are model
              estimates.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{label}</div>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border px-2 py-1.5 text-xs font-semibold transition",
        active ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  sub: string;
  tone?: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-card">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
        <Icon className="size-3.5" /> {label}
      </div>
      <div className={cn("mt-1 font-display text-3xl font-extrabold", tone)}>{value}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}
