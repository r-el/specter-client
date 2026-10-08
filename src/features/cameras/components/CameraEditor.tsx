import { useState, type FormEvent } from "react";
import { useCameraDetails, useCameraMutations } from "@/features/cameras/hooks/use-cameras";
import { CameraWatchlistSelector } from "./CameraWatchlistSelector";
import { cameraError, type CameraDetails, type CameraInput, type CameraUpdate } from "@/features/cameras/api/cameras";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QuickCategories } from "./QuickCategories";
import {
  MAX_CAMERA_NAME_LENGTH,
  MAX_CREDENTIAL_PASSWORD_LENGTH,
  MAX_CREDENTIAL_USERNAME_LENGTH,
  MAX_LOCATION_LENGTH,
  MAX_SOURCE_URL_LENGTH,
} from "@/features/cameras/constants";
import { cameraFormSchema } from "@/features/cameras/schemas";

export function CameraEditor({ cameraId, onClose }: { cameraId?: string; onClose: () => void }) {
  const details = useCameraDetails(cameraId);
  const [isSaving, setIsSaving] = useState(false);
  return (
    <Dialog open onOpenChange={(open) => { if (!open && !isSaving) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{cameraId ? "Edit camera" : "Add camera"}</DialogTitle>
          <DialogDescription>Configure the source and watchlists used by this camera.</DialogDescription>
        </DialogHeader>
        {cameraId && details.isPending ? <p role="status">Loading camera configuration…</p>
          : cameraId && details.isError ? (
            <div role="alert" className="space-y-3">
              <p>{cameraError(details.error)}</p>
              <Button variant="outline" onClick={() => void details.refetch()}>Retry</Button>
            </div>
          ) : <CameraForm camera={details.data} onClose={onClose} onSaving={setIsSaving} />}
      </DialogContent>
    </Dialog>
  );
}

function CameraForm({ camera, onClose, onSaving }: {
  camera?: CameraDetails;
  onClose: () => void;
  onSaving: (saving: boolean) => void;
}) {
  const [name, setName] = useState(camera?.name ?? "");
  const [sourceUrl, setSourceUrl] = useState(camera?.source_url ?? "");
  const [location, setLocation] = useState(camera?.location ?? "");
  const [watchlistIds, setWatchlistIds] = useState(camera?.watchlist_ids ?? []);
  const [classes, setClasses] = useState(camera?.detection_classes.join(", ") ?? "");
  const [credentialMode, setCredentialMode] = useState<"keep" | "replace" | "clear">("keep");
  const [username, setUsername] = useState(camera?.username ?? "");
  const [password, setPassword] = useState("");
  const [validationError, setValidationError] = useState("");
  const { create, update } = useCameraMutations();
  const isPending = create.isPending || update.isPending;
  const mutationError = create.error || update.error;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (isPending) return;
    setValidationError("");
    const detectionClasses = [...new Set(classes.split(",").map((value) => value.trim()).filter(Boolean))];

    const validation = cameraFormSchema.safeParse({
      name,
      source_url: sourceUrl,
      location,
      watchlist_ids: watchlistIds,
      detection_classes: detectionClasses,
      credentials: credentialMode === "replace" ? { username, password } : undefined,
    });

    if (!validation.success) {
      return setValidationError(validation.error.issues[0]?.message ?? "Invalid camera data.");
    }

    const body: CameraInput = {
      name: validation.data.name,
      source_url: validation.data.source_url,
      location: validation.data.location,
      watchlist_ids: validation.data.watchlist_ids,
      detection_classes: validation.data.detection_classes,
    };
    if (credentialMode === "replace" && validation.data.credentials) {
      body.credentials = validation.data.credentials;
    }
    onSaving(true);
    try {
      if (camera) {
        const changes: CameraUpdate = { ...body };
        if (credentialMode === "clear") changes.credentials = null;
        await update.mutateAsync({ id: camera.id, body: changes });
      } else {
        await create.mutateAsync(body);
      }
      onClose();
    } catch {
      // Keep the form and entered values open; the mutation exposes the server error.
    } finally {
      onSaving(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-4">
      <fieldset disabled={isPending} className="space-y-4">
        <label className="block space-y-1 text-sm">Name
          <Input required maxLength={MAX_CAMERA_NAME_LENGTH} value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <div className="space-y-1 text-sm">
          <label className="font-medium">Source URL</label>
          <div className="flex gap-1.5 pb-1" aria-label="Quick protocol prefixes">
            {(["rtsp://", "rtsps://", "http://"] as const).map((proto) => (
              <button
                key={proto}
                type="button"
                className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors"
                onClick={() => {
                  if (!sourceUrl.startsWith(proto)) {
                    // Strip any other protocol prefix before inserting
                    const bare = sourceUrl.replace(/^[a-z]+:\/\//i, "");
                    setSourceUrl(proto + bare);
                  }
                }}
              >
                {proto}
              </button>
            ))}
          </div>
          <Input required maxLength={MAX_SOURCE_URL_LENGTH} placeholder="rtsp://camera-host:554/stream" autoComplete="off" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} />
        </div>
        <label className="block space-y-1 text-sm">Location
          <Input maxLength={MAX_LOCATION_LENGTH} value={location} onChange={(event) => setLocation(event.target.value)} />
        </label>
        <label className="block space-y-1 text-sm">Credentials
          <select className="w-full rounded-md border bg-background p-2" value={credentialMode}
            onChange={(event) => setCredentialMode(event.target.value as typeof credentialMode)}>
            <option value="keep">{camera ? "Keep existing credentials" : "No credentials"}</option>
            <option value="replace">{camera ? "Replace credentials" : "Set credentials"}</option>
            {camera && <option value="clear">Remove stored credentials</option>}
          </select>
        </label>
        {camera && <p className="text-xs text-muted-foreground">{camera.has_password ? "A password is stored; it is never returned by the server." : "No password is stored."}</p>}
        {credentialMode === "replace" && <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">Username
            <Input required maxLength={MAX_CREDENTIAL_USERNAME_LENGTH} autoComplete="off" value={username} onChange={(event) => setUsername(event.target.value)} />
          </label>
          <label className="space-y-1 text-sm">Password
            <Input required type="password" maxLength={MAX_CREDENTIAL_PASSWORD_LENGTH} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
        </div>}
        <CameraWatchlistSelector watchlistIds={watchlistIds} onChange={setWatchlistIds} disabled={isPending} />
        <div className="space-y-2">
          <QuickCategories classes={classes} onChange={setClasses} disabled={isPending} />
          <label className="block space-y-1 text-sm">Detection classes (comma-separated)
            <Input placeholder="person, car" value={classes} onChange={(event) => setClasses(event.target.value)} />
            <span className="text-xs text-muted-foreground">Select categories above or enter specific classes. Leave empty to detect all objects.</span>
          </label>
        </div>
      </fieldset>
      {Boolean(validationError || mutationError) && <p role="alert" className="text-sm text-rose-400">{validationError || cameraError(mutationError)}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" disabled={isPending} onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={isPending}>{isPending ? "Saving…" : camera ? "Save changes" : "Create camera"}</Button>
      </div>
    </form>
  );
}