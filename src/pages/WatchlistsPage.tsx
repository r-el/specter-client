import { useState } from "react";
import { Eye, ListChecks, Pencil, Plus, RefreshCw, Trash2, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useWatchlists, useWatchlistMutations, useWatchlistTargets } from "@/features/watchlists/hooks/use-watchlists";
import { ConfirmWatchlistDelete, EnrollmentBadge, WatchlistError } from "@/features/watchlists/components/WatchlistFeedback";
import { TargetForm, WatchlistForm } from "@/features/watchlists/components/WatchlistForms";
import { EnrollmentBatchProgress, TargetDetails } from "@/features/watchlists/components/TargetDetails";
import { formatRatioAsPercent } from "@/features/watchlists/constants";
import { hasPendingEnrollment } from "@/features/watchlists/utils";
import type { Target, Watchlist } from "@/features/watchlists/types";

function TargetsPanel({ watchlist }: { watchlist: Watchlist }) {
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
  return <section className="min-w-0 space-y-5" aria-label={`Targets in ${watchlist.name}`}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0"><h2 className="break-words text-xl font-semibold">{watchlist.name}</h2><p className="text-sm text-muted-foreground">{targets.data?.length ?? 0} targets · {watchlist.target_type}</p></div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={targets.isFetching} onClick={() => { void targets.refetch(); }} aria-label="Refresh targets"><RefreshCw /></Button>
        <Button size="sm" onClick={() => setEditor({})}><Plus />Add target</Button>
      </div>
    </div>
    {watchlist.target_type !== "person" && <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-400">Individual recognition is supported only for people. Vehicles and objects are detected with camera rules.</p>}
    {lastBatchId && <EnrollmentBatchProgress batchId={lastBatchId} />}
    {targets.isError && <WatchlistError error={targets.error} retry={() => { void targets.refetch(); }} />}
    {targets.isPending && <div role="status" aria-label="Loading targets" className="grid gap-4 sm:grid-cols-2"><Skeleton className="h-48 rounded-2xl" /><Skeleton className="h-48 rounded-2xl" /></div>}
    {targets.data?.some(hasPendingEnrollment) && <p role="status" className="text-xs text-muted-foreground">Enrollment in progress — updating automatically.</p>}
    {targets.data?.length === 0 && (
      <EmptyState
        icon={Users}
        title="No targets yet."
        description="Add a target and reference photos to get started."
      />
    )}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {targets.data?.map((target) => <Card key={target.id} className="min-w-0 rounded-2xl border-white/10 bg-white/5 backdrop-blur-xl">
        <CardContent className="space-y-4 p-5">
          <div className="space-y-2"><h3 className="break-words font-medium">{target.label}</h3><div className="flex flex-wrap gap-2"><EnrollmentBadge target={target} />{!target.is_enabled && <Badge variant="outline">Disabled</Badge>}</div></div>
          <p className="text-sm text-muted-foreground">{target.reference_images.length} reference photos</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedId(target.id)}><Eye />Photos & status</Button>
            <Button variant="ghost" size="icon" onClick={() => setEditor({ target })} aria-label={`Edit target ${target.label}`}><Pencil /></Button>
            <Button variant="ghost" size="icon" className="text-rose-400" onClick={() => { mutations.deleteTarget.reset(); setDeleting(target); }} aria-label={`Delete target ${target.label}`}><Trash2 /></Button>
          </div>
        </CardContent>
      </Card>)}
    </div>
    {editor && <TargetForm key={editor.target?.id ?? "new"} initial={editor.target} targetType={watchlist.target_type} busy={isSaving} onClose={() => setEditor(null)}
      onSave={async (body, specification, files) => {
        if (editor.target) await mutations.updateTarget.mutateAsync({ watchlistId: watchlist.id, targetId: editor.target.id, body });
        else {
          const created = await mutations.createTargets.mutateAsync({ watchlistId: watchlist.id, targets: [specification], files });
          setLastBatchId(created.enrollment_batch_id);
        }
        setEditor(null);
      }} />}
    {deleting && <ConfirmWatchlistDelete title={`Delete ${deleting.label}?`} description="This permanently removes the target, all reference photos and embeddings. Existing alerts are retained."
      busy={mutations.deleteTarget.isPending} error={mutations.deleteTarget.error} onCancel={() => setDeleting(undefined)} onConfirm={() => { void remove(); }} />}
    {selected && <TargetDetails key={selected.id} target={selected} onClose={() => setSelectedId(undefined)} />}
  </section>;
}

