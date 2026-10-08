import { useId, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WatchlistError } from "./WatchlistFeedback";
import { MetadataField } from "./MetadataField";
import { WatchlistSensitivityPresets } from "./WatchlistSensitivityPresets";
import {
  DEFAULT_APPEARANCE_MATCH_THRESHOLD,
  DEFAULT_FACE_MATCH_THRESHOLD,
} from "@/features/watchlists/constants";
import { validateWatchlistForm } from "@/features/watchlists/validation";
import type { TargetType, Watchlist, WatchlistInput, WatchlistKind } from "@/features/watchlists/types";

import { TargetTypeCards } from "./TargetTypeCards";
import { ThresholdSlider } from "./ThresholdSlider";

// ── WatchlistForm ─────────────────────────────────────────────────────────────

const selectClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

export interface WatchlistFormProps {
  initial?: Watchlist;
  busy: boolean;
  onClose: () => void;
  onSave: (body: WatchlistInput) => Promise<void>;
}

export function WatchlistForm({ initial, busy, onClose, onSave }: WatchlistFormProps) {
  const id = useId();
  const [name, setName] = useState(initial?.name ?? "");
  const [targetType, setTargetType] = useState<TargetType>(initial?.target_type ?? "person");
  const [kind, setKind] = useState<WatchlistKind>(initial?.kind ?? "watchlist");
  const [face, setFace] = useState(String(initial?.face_match_threshold_ratio ?? DEFAULT_FACE_MATCH_THRESHOLD));
  const [appearance, setAppearance] = useState(
    String(initial?.appearance_match_threshold_ratio ?? DEFAULT_APPEARANCE_MATCH_THRESHOLD)
  );
  const [metadata, setMetadata] = useState(JSON.stringify(initial?.metadata ?? {}, null, 2));
  const [error, setError] = useState<unknown>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setError(null);
    try {
      const payload = validateWatchlistForm({
        name,
        targetType,
        kind,
        face,
        appearance,
        metadata,
      });
      await onSave(payload);
    } catch (issue) {
      setError(issue);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit watchlist" : "Create watchlist"}</DialogTitle>
          <DialogDescription>
            Configure targets and matching thresholds. Target type cannot be changed after creation.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <fieldset disabled={busy} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor={`${id}-name`} className="text-sm font-medium">Name</label>
              <Input id={`${id}-name`} required value={name} onChange={(event) => setName(event.target.value)} />
            </div>

            {/* Target type — visual cards (locked after creation) */}
            <TargetTypeCards
              id={id}
              value={targetType}
              onChange={setTargetType}
              disabled={Boolean(initial)}
            />

            {/* Watchlist kind */}
            <div className="space-y-2">
              <label htmlFor={`${id}-kind`} className="text-sm font-medium">Kind</label>
              <select
                id={`${id}-kind`}
                className={selectClass}
                value={kind}
                onChange={(event) => setKind(event.target.value as WatchlistKind)}
              >
                <option value="watchlist">Watchlist</option>
                <option value="blacklist">Blacklist</option>
              </select>
            </div>

            {targetType !== "person" && (
              <p className="text-sm text-amber-400">
                Specter identifies individual people only. Vehicles and objects use detection rules, not reference-image matching.
              </p>
            )}

            {/* Sensitivity section */}
            <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
              <WatchlistSensitivityPresets
                disabled={busy}
                onSelect={(preset) => {
                  setFace(preset.faceVal);
                  setAppearance(preset.appVal);
                }}
              />
              <div className="grid gap-5 pt-1 sm:grid-cols-2">
                <ThresholdSlider
                  id={`${id}-face`}
                  label="Face threshold"
                  value={face}
                  onChange={setFace}
                  disabled={busy}
                />
                <ThresholdSlider
                  id={`${id}-appearance`}
                  label="Appearance threshold"
                  value={appearance}
                  onChange={setAppearance}
                  disabled={busy}
                />
              </div>
            </div>

            <MetadataField
              id={`${id}-metadata`}
              disabled={busy}
              value={metadata}
              onChange={setMetadata}
            />
          </fieldset>
          {error != null && <WatchlistError error={error} />}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save watchlist"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
