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
  if (!pl) pl = (await import("tau-prolog")).default ?? (await import("tau-prolog"));
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
