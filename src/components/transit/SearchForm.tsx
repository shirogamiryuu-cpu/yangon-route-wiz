import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowUpDown, Search } from "lucide-react";
import { LocationSearch } from "./LocationSearch";
import { PREFERENCES, type Place, type Preference } from "@/lib/transit/types";
import { cn } from "@/lib/utils";

interface Props {
  initial?: { origin: Place | null; destination: Place | null; preference: Preference };
  compact?: boolean;
}

export function SearchForm({ initial, compact }: Props) {
  const navigate = useNavigate();
  const [origin, setOrigin] = useState<Place | null>(initial?.origin ?? null);
  const [destination, setDestination] = useState<Place | null>(initial?.destination ?? null);
  const [preference, setPreference] = useState<Preference>(initial?.preference ?? "recommended");
  const [error, setError] = useState<string | null>(null);

  const swap = () => {
    setOrigin(destination);
    setDestination(origin);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin || !destination) {
      setError("Pick both a start and a destination from the suggestions.");
      return;
    }
    setError(null);
    navigate({
      to: "/results",
      search: {
        from: origin.name,
        fromLat: origin.lat,
        fromLng: origin.lng,
        to: destination.name,
        toLat: destination.lat,
        toLng: destination.lng,
        pref: preference,
      },
    });
  };

  return (
    <form onSubmit={submit} className={cn("space-y-5", compact && "space-y-4")}>
      <div className="relative grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-end">
        <LocationSearch
          label="From"
          placeholder="Start location, e.g. Hledan"
          value={origin}
          onChange={setOrigin}
          markerClassName="bg-success ring-success/20"
        />
        <button
          type="button"
          onClick={swap}
          aria-label="Swap locations"
          className="mx-auto flex size-11 items-center justify-center rounded-full border bg-card text-foreground shadow-xs transition hover:rotate-180 hover:bg-accent md:mb-0.5"
        >
          <ArrowUpDown className="size-4" />
        </button>
        <LocationSearch
          label="To"
          placeholder="Destination, e.g. Sule Pagoda"
          value={destination}
          onChange={setDestination}
          markerClassName="bg-route-1 ring-route-1/20"
        />
      </div>

      <fieldset>
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Optimise for</legend>
        <div className="flex flex-wrap gap-2">
          {PREFERENCES.map((p) => (
            <button
              type="button"
              key={p.id}
              title={p.hint}
              onClick={() => setPreference(p.id)}
              aria-pressed={preference === p.id}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
                preference === p.id
                  ? "border-primary bg-primary text-primary-foreground shadow-xs"
                  : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-accent",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </fieldset>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        type="submit"
        className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gold px-6 font-display text-base font-bold text-gold-foreground shadow-card transition hover:brightness-105 active:scale-[0.99] md:w-auto"
      >
        <Search className="size-4 transition group-hover:scale-110" />
        Find Route
      </button>
    </form>
  );
}
