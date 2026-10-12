import { ArrowLeft, ShieldCheck, Video } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { CopyButton } from "../../components/ui/copy-button";
import { Skeleton } from "../../components/ui/skeleton";
import { LivePlayer } from "./components/LivePlayer";
import { useLiveCamera } from "./components/use-live-camera";

function CameraLiveView({ cameraId }: { cameraId: string }) {
  const { camera, error, retry } = useLiveCamera(cameraId);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight">
            <Video className="h-7 w-7 text-primary" /> Live camera
          </h1>
          <p className="mt-2 text-muted-foreground">Secure viewing through the application server.</p>
        </div>
        <Button asChild variant="outline">
          <Link to="/cameras"><ArrowLeft className="h-4 w-4" /> Back to cameras</Link>
        </Button>
      </div>

      {error ? (
        <div role="alert" className="space-y-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-400">
          <p>{error}</p>
          <Button variant="outline" onClick={retry}>Retry camera</Button>
        </div>
      ) : !camera ? (
        <Skeleton aria-label="Loading camera" className="aspect-video w-full rounded-2xl bg-white/5" />
      ) : (
        <Card className="rounded-2xl border-white/10 bg-white/5 backdrop-blur-xl">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>{camera.name}</CardTitle>
              <div className="flex items-center gap-1 font-mono text-xs text-muted-foreground/70">
                <span className="select-all" title={camera.id}>ID: {camera.id.slice(0, 8)}…</span>
                <CopyButton value={camera.id} label="Camera ID" className="h-4 w-4 p-0.5" />
              </div>
            </div>
          </CardHeader>
          <CardContent><LivePlayer key={camera.id} cameraId={camera.id} cameraName={camera.name} preferWebrtc={true} /></CardContent>
        </Card>
      )}

      <div className="flex items-start gap-2 text-sm text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p>The camera must already be running. Viewing does not start or stop detection. Video starts muted; use the player controls for audio.</p>
      </div>
    </div>
  );
}

/** Ready for a protected /cameras/:id/live route; route registration is intentionally separate. */
export default function LiveVideoPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return <div role="alert" className="p-4 text-destructive">No camera ID was provided.</div>;
  // Remount ownership on navigation: an old camera request/player can never populate a new route.
  return <CameraLiveView key={id} cameraId={id} />;
}