import type { TargetType } from "@/features/watchlists/types";

interface TargetTypeOption {
  value: TargetType;
  icon: string;
  label: string;
  description: string;
}

const TARGET_TYPE_OPTIONS: TargetTypeOption[] = [
  {
    value: "person",
    icon: "👤",
    label: "Person",
    description: "Face & body re-ID matching",
  },
  {
    value: "vehicle",
    icon: "🚗",
    label: "Vehicle",
    description: "Zone & line crossing rules",
  },
  {
    value: "object",
    icon: "📦",
    label: "Object",
    description: "General object detection",
  },
];

export interface TargetTypeCardsProps {
  value: TargetType;
  onChange: (v: TargetType) => void;
  disabled?: boolean;
  id: string;
}

export function TargetTypeCards({ value, onChange, disabled, id }: TargetTypeCardsProps) {
  return (
    <div className="space-y-2">
      <span className="text-sm font-medium" id={`${id}-type-label`}>
        Target type
        {disabled && (
          <span className="ml-2 text-xs text-muted-foreground font-normal">(locked after creation)</span>
        )}
      </span>
      <div className="grid grid-cols-3 gap-2" role="group" aria-labelledby={`${id}-type-label`}>
        {TARGET_TYPE_OPTIONS.map((opt) => {
          const isSelected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt.value)}
              className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition-all ${
                isSelected
                  ? "border-primary bg-primary/10 text-primary shadow-sm shadow-primary/20"
                  : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
              } disabled:cursor-not-allowed disabled:opacity-60`}
              aria-pressed={isSelected}
            >
              <span className="text-xl leading-none" aria-hidden="true">{opt.icon}</span>
              <span className="text-xs font-medium">{opt.label}</span>
              <span className="text-[10px] leading-tight opacity-80">{opt.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
