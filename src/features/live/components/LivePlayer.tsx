import { useState } from "react";
import { ImageIcon, RefreshCw } from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { useLiveVideo } from "./use-live-video";
import { useLiveSnapshots } from "./use-live-snapshots";

export function LivePlayer({ cameraId, cameraName }: { cameraId: string; cameraName: string }) {
  const [snapshotSelected, setSnapshotSelected] = useState(false);
  const live = useLiveVideo(cameraId, !snapshotSelected);
  const isSnapshot = snapshotSelected || live.state.phase === "failed";
  const snapshot = useLiveSnapshots(cameraId, isSnapshot);
  const liveStatus = {
    connecting: "Connecting to live video",
    buffering: "Buffering live video",
    playing: "Live video",
    paused: "Video paused",
    retrying: "Reconnecting to live video",
    failed: "Live video unavailable",
  }[live.state.phase];
  const isPlaying = live.state.phase === "playing" && !isSnapshot;

  function retryVideo() {
    setSnapshotSelected(false);
    live.retry();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Badge
          variant="outline"
          className={
            isSnapshot
              ? "gap-1.5 border-amber-400/30 bg-amber-400/10 text-amber-400"
              : isPlaying
              ? "gap-1.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "gap-1.5 border-amber-400/30 bg-amber-400/10 text-amber-400"
          }
        >
          {isSnapshot ? (
            <ImageIcon className="h-3 w-3" />
          ) : isPlaying ? (
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
          ) : <span className="inline-flex h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />}
          {isSnapshot ? "JPEG snapshots — not live video" : liveStatus}
        </Badge>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={retryVideo}>
            <RefreshCw className="h-4 w-4" /> {isSnapshot ? "Try live video" : "Reconnect"}
          </Button>
          {isSnapshot ? (
            <Button variant="outline" size="sm" onClick={snapshot.retry}>Retry snapshots</Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setSnapshotSelected(true)}>Use snapshots</Button>
          )}
        </div>
      </div>

      <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-black">
        {/* Keep the ref mounted while switching modes so effect setup always sees the video. */}
        <video
          ref={live.videoRef}
          className={`h-full w-full object-contain ${isSnapshot ? "hidden" : ""}`}
          autoPlay muted playsInline controls preload="auto"
          aria-label={`Live video from ${cameraName}`}
        />
        {isSnapshot && (snapshot.state.url ? (
          <img src={snapshot.state.url} alt={`Latest JPEG snapshot from ${cameraName}`} className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-300">
            {snapshot.state.phase === "error" ? "Snapshot unavailable" : "Fetching the latest snapshot…"}
          </div>
        ))}
        {!isSnapshot && ["connecting", "retrying"].includes(live.state.phase) && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-slate-300">
            {live.state.message}
          </div>
        )}
      </div>

      <div role="status" aria-live="polite" className="space-y-2 text-sm text-muted-foreground">
        {!snapshotSelected && (live.state.phase === "failed" || !isSnapshot) && <p>{live.state.message}</p>}
        {isSnapshot && (
          <>
            <p className={snapshot.state.phase === "error" ? "text-amber-400" : ""}>{snapshot.state.message}</p>
            <p>Snapshots refresh approximately every 2 seconds without audio.</p>
            {snapshot.state.receivedAt && (
              <p>
                {snapshot.state.phase === "error" ? "Stale image — last received" : "Last received"}: {new Date(snapshot.state.receivedAt).toLocaleTimeString()}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}