import { useState } from "react";
import { ListChecks, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useWatchlists, useWatchlistMutations } from "@/features/watchlists/hooks/use-watchlists";
import { ConfirmWatchlistDelete, WatchlistError } from "@/features/watchlists/components/WatchlistFeedback";
import { WatchlistForm } from "@/features/watchlists/components/WatchlistForms";
import { formatRatioAsPercent } from "@/features/watchlists/constants";
import type { Watchlist } from "@/features/watchlists/types";
import { TargetsPanel } from "./TargetsPanel";

export function WatchlistsWorkspace() {
  const watchlists = useWatchlists();
  const mutations = useWatchlistMutations();
  const [selectedId, setSelectedId] = useState<string>();
  const [editor, setEditor] = useState<{ watchlist?: Watchlist } | null>(null);
  const [deleting, setDeleting] = useState<Watchlist>();
  
  const selected = watchlists.data?.find((entry) => entry.id === selectedId) ?? watchlists.data?.[0];
  const isSaving = mutations.createWatchlist.isPending || mutations.updateWatchlist.isPending;
  
  const remove = async () => {
    if (!deleting || mutations.deleteWatchlist.isPending) return;
    try { 
      await mutations.deleteWatchlist.mutateAsync(deleting.id); 
      setDeleting(undefined); 
    } catch { /* Keep the confirmation open to display the request error. */ }
  };
  
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Watchlists</h1>
          <p className="mt-2 text-muted-foreground">Manage recognition targets, reference photos and enrollment.</p>
        </div>
        <Button onClick={() => setEditor({})}>
          <Plus />Create watchlist
        </Button>
      </div>
      
      {watchlists.isError && <WatchlistError error={watchlists.error} retry={() => { void watchlists.refetch(); }} />}
      {watchlists.isPending && (
        <div role="status" aria-label="Loading watchlists">
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      )}
      
      {watchlists.data?.length === 0 && (
        <EmptyState
          icon={ListChecks}
          title="No watchlists yet."
          description="Create one to organize your targets."
          action={<Button onClick={() => setEditor({})}><Plus />Create your first watchlist</Button>}
        />
      )}
      
      {Boolean(watchlists.data?.length) && (
        <div className="grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-3" aria-label="Watchlists">
            {watchlists.data?.map((watchlist) => (
              <Card key={watchlist.id} className={`rounded-2xl border bg-white/5 ${selected?.id === watchlist.id ? "border-primary/50" : "border-white/10"}`}>
                <CardContent className="p-4">
                  <button type="button" onClick={() => setSelectedId(watchlist.id)} aria-pressed={selected?.id === watchlist.id} className="w-full rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <span className="block break-words font-medium">{watchlist.name}</span>
                    <span className="mt-1 block text-xs capitalize text-muted-foreground">{watchlist.kind} · {watchlist.target_type}</span>
                  </button>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Face: {formatRatioAsPercent(watchlist.face_match_threshold_ratio)} · Appearance: {formatRatioAsPercent(watchlist.appearance_match_threshold_ratio)}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setEditor({ watchlist })} aria-label={`Edit watchlist ${watchlist.name}`}>
                      <Pencil />Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="text-rose-400" onClick={() => { mutations.deleteWatchlist.reset(); setDeleting(watchlist); }} aria-label={`Delete watchlist ${watchlist.name}`}>
                      <Trash2 />Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </aside>
          {selected && <TargetsPanel key={selected.id} watchlist={selected} />}
        </div>
      )}
      
      {editor && (
        <WatchlistForm 
          key={editor.watchlist?.id ?? "new"} 
          initial={editor.watchlist} 
          busy={isSaving} 
          onClose={() => setEditor(null)} 
          onSave={async (body) => {
            if (editor.watchlist) {
              const { name, kind, metadata, face_match_threshold_ratio, appearance_match_threshold_ratio } = body;
              await mutations.updateWatchlist.mutateAsync({ id: editor.watchlist.id, body: { name, kind, metadata, face_match_threshold_ratio, appearance_match_threshold_ratio } });
            } else {
              const created = await mutations.createWatchlist.mutateAsync(body);
              setSelectedId(created.id);
            }
            setEditor(null);
          }} 
        />
      )}
      
      {deleting && (
        <ConfirmWatchlistDelete 
          title={`Delete ${deleting.name}?`} 
          description="This permanently removes the watchlist, all its targets, reference photos and embeddings. Existing alerts are retained."
          busy={mutations.deleteWatchlist.isPending} 
          error={mutations.deleteWatchlist.error} 
          onCancel={() => setDeleting(undefined)} 
          onConfirm={() => { void remove(); }} 
        />
      )}
    </div>
  );
}
