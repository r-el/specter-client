import { useCallback, useMemo, useState } from "react";
import { Plus, RefreshCw, Video } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCameras } from "@/features/cameras/hooks/use-cameras";
import type { CameraStatus } from "@/features/cameras/api/cameras";
import { CameraCard } from "@/features/cameras/components/CameraCard";
import { CameraEditor } from "@/features/cameras/components/CameraEditor";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { cameraError } from "@/features/cameras/api/cameras";

type StatusFilter = "all" | CameraStatus | "unknown";
const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "running", label: "Running" },
  { value: "starting", label: "Starting" },
  { value: "reconnecting", label: "Reconnecting" },
  { value: "stopped", label: "Stopped" },
  { value: "failed", label: "Failed" },
  { value: "unknown", label: "Unknown" },
];

export default function CamerasPage() {
  const { user } = useAuth();
  const cameras = useCameras();
  const [editor, setEditor] = useState<{ id?: string } | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const canCreate = user?.role === "admin" || user?.role === "operator";
  const filteredCameras = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    return (cameras.data ?? []).filter((camera) => {
      const matchesSearch = !normalizedSearch
        || camera.name.toLocaleLowerCase().includes(normalizedSearch)
        || (camera.location ?? "").toLocaleLowerCase().includes(normalizedSearch);
      const matchesStatus = statusFilter === "all"
        || (camera.live_status ?? "unknown") === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [cameras.data, search, statusFilter]);

  const handleEdit = useCallback((id: string) => {
    setEditor({ id });
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Camera Network</h1>
          <p className="text-muted-foreground">Monitor reported camera status and open live video.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={cameras.isFetching} onClick={() => void cameras.refetch()}>
            <RefreshCw className={`mr-2 h-4 w-4 ${cameras.isFetching ? "animate-spin" : ""}`} />
            {cameras.isFetching ? "Refreshing…" : "Refresh"}
          </Button>
          {canCreate && <Button onClick={() => setEditor({})}><Plus className="mr-2 h-4 w-4" />Add camera</Button>}
        </div>
      </div>
      {cameras.isError && <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-400">
        {cameraError(cameras.error)} Use Refresh to retry. {cameras.data?.length ? "Showing the last loaded cameras; statuses may be stale." : ""}
      </div>}
      {(cameras.data?.length ?? 0) > 0 && <div className="grid gap-3 rounded-xl border border-white/10 bg-white/5 p-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <label className="space-y-1 text-sm font-medium">
          <span>Search cameras</span>
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name or location" type="search" />
        </label>
        <label className="space-y-1 text-sm font-medium">
          <span>Filter by status</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {statusOptions.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <p role="status" className="text-xs text-muted-foreground sm:col-span-2">
          Showing {filteredCameras.length} of {cameras.data?.length ?? 0} cameras.
        </p>
      </div>}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {cameras.isLoading ? Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-64 w-full rounded-2xl bg-white/5" />
        )) : cameras.data?.length === 0 ? (
          <EmptyState
            className="col-span-full"
            icon={Video}
            title="No cameras are available."
            description={canCreate ? "Add a camera to start monitoring." : "Ask an administrator to assign cameras to your account."}
          />
        ) : filteredCameras.length === 0 ? (
          <EmptyState
            className="col-span-full"
            icon={Video}
            title="No cameras match these filters."
            description="Try a different name, location or status."
            action={<Button variant="outline" onClick={() => { setSearch(""); setStatusFilter("all"); }}>Clear filters</Button>}
          />
        ) : filteredCameras.map((camera) => (
          <CameraCard key={camera.id} camera={camera} role={user?.role} onEdit={handleEdit} />
        ))}
      </div>
      {editor && canCreate && <CameraEditor cameraId={editor.id} onClose={() => setEditor(null)} />}
    </div>
  );
}
