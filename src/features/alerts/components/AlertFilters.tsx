import { useId, useState } from "react";
import type { FormEvent } from "react";
import { Check, ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCameras } from "@/features/cameras/hooks/use-cameras";
import type { AlertDisposition, AlertFilters, AlertKind } from "@/features/alerts/api/alerts";

// ── Date preset helpers ───────────────────────────────────────────────────────

type DatePreset = "all" | "today" | "24h" | "7d" | "30d" | "custom";

function presetRange(preset: DatePreset): { since?: string; until?: string } {
  if (preset === "all" || preset === "custom") return {};
  const now = new Date();
  const until = now.toISOString();
  if (preset === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { since: start.toISOString(), until };
  }
  const ms: Record<Exclude<DatePreset, "all" | "today" | "custom">, number> = {
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
  };
  return { since: new Date(now.getTime() - ms[preset]).toISOString(), until };
}

/** Convert a local datetime-input value to ISO string, or undefined if empty. */
function localInputToIso(value: string): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d.toISOString() : undefined;
}

// ── Camera Multi-Select Popover ───────────────────────────────────────────────

interface CameraPickerProps {
  selected: string[];
  onChange: (ids: string[]) => void;
  id: string;
}

function CameraPicker({ selected, onChange, id }: CameraPickerProps) {
  const [open, setOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [rawInput, setRawInput] = useState("");
  const { data: cameras = [], isLoading } = useCameras();

  const toggle = (cameraId: string) => {
    onChange(
      selected.includes(cameraId)
        ? selected.filter((c) => c !== cameraId)
        : [...selected, cameraId],
    );
  };

  const selectAll = () => onChange(cameras.map((c) => c.id));
  const clearAll = () => onChange([]);

  const applyRaw = () => {
    const ids = [...new Set(rawInput.split(",").map((s) => s.trim()).filter(Boolean))];
    onChange(ids);
    setRawInput("");
    setAdvancedOpen(false);
    setOpen(false);
  };

  // Build label for trigger button
  let triggerLabel: string;
  if (selected.length === 0) {
    triggerLabel = "All cameras";
  } else if (selected.length === 1) {
    const cam = cameras.find((c) => c.id === selected[0]);
    triggerLabel = cam ? cam.name : "1 camera";
  } else {
    triggerLabel = `${selected.length} cameras`;
  }

  return (
    <div className="space-y-2">
      <label htmlFor={`${id}-camera-trigger`} className="text-sm font-medium">
        Camera
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            id={`${id}-camera-trigger`}
            type="button"
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
          >
            <span className={selected.length === 0 ? "text-muted-foreground" : undefined}>
              {triggerLabel}
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={4}
          className="w-72 p-0 border-white/10 bg-background/95 backdrop-blur-xl"
        >
          {/* Header actions */}
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground">Select cameras</span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={selectAll}
                className="text-xs text-primary hover:underline"
              >
                All
              </button>
              <span className="text-muted-foreground">·</span>
              <button
                type="button"
                onClick={clearAll}
                className="text-xs text-muted-foreground hover:text-foreground hover:underline"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Camera list */}
          <div className="max-h-52 overflow-y-auto py-1">
            {isLoading ? (
              <p className="px-3 py-4 text-center text-xs text-muted-foreground">Loading cameras…</p>
            ) : cameras.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-muted-foreground">No cameras found</p>
            ) : (
              cameras.map((cam) => {
                const isSelected = selected.includes(cam.id);
                const isOnline = cam.live_status === "running";
                return (
                  <button
                    key={cam.id}
                    type="button"
                    onClick={() => toggle(cam.id)}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-white/5 transition-colors"
                  >
                    {/* Status dot */}
                    <span
                      aria-label={isOnline ? "Online" : "Offline"}
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${isOnline ? "bg-emerald-400" : "bg-white/20"}`}
                    />
                    {/* Camera name + location */}
                    <span className="flex-1 text-left leading-tight">
                      <span className={isSelected ? "font-medium text-foreground" : "text-foreground/80"}>
                        {cam.name}
                      </span>
                      {cam.location && (
                        <span className="block text-xs text-muted-foreground">{cam.location}</span>
                      )}
                    </span>
                    {/* Checkmark */}
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Advanced: raw IDs */}
          <div className="border-t border-white/10">
            <button
              type="button"
              onClick={() => setAdvancedOpen((v) => !v)}
              className="flex w-full items-center justify-between px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Advanced: filter by raw camera IDs
              {advancedOpen ? (
                <ChevronUp className="h-3 w-3" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-3 w-3" aria-hidden="true" />
              )}
            </button>
            {advancedOpen && (
              <div className="px-3 pb-3 space-y-2">
                <Input
                  placeholder="Paste comma-separated IDs"
                  value={rawInput}
                  onChange={(e) => setRawInput(e.target.value)}
                  className="h-8 text-xs"
                />
                <Button type="button" size="sm" className="w-full h-7 text-xs" onClick={applyRaw}>
                  Apply raw IDs
                </Button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Active camera chips */}
      {selected.length > 0 && cameras.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-0.5">
          {selected.slice(0, 5).map((id) => {
            const cam = cameras.find((c) => c.id === id);
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-xs text-primary"
              >
                {cam?.name ?? id.slice(0, 8)}
                <button
                  type="button"
                  onClick={() => toggle(id)}
                  className="hover:text-primary/70"
                  aria-label={`Remove ${cam?.name ?? id}`}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            );
          })}
          {selected.length > 5 && (
            <span className="text-xs text-muted-foreground self-center">
              +{selected.length - 5} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Date Preset Chips ─────────────────────────────────────────────────────────

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "24h", label: "Last 24 h" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "custom", label: "Custom…" },
];

interface DateRangePickerProps {
  preset: DatePreset;
  since: string;
  until: string;
  onPresetChange: (p: DatePreset) => void;
  onSinceChange: (v: string) => void;
  onUntilChange: (v: string) => void;
  id: string;
}

function DateRangePicker({
  preset,
  since,
  until,
  onPresetChange,
  onSinceChange,
  onUntilChange,
  id,
}: DateRangePickerProps) {
  return (
    <div className="space-y-2 lg:col-span-2">
      <span className="text-sm font-medium">Date range</span>
      <div className="flex flex-wrap gap-1.5">
        {DATE_PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => onPresetChange(p.value)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              preset === p.value
                ? "border-primary bg-primary/20 text-primary"
                : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {preset === "custom" && (
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="space-y-1">
            <label htmlFor={`${id}-since`} className="text-xs text-muted-foreground">
              From (local time)
            </label>
            <Input
              id={`${id}-since`}
              type="datetime-local"
              step="1"
              value={since}
              onChange={(e) => onSinceChange(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor={`${id}-until`} className="text-xs text-muted-foreground">
              Until (local time)
            </label>
            <Input
              id={`${id}-until`}
              type="datetime-local"
              step="1"
              value={until}
              onChange={(e) => onUntilChange(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>
      )}
    </div>
  );
}

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