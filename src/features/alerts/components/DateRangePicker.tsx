import { Input } from "@/components/ui/input";

export type DatePreset = "all" | "today" | "24h" | "7d" | "30d" | "custom";

export function presetRange(preset: DatePreset): { since?: string; until?: string } {
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
export function localInputToIso(value: string): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d.toISOString() : undefined;
}

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "24h", label: "Last 24 h" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "custom", label: "Custom…" },
];

export interface DateRangePickerProps {
  preset: DatePreset;
  since: string;
  until: string;
  onPresetChange: (p: DatePreset) => void;
  onSinceChange: (v: string) => void;
  onUntilChange: (v: string) => void;
  id: string;
}

export function DateRangePicker({
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
