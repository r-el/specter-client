import { useId, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import type { AlertDisposition, AlertFilters, AlertKind } from "@/features/alerts/api/alerts";

import { CameraPicker } from "./CameraPicker";
import { DateRangePicker, localInputToIso, presetRange, type DatePreset } from "./DateRangePicker";

// ── Main AlertFiltersForm ─────────────────────────────────────────────────────


export function AlertFiltersForm({ onApply }: { onApply: (filters: AlertFilters) => void }) {
  const id = useId();
  const [cameras, setCameras] = useState<string[]>([]);
  const [kind, setKind] = useState("");
  const [disposition, setDisposition] = useState("");
  const [preset, setPreset] = useState<DatePreset>("all");
  const [since, setSince] = useState("");
  const [until, setUntil] = useState("");
  const [error, setError] = useState("");
  const [isApplied, setIsApplied] = useState(false);

  const handlePresetChange = (p: DatePreset) => {
    setPreset(p);
    setError("");
    setIsApplied(false);
    if (p !== "custom") {
      setSince("");
      setUntil("");
    }
  };

  const reset = () => {
    setCameras([]);
    setKind("");
    setDisposition("");
    setPreset("all");
    setSince("");
    setUntil("");
    setError("");
    setIsApplied(false);
    onApply({});
  };

  const hasActiveFilters =
    cameras.length > 0 || kind !== "" || disposition !== "" || preset !== "all";

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    // Resolve date range
    let resolvedSince: string | undefined;
    let resolvedUntil: string | undefined;

    if (preset === "custom") {
      resolvedSince = localInputToIso(since);
      resolvedUntil = localInputToIso(until);
      if ((since && !resolvedSince) || (until && !resolvedUntil)) {
        setError("Enter valid dates.");
        return;
      }
      if (resolvedSince && resolvedUntil && resolvedSince > resolvedUntil) {
        setError("The start date must be before or equal to the end date.");
        return;
      }
    } else {
      const range = presetRange(preset);
      resolvedSince = range.since;
      resolvedUntil = range.until;
    }

    if (cameras.length > 500) {
      setError("Select no more than 500 cameras.");
      return;
    }

    onApply({
      camera_id: cameras.length ? cameras : undefined,
      kind: (kind || undefined) as AlertKind | undefined,
      disposition: (disposition || undefined) as AlertDisposition | undefined,
      created_since: resolvedSince,
      created_until: resolvedUntil,
    });
    setIsApplied(true);
  }

  return (
    <form
      onSubmit={apply}
      className="mb-6 space-y-4 rounded-xl border border-white/10 bg-white/5 p-4"
      aria-label="Filter alerts"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Camera picker */}
        <CameraPicker id={id} selected={cameras} onChange={(ids) => { setCameras(ids); setIsApplied(false); }} />

        {/* Kind filter */}
        <div className="space-y-2">
          <span className="text-sm font-medium">Alert kind</span>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { value: "", label: "All" },
                { value: "identity_match", label: "Identity match" },
                { value: "rule", label: "Rule" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { setKind(opt.value); setIsApplied(false); }}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  kind === opt.value
                    ? "border-primary bg-primary/20 text-primary"
                    : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Disposition filter */}
        <div className="space-y-2">
          <span className="text-sm font-medium">Disposition</span>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { value: "", label: "All" },
                { value: "unreviewed", label: "Unreviewed" },
                { value: "true_positive", label: "True positive" },
                { value: "false_positive", label: "False positive" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { setDisposition(opt.value); setIsApplied(false); }}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  disposition === opt.value
                    ? "border-primary bg-primary/20 text-primary"
                    : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date range */}
        <DateRangePicker
          id={id}
          preset={preset}
          since={since}
          until={until}
          onPresetChange={handlePresetChange}
          onSinceChange={(v) => { setSince(v); setIsApplied(false); }}
          onUntilChange={(v) => { setUntil(v); setIsApplied(false); }}
        />

        {/* Actions */}
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1">
          <Button type="submit" className="flex-1">
            Apply filters
          </Button>
          {hasActiveFilters && (
            <Button type="button" variant="outline" onClick={reset}>
              Reset
            </Button>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <p role="status" className="text-xs text-muted-foreground">
        {isApplied ? "Filters applied." : "Apply filters to update results."}
      </p>
    </form>
  );
}