/**
 * Browser-side Tau-Prolog runner. Loaded lazily (client only).
 */
export interface PrologResult {
  answers: string[];
  error?: string;
  ms: number;
  truncated: boolean;
}

let pl: any = null;

async function getPl() {
  if (!pl) {
    // Tau-Prolog assigns its browser streams/file system to implicit globals,
    // which fails under ESM strict mode unless the bindings already exist.
    for (const g of [
      "tau_file_system",
      "tau_user_input",
      "tau_user_output",
      "tau_user_error",
      "nodejs_file_system",
      "nodejs_user_input",
      "nodejs_user_output",
      "nodejs_user_error",
      "nodejs_arguments",
    ]) {
      if (!(g in globalThis)) (globalThis as any)[g] = undefined;
    }
    const mod: any = await import("tau-prolog");
    pl = mod.default ?? mod;
    // The bundle is detected as "node", but only the browser streams exist here.
    const g = globalThis as any;
    g.nodejs_arguments = g.nodejs_arguments ?? [];
    g.nodejs_file_system = g.nodejs_file_system ?? g.tau_file_system;
    g.nodejs_user_input = g.nodejs_user_input ?? g.tau_user_input;
    g.nodejs_user_output = g.nodejs_user_output ?? g.tau_user_output;
    g.nodejs_user_error = g.nodejs_user_error ?? g.tau_user_error;
  }
  return pl;
}

export async function runQuery(program: string, goal: string, limit = 25): Promise<PrologResult> {
  const started = performance.now();
  const engine = await getPl();
  const session = engine.create(500000);

  const consultErr = await new Promise<string | null>((resolve) => {
    session.consult(program, {
      success: () => resolve(null),
      error: (err: unknown) => resolve(engine.format_answer(err)),
    });
  });
  if (consultErr) return { answers: [], error: `Knowledge base error: ${consultErr}`, ms: performance.now() - started, truncated: false };

  const queryErr = await new Promise<string | null>((resolve) => {
    session.query(goal.trim().endsWith(".") ? goal.trim() : `${goal.trim()}.`, {
      success: () => resolve(null),
      error: (err: unknown) => resolve(engine.format_answer(err)),
    });
  });
  if (queryErr) return { answers: [], error: `Query error: ${queryErr}`, ms: performance.now() - started, truncated: false };

  const answers: string[] = [];
  let truncated = false;
  let error: string | undefined;

  await new Promise<void>((resolve) => {
    const next = () => {
      if (answers.length >= limit) {
        truncated = true;
        resolve();
        return;
      }
      session.answer((ans: unknown) => {
        if (ans === false || ans === null) return resolve();
        if (ans && typeof ans === "object" && "args" in (ans as any) && (ans as any).indicator === "throw/1") {
          error = engine.format_answer(ans);
          return resolve();
        }
        answers.push(engine.format_answer(ans));
        next();
      });
    };
    next();
  });

  return { answers, ...(error ? { error } : {}), ms: performance.now() - started, truncated };
}
