import { useState } from "react";
import { Eye, Pencil, Plus, RefreshCw, Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useWatchlistMutations, useWatchlistTargets } from "@/features/watchlists/hooks/use-watchlists";
import { ConfirmWatchlistDelete, EnrollmentBadge, WatchlistError } from "@/features/watchlists/components/WatchlistFeedback";
import { TargetForm } from "@/features/watchlists/components/WatchlistForms";
import { EnrollmentBatchProgress, TargetDetails } from "@/features/watchlists/components/TargetDetails";
import { hasPendingEnrollment } from "@/features/watchlists/utils";
import type { Target, Watchlist } from "@/features/watchlists/types";

export function TargetsPanel({ watchlist }: { watchlist: Watchlist }) {
  const targets = useWatchlistTargets(watchlist.id);
  const mutations = useWatchlistMutations();
  const [editor, setEditor] = useState<{ target?: Target } | null>(null);
  const [deleting, setDeleting] = useState<Target>();
  const [selectedId, setSelectedId] = useState<string>();
  const [lastBatchId, setLastBatchId] = useState<string | null>(null);
  
  const selected = targets.data?.find((target) => target.id === selectedId);
  const isSaving = mutations.createTargets.isPending || mutations.updateTarget.isPending;
  
  const remove = async () => {
    if (!deleting || mutations.deleteTarget.isPending) return;
    try {
      await mutations.deleteTarget.mutateAsync({ watchlistId: watchlist.id, targetId: deleting.id });
      // A batch containing only the deleted target no longer exists on the server.
      setLastBatchId(null);
      setDeleting(undefined);
    } catch { /* Keep the confirmation open to display the request error. */ }
  };
  
  return (
    <section className="min-w-0 space-y-5" aria-label={`Targets in ${watchlist.name}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="break-words text-xl font-semibold">{watchlist.name}</h2>
          <p className="text-sm text-muted-foreground">{targets.data?.length ?? 0} targets · {watchlist.target_type}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={targets.isFetching} onClick={() => { void targets.refetch(); }} aria-label="Refresh targets">
            <RefreshCw />
          </Button>
          <Button size="sm" onClick={() => setEditor({})}>
            <Plus />Add target
          </Button>
        </div>
      </div>
      
      {watchlist.target_type !== "person" && (
        <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-400">
          Individual recognition is supported only for people. Vehicles and objects are detected with camera rules.
        </p>
      )}
      
      {lastBatchId && <EnrollmentBatchProgress batchId={lastBatchId} />}
      {targets.isError && <WatchlistError error={targets.error} retry={() => { void targets.refetch(); }} />}
      {targets.isPending && (
        <div role="status" aria-label="Loading targets" className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      )}
      
      {targets.data?.some(hasPendingEnrollment) && (
        <p role="status" className="text-xs text-muted-foreground">Enrollment in progress — updating automatically.</p>
      )}
      
      {targets.data?.length === 0 && (
        <EmptyState
          icon={Users}
          title="No targets yet."
          description="Add a target and reference photos to get started."
        />
      )}
      
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {targets.data?.map((target) => (
          <Card key={target.id} className="min-w-0 rounded-2xl border-white/10 bg-white/5 backdrop-blur-xl">
            <CardContent className="space-y-4 p-5">
              <div className="space-y-2">
                <h3 className="break-words font-medium">{target.label}</h3>
                <div className="flex flex-wrap gap-2">
                  <EnrollmentBadge target={target} />
                  {!target.is_enabled && <Badge variant="outline">Disabled</Badge>}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{target.reference_images.length} reference photos</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedId(target.id)}>
                  <Eye />Photos & status
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setEditor({ target })} aria-label={`Edit target ${target.label}`}>
                  <Pencil />
                </Button>
                <Button variant="ghost" size="icon" className="text-rose-400" onClick={() => { mutations.deleteTarget.reset(); setDeleting(target); }} aria-label={`Delete target ${target.label}`}>
                  <Trash2 />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {editor && (
        <TargetForm 
          key={editor.target?.id ?? "new"} 
          initial={editor.target} 
          targetType={watchlist.target_type} 
          busy={isSaving} 
          onClose={() => setEditor(null)}
          onSave={async (body, specification, files) => {
            if (editor.target) {
              await mutations.updateTarget.mutateAsync({ watchlistId: watchlist.id, targetId: editor.target.id, body });
            } else {
              const created = await mutations.createTargets.mutateAsync({ watchlistId: watchlist.id, targets: [specification], files });
              setLastBatchId(created.enrollment_batch_id);
            }
            setEditor(null);
          }} 
        />
      )}
      
      {deleting && (
        <ConfirmWatchlistDelete 
          title={`Delete ${deleting.label}?`} 
          description="This permanently removes the target, all reference photos and embeddings. Existing alerts are retained."
          busy={mutations.deleteTarget.isPending} 
          error={mutations.deleteTarget.error} 
          onCancel={() => setDeleting(undefined)} 
          onConfirm={() => { void remove(); }} 
        />
      )}
      
      {selected && <TargetDetails key={selected.id} target={selected} onClose={() => setSelectedId(undefined)} />}
    </section>
  );
}