function WatchlistsWorkspace() {
  const watchlists = useWatchlists();
  const mutations = useWatchlistMutations();
  const [selectedId, setSelectedId] = useState<string>();
  const [editor, setEditor] = useState<{ watchlist?: Watchlist } | null>(null);
  const [deleting, setDeleting] = useState<Watchlist>();
  const selected = watchlists.data?.find((entry) => entry.id === selectedId) ?? watchlists.data?.[0];
  const isSaving = mutations.createWatchlist.isPending || mutations.updateWatchlist.isPending;
  const remove = async () => {
    if (!deleting || mutations.deleteWatchlist.isPending) return;
    try { await mutations.deleteWatchlist.mutateAsync(deleting.id); setDeleting(undefined); }
    catch { /* Keep the confirmation open to display the request error. */ }
  };
  return <div className="space-y-6 animate-in fade-in duration-500">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-3xl font-semibold tracking-tight">Watchlists</h1><p className="mt-2 text-muted-foreground">Manage recognition targets, reference photos and enrollment.</p></div>
      <Button onClick={() => setEditor({})}><Plus />Create watchlist</Button>
    </div>
    {watchlists.isError && <WatchlistError error={watchlists.error} retry={() => { void watchlists.refetch(); }} />}
    {watchlists.isPending && <div role="status" aria-label="Loading watchlists"><Skeleton className="h-64 rounded-2xl" /></div>}
    {watchlists.data?.length === 0 && (
      <EmptyState
        icon={ListChecks}
        title="No watchlists yet."
        description="Create one to organize your targets."
        action={<Button onClick={() => setEditor({})}><Plus />Create your first watchlist</Button>}
      />
    )}
    {Boolean(watchlists.data?.length) && <div className="grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="space-y-3" aria-label="Watchlists">
        {watchlists.data?.map((watchlist) => <Card key={watchlist.id} className={`rounded-2xl border bg-white/5 ${selected?.id === watchlist.id ? "border-primary/50" : "border-white/10"}`}>
          <CardContent className="p-4">
            <button type="button" onClick={() => setSelectedId(watchlist.id)} aria-pressed={selected?.id === watchlist.id} className="w-full rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <span className="block break-words font-medium">{watchlist.name}</span><span className="mt-1 block text-xs capitalize text-muted-foreground">{watchlist.kind} · {watchlist.target_type}</span>
            </button>
            <p className="mt-3 text-xs text-muted-foreground">
              Face: {formatRatioAsPercent(watchlist.face_match_threshold_ratio)} · Appearance: {formatRatioAsPercent(watchlist.appearance_match_threshold_ratio)}
            </p>
            <div className="mt-3 flex gap-2"><Button variant="ghost" size="sm" onClick={() => setEditor({ watchlist })} aria-label={`Edit watchlist ${watchlist.name}`}><Pencil />Edit</Button><Button variant="ghost" size="sm" className="text-rose-400" onClick={() => { mutations.deleteWatchlist.reset(); setDeleting(watchlist); }} aria-label={`Delete watchlist ${watchlist.name}`}><Trash2 />Delete</Button></div>
          </CardContent>
        </Card>)}
      </aside>
      {selected && <TargetsPanel key={selected.id} watchlist={selected} />}
    </div>}
    {editor && <WatchlistForm key={editor.watchlist?.id ?? "new"} initial={editor.watchlist} busy={isSaving} onClose={() => setEditor(null)} onSave={async (body) => {
      if (editor.watchlist) {
        const { name, kind, metadata, face_match_threshold_ratio, appearance_match_threshold_ratio } = body;
        await mutations.updateWatchlist.mutateAsync({ id: editor.watchlist.id, body: { name, kind, metadata, face_match_threshold_ratio, appearance_match_threshold_ratio } });
      } else {
        const created = await mutations.createWatchlist.mutateAsync(body);
        setSelectedId(created.id);
      }
      setEditor(null);
    }} />}
    {deleting && <ConfirmWatchlistDelete title={`Delete ${deleting.name}?`} description="This permanently removes the watchlist, all its targets, reference photos and embeddings. Existing alerts are retained."
      busy={mutations.deleteWatchlist.isPending} error={mutations.deleteWatchlist.error} onCancel={() => setDeleting(undefined)} onConfirm={() => { void remove(); }} />}
  </div>;
}

export default function WatchlistsPage() {
  const { user, loading, isAuthenticated } = useAuth();
  if (loading) return <div role="status" aria-label="Loading authentication"><Skeleton className="h-64 rounded-2xl" /></div>;
  // Mount no queries, mutations or protected image requests for unauthorized users.
  if (!isAuthenticated || !user || !["admin", "operator"].includes(user.role)) {
    return <div role="alert" className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-6 text-sm text-amber-400">Only administrators and operators can manage watchlists.</div>;
  }
  return <WatchlistsWorkspace key={user.id} />;
}