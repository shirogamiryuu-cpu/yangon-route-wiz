import { FlaskConical } from "lucide-react";

export function DemoBanner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-foreground">
      <FlaskConical className="size-3.5 shrink-0 text-warning" />
      <span>
        <strong className="font-semibold">Demo data.</strong> {label ?? "Routes, stops, times and fares shown are fictional"} — not
        real Yangon bus service. Real data can be imported later.
      </span>
    </div>
  );
}
