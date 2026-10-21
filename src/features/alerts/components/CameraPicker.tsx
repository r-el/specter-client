import { useEffect, useState } from "react";
import { Check, ChevronDown, ChevronUp, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCameras } from "@/features/cameras/hooks/use-cameras";

export interface CameraPickerProps {
  selected: string[];
  onChange: (ids: string[]) => void;
  id: string;
}

export function CameraPicker({ selected, onChange, id }: CameraPickerProps) {
  const [open, setOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [rawInput, setRawInput] = useState("");
  const { data: cameras = [], isLoading } = useCameras();

  useEffect(() => {
    if (selected.length === 0 && rawInput !== "") {
      setRawInput("");
    }
  }, [selected.length]);

  const toggle = (cameraId: string) => {
    onChange(
      selected.includes(cameraId)
        ? selected.filter((c) => c !== cameraId)
        : [...selected, cameraId],
    );
  };

  const selectAll = () => onChange(cameras.map((c) => c.id));
  const clearAll = () => onChange([]);

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
            role="combobox"
            aria-expanded={open}
            aria-label="Select cameras"
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
          <div
            role="listbox"
            aria-label="Camera list"
            className="max-h-52 overflow-y-auto py-1"
          >
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
                    role="option"
                    aria-selected={isSelected}
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
        </PopoverContent>
      </Popover>

      {/* Advanced: raw IDs */}
      <div className="pt-0.5">
        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          className="flex w-full items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>Advanced: filter by raw camera IDs</span>
          {advancedOpen ? (
            <ChevronUp className="h-3 w-3" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-3 w-3" aria-hidden="true" />
          )}
        </button>
        {advancedOpen && (
          <div className="pt-2 space-y-2">
            <label htmlFor={`${id}-manual-cameras`} className="sr-only">
              Manual camera IDs
            </label>
            <Input
              id={`${id}-manual-cameras`}
              aria-label="Manual camera IDs"
              placeholder="Paste comma-separated IDs"
              value={rawInput}
              onChange={(e) => {
                setRawInput(e.target.value);
                const ids = [...new Set(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))];
                onChange(ids);
              }}
              className="h-8 text-xs"
            />
          </div>
        )}
      </div>

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
