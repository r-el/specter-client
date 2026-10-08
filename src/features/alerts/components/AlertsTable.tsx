import { useEffect, useMemo, useState } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { Link } from "react-router-dom";
import { useInView } from "react-intersection-observer";
import { AlertCircle, Loader2 } from "lucide-react";
import { AlertDetails } from "@/features/alerts/components/AlertDetails";
import { AlertFiltersForm } from "@/features/alerts/components/AlertFilters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAlerts } from "@/features/alerts/hooks/use-alerts";
import { formatDateTime } from "@/lib/date-utils";
import { alertErrorMessage } from "@/features/alerts/api/alerts";
import type { AlertFilters, SpecterAlert } from "@/features/alerts/api/alerts";

interface AlertsTableProps {
  limit?: number;
}

export function AlertsTable({ limit }: AlertsTableProps) {
  const [filters, setFilters] = useState<AlertFilters>({});
  const [selectedAlert, setSelectedAlert] = useState<SpecterAlert | null>(null);
  const isPreview = limit !== undefined;
  const pageSize = Math.max(1, Math.min(200, Math.floor(limit || 20)));
  const query = useAlerts({ ...filters, limit: pageSize });
  const { ref, inView } = useInView();
  const { fetchNextPage, hasNextPage, isFetching, isError } = query;

  useEffect(() => {
    // Stop auto-pagination after an error; only an explicit retry may restart it.
    if (!isPreview && inView && hasNextPage && !isFetching && !isError) {
      void fetchNextPage();
    }
  }, [isPreview, inView, hasNextPage, isFetching, isError, fetchNextPage]);

  const alerts = useMemo(() => {
    const seen = new Set<string>();
    const rows = (query.data?.pages.flatMap((page) => page.alerts) ?? []).filter((alert) => {
      if (seen.has(alert.id)) return false;
      seen.add(alert.id);
      return true;
    });
    return isPreview ? rows.slice(0, pageSize) : rows;
  }, [query.data, isPreview, pageSize]);

  const virtualizer = useWindowVirtualizer({
    count: query.isLoading ? 0 : alerts.length,
    estimateSize: () => 72,
    overscan: 5,
  });

  return (
    <div className={isPreview ? "w-full" : "mt-4 w-full"}>
      {!isPreview && <AlertFiltersForm onApply={setFilters} />}
      <div className="mb-3 flex items-center justify-between gap-3">
        <p role="status" className="text-sm text-muted-foreground">
          {query.isLoading
            ? "Loading alerts…"
            : query.isError && alerts.length === 0
            ? "Failed to load alerts"
            : alerts.length === 0
            ? isPreview ? "No recent alerts" : "No alerts found"
            : `${alerts.length} alerts loaded${isPreview ? " · newest first" : ""}`}
        </p>
        <Button variant="outline" size="sm" disabled={query.isFetching} onClick={() => { void query.refetch(); }}>Refresh</Button>
      </div>
      {query.isError && <div role="alert" className="mb-4 space-y-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm">
        <p>{alertErrorMessage(query.error)}</p>
        {alerts.length > 0 && <p className="text-muted-foreground">Already loaded alerts are still shown.</p>}
        <Button variant="outline" size="sm" disabled={query.isFetching} onClick={() => {
          if (query.isFetchNextPageError) void query.fetchNextPage();
          else void query.refetch();
        }}>{query.isFetchNextPageError ? "Retry loading more" : "Retry alerts"}</Button>
      </div>}
      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl" aria-busy={query.isFetching}>
        <Table>
          <TableHeader className="border-b border-white/10 bg-white/5">
            <TableRow className="border-none hover:bg-transparent">
              <TableHead>Kind</TableHead><TableHead>Identity / rule</TableHead><TableHead>Created</TableHead>
              <TableHead className="hidden md:table-cell">Camera</TableHead>
              <TableHead className="hidden lg:table-cell">Similarity / modality</TableHead>
              <TableHead>Review</TableHead><TableHead><span className="sr-only">Details</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading ? Array.from({ length: isPreview ? pageSize : 5 }, (_, index) => (
              <TableRow key={index} className="border-white/5"><TableCell colSpan={7}><Skeleton className="h-10 w-full bg-white/10" /></TableCell></TableRow>
            )) : alerts.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground">{query.isError ? "Alerts could not be loaded." : isPreview || !Object.values(filters).some(Boolean) ? "No alerts recorded yet." : "No alerts match the applied filters."}</TableCell></TableRow>
            ) : (
              <>
                {virtualizer.getVirtualItems()[0]?.index > 0 && (
                  <TableRow aria-hidden="true" style={{ height: virtualizer.getVirtualItems()[0].start }} className="border-none hover:bg-transparent" />
                )}
                {virtualizer.getVirtualItems().map((virtualItem) => {
                  const alert = alerts[virtualItem.index];
                  return (
                    <TableRow key={alert.id} onClick={() => setSelectedAlert(alert)} className="cursor-pointer border-white/5 hover:bg-white/10" ref={virtualizer.measureElement} data-index={virtualItem.index}>
                      <TableCell><Badge variant="outline" className="gap-1 border-primary/30 bg-primary/10 text-primary"><AlertCircle aria-hidden="true" className="h-3 w-3" />{alert.kind === "identity_match" ? "Identity" : "Rule"}</Badge></TableCell>
                      <TableCell>
                        <p className="font-medium">{alert.kind === "identity_match" ? alert.target_label || "Unlabeled target" : alert.rule_kind?.replaceAll("_", " ") || "Rule"}</p>
                        <p className="text-xs text-muted-foreground">{alert.kind === "identity_match" ? alert.watchlist_name || "—" : `${alert.object_class} · ${alert.rule_kind?.replaceAll("_", " ") || "Zone rule"}`}</p>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDateTime(alert.created_at)}</TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell"><Link to={`/cameras?camera_id=${encodeURIComponent(alert.camera_id)}`} onClick={(event) => event.stopPropagation()} className="hover:text-primary hover:underline" title={alert.camera_name ? undefined : alert.camera_id}>{alert.camera_name || "Camera"}</Link></TableCell>
                      <TableCell className="hidden text-muted-foreground lg:table-cell">{alert.kind === "identity_match" ? <><p className="font-medium text-foreground">{alert.similarity_ratio == null ? "—" : `${(alert.similarity_ratio * 100).toFixed(1)}%`}</p><p className="text-xs">{alert.modality === "face" ? "Face" : alert.modality === "appearance" ? "Body Re-ID" : alert.modality || "—"}</p></> : "—"}</TableCell>
                      <TableCell><Badge variant="outline">{alert.review.disposition.replaceAll("_", " ")}</Badge><p className="mt-1 text-xs text-muted-foreground">{alert.review.is_acknowledged ? "Acknowledged" : "Not acknowledged"}</p></TableCell>
                      <TableCell><Button variant="ghost" size="sm" aria-label={`View alert ${alert.id}`} onClick={(event) => { event.stopPropagation(); setSelectedAlert(alert); }}>Details</Button></TableCell>
                    </TableRow>
                  );
                })}
                {virtualizer.getVirtualItems().length > 0 && (
                  <TableRow aria-hidden="true" style={{ height: virtualizer.getTotalSize() - virtualizer.getVirtualItems()[virtualizer.getVirtualItems().length - 1].end }} className="border-none hover:bg-transparent" />
                )}
              </>
            )}
          </TableBody>
        </Table>
      </div>
      {!isPreview && <div ref={ref} className="mt-4 flex justify-center py-4">
        {query.isFetchingNextPage ? <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading more alerts…</p> : query.hasNextPage ? <Button variant="outline" disabled={query.isFetching} onClick={() => { void query.fetchNextPage(); }}>{query.isFetchNextPageError ? "Retry loading more" : "Load more"}</Button> : alerts.length > 0 && <p className="text-xs text-muted-foreground">End of results.</p>}
      </div>}
      {selectedAlert && <AlertDetails key={selectedAlert.id} initialAlert={selectedAlert} onClose={() => setSelectedAlert(null)} />}
    </div>
  );
}
