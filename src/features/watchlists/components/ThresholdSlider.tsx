import { formatRatioAsPercent } from "@/features/watchlists/constants";

export interface ThresholdSliderProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}

export function ThresholdSlider({ id, label, value, onChange, disabled }: ThresholdSliderProps) {
  const numericValue = Number(value);
  const percent = Number.isFinite(numericValue) ? Math.round(numericValue * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-mono font-medium text-primary">
          {formatRatioAsPercent(value) || "—"}
        </span>
      </div>
      <input
        id={id}
        type="number"
        min={0}
        max={1}
        step="any"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-8 w-full rounded-md border border-input bg-background px-2.5 py-1 text-xs"
      />
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={Number.isFinite(numericValue) ? numericValue : 0}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full accent-primary disabled:opacity-50 disabled:cursor-not-allowed"
        aria-hidden="true"
        aria-valuetext={`${percent}%`}
        tabIndex={-1}
      />
      <div className="flex justify-between text-[10px] text-muted-foreground select-none">
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
    </div>
  );
}
