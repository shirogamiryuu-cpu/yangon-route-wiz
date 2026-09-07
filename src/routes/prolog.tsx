import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BusFront, Braces, Play, Terminal } from "lucide-react";
import { getPrologKnowledgeBase, listBusNumbers, DEFAULT_BUS_NUMBERS } from "@/lib/prolog/prolog.functions";
import type { KnowledgeBase } from "@/lib/prolog/knowledge-base";
import type { PrologResult } from "@/lib/prolog/run";
import { cn } from "@/lib/utils";

const TITLE = "Prolog Logic Lab — TransitAI Yangon";
const DESC =
  "Run Prolog queries over real Yangon bus facts: which bus serves a stop, direct trips, interchanges and one-transfer journeys, all in a live SWI-style Prolog console.";

export const Route = createFileRoute("/prolog")({
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
  component: PrologLab,
});

const EXAMPLES: { label: string; goal: string; note: string }[] = [
  { label: "Buses in the knowledge base", goal: "bus(N, Name)", note: "Every bus loaded, with its route name." },
  { label: "Stops served by a bus", goal: "serves('36', Stop)", note: "All stops one bus calls at." },
  { label: "Which buses serve a stop?", goal: "serves(Bus, 'Hledan')", note: "Reverse lookup by stop name." },
  { label: "Consecutive stops", goal: "next_stop('36', From, To)", note: "Stop-by-stop order along the route." },
  { label: "Interchange points", goal: "interchange(Stop, '36', Bus2)", note: "Stops where you can change buses." },
  { label: "One-transfer journeys", goal: "one_transfer('Hledan', 'Sule Pagoda', B1, Change, B2)", note: "Two buses with a change stop." },
  { label: "Fare for 2 buses", goal: "trip_fare(2, Total)", note: "Assumed 200 MMK flat fare per boarding." },
];

