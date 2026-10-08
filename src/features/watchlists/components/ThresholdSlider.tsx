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
        type="range"
        min={0}
        max={100}
        step={1}
        value={percent}
        disabled={disabled}
        onChange={(e) => onChange(String(Number(e.target.value) / 100))}
        className="w-full accent-primary disabled:opacity-50 disabled:cursor-not-allowed"
        aria-valuetext={`${percent}%`}
      />
      <div className="flex justify-between text-[10px] text-muted-foreground select-none">
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
    </div>
  );
}
