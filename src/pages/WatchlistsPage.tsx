import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { WatchlistsWorkspace } from "@/features/watchlists/components/WatchlistsWorkspace";

export default function WatchlistsPage() {
  const { user, loading, isAuthenticated } = useAuth();
  
  if (loading) {
    return (
      <div role="status" aria-label="Loading authentication">
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }
  
  // Mount no queries, mutations or protected image requests for unauthorized users.
  if (!isAuthenticated || !user || !["admin", "operator"].includes(user.role)) {
    return (
      <div role="alert" className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-6 text-sm text-amber-400">
        Only administrators and operators can manage watchlists.
      </div>
    );
  }
  
  return <WatchlistsWorkspace key={user.id} />;
}