function PrologLab() {
  const loadKb = useServerFn(getPrologKnowledgeBase);
  const loadBuses = useServerFn(listBusNumbers);

  const [allBuses, setAllBuses] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>(DEFAULT_BUS_NUMBERS);
  const [kb, setKb] = useState<KnowledgeBase | null>(null);
  const [goal, setGoal] = useState("serves(Bus, 'Hledan')");
  const [result, setResult] = useState<PrologResult | null>(null);
  const [running, setRunning] = useState(false);
  const [showProgram, setShowProgram] = useState(false);

  useEffect(() => {
    loadBuses({}).then(setAllBuses).catch(() => setAllBuses([]));
  }, [loadBuses]);

  useEffect(() => {
    let live = true;
    setKb(null);
    loadKb({ data: { buses: selected } })
      .then((k) => live && setKb(k))
      .catch(() => live && setKb(null));
    return () => {
      live = false;
    };
  }, [loadKb, selected]);

  const toggleBus = (n: string) =>
    setSelected((cur) => (cur.includes(n) ? (cur.length > 1 ? cur.filter((x) => x !== n) : cur) : cur.length < 8 ? [...cur, n] : cur));

  const run = useCallback(
    async (g: string) => {
      if (!kb) return;
      setRunning(true);
      setResult(null);
      const { runQuery } = await import("@/lib/prolog/run");
      try {
        setResult(await runQuery(kb.program, g));
      } catch (e) {
        setResult({ answers: [], error: String(e), ms: 0, truncated: false });
      } finally {
        setRunning(false);
      }
    },
    [kb],
  );

  const programPreview = useMemo(() => (kb ? kb.program.split("\n") : []), [kb]);

  return (
    <main className="min-h-screen paper-grid">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BusFront className="size-4" />
          </span>
          TransitAI
        </Link>
        <span className="rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">Prolog Logic Lab</span>
      </header>

      <section className="mx-auto max-w-6xl px-5 pb-16">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
          <Braces className="size-3.5" /> Symbolic reasoning layer
        </p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">Prolog Logic Lab</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          The bus network is exported as Prolog facts and queried with a real Prolog engine (Tau-Prolog, SWI-Prolog compatible
          syntax) running in your browser. Every fact comes from the YBS open dataset — nothing here is generated or guessed.
          This page is a demonstration; journey planning still uses the deterministic route engine.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.15fr]">
          {/* Knowledge base */}
          <div className="rounded-2xl border bg-card p-5 shadow-card">
            <h2 className="font-display text-lg font-bold">1 · Knowledge base</h2>
            <p className="mt-1 text-sm text-muted-foreground">Pick up to 8 buses to assert as facts.</p>
            <div className="mt-4 flex max-h-48 flex-wrap gap-1.5 overflow-y-auto">
              {allBuses.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => toggleBus(n)}
                  aria-pressed={selected.includes(n)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 font-mono text-xs transition",
                    selected.includes(n)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:border-primary/40 hover:bg-accent",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>

            <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
              <Stat label="Facts" value={kb ? kb.factCount.toLocaleString() : "…"} />
              <Stat label="Stops" value={kb ? kb.stopCount.toLocaleString() : "…"} />
              <Stat label="Buses" value={kb ? String(kb.routeNumbers.length) : "…"} />
            </dl>

            <button
              type="button"
              onClick={() => setShowProgram((s) => !s)}
              className="mt-4 text-xs font-semibold text-primary hover:underline"
            >
              {showProgram ? "Hide" : "Show"} the generated Prolog program
            </button>
            {showProgram && (
              <pre className="mt-3 max-h-80 overflow-auto rounded-xl bg-foreground/95 p-3 font-mono text-[11px] leading-relaxed text-background">
                {programPreview.slice(0, 400).join("\n")}
                {programPreview.length > 400 ? `\n% … ${programPreview.length - 400} more lines` : ""}
              </pre>
            )}
          </div>

          {/* Console */}
          <div className="rounded-2xl border bg-card p-5 shadow-card">
            <h2 className="font-display text-lg font-bold">2 · Query console</h2>
            <p className="mt-1 text-sm text-muted-foreground">Write a goal, or start from an example below.</p>

            <div className="mt-4 flex items-center gap-2 rounded-xl border bg-background px-3 py-2 font-mono text-sm">
              <span className="text-muted-foreground">?-</span>
              <input
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && run(goal)}
                spellCheck={false}
                aria-label="Prolog goal"
                className="min-w-0 flex-1 bg-transparent outline-none"
              />
            </div>
            <button
              type="button"
              disabled={!kb || running}
              onClick={() => run(goal)}
              className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl bg-gold px-5 font-display text-sm font-bold text-gold-foreground shadow-card transition hover:brightness-105 disabled:opacity-50"
            >
              <Play className="size-4" /> {running ? "Solving…" : kb ? "Run query" : "Loading facts…"}
            </button>

            <div className="mt-4 rounded-xl bg-foreground/95 p-3 font-mono text-[12px] leading-relaxed text-background">
              <div className="mb-2 flex items-center gap-1.5 text-[11px] opacity-60">
                <Terminal className="size-3" /> output
              </div>
              {!result && <p className="opacity-60">No query run yet.</p>}
              {result?.error && <p className="text-destructive-foreground/90">{result.error}</p>}
              {result && !result.error && result.answers.length === 0 && <p>false.</p>}
              {result?.answers.map((a, i) => (
                <p key={i} className="break-words">
                  {a}
                </p>
              ))}
              {result && !result.error && (
                <p className="mt-2 opacity-60">
                  % {result.answers.length} solution{result.answers.length === 1 ? "" : "s"}
                  {result.truncated ? " (first 25 shown)" : ""} in {result.ms.toFixed(0)} ms
                </p>
              )}
            </div>
          </div>
        </div>

        <h2 className="mt-10 font-display text-lg font-bold">Example goals</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.goal}
              type="button"
              onClick={() => {
                setGoal(ex.goal);
                run(ex.goal);
              }}
              className="rounded-xl border bg-card p-4 text-left transition hover:border-primary/40 hover:bg-accent"
            >
              <p className="text-sm font-semibold">{ex.label}</p>
              <p className="mt-1 font-mono text-xs break-words text-primary">?- {ex.goal}.</p>
              <p className="mt-2 text-xs text-muted-foreground">{ex.note}</p>
            </button>
          ))}
        </div>

        {kb && kb.sampleStops.length > 0 && (
          <p className="mt-6 text-xs text-muted-foreground">
            Stop names you can use in goals: {kb.sampleStops.slice(0, 18).join(" · ")}
          </p>
        )}
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-background p-3">
      <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="font-display text-lg font-bold">{value}</dd>
    </div>
  );
}
