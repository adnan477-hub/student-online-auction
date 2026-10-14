import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageTitle, StatCard } from "@/components/DashShell";
import { supabase } from "@/integrations/supabase/client";
import { useNow } from "@/hooks/use-now";
import { fetchAllAuctions, meta } from "@/lib/admin-data";
import { fmtDate, inr } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => meta("Overview", "Users, listings, auctions and bidding at a glance."),
  component: AdminOverview,
});

function AdminOverview() {
  const now = useNow();
  const auctions = useQuery({ queryKey: ["admin-auctions"], queryFn: fetchAllAuctions });
  const users = useQuery({ queryKey: ["admin-user-count"], queryFn: async () => (await supabase.from("profiles").select("id", { count: "exact", head: true })).count ?? 0 });
  const bids = useQuery({ queryKey: ["admin-recent-bids"], queryFn: async () => (await supabase.from("bids").select("*, auctions(title)").order("created_at", { ascending: false }).limit(8)).data ?? [] });
  const bidCount = useQuery({ queryKey: ["admin-bid-count"], queryFn: async () => (await supabase.from("bids").select("id", { count: "exact", head: true })).count ?? 0 });
  const openReports = useQuery({ queryKey: ["admin-open-reports"], queryFn: async () => (await supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open")).count ?? 0 });

  const all = auctions.data ?? [];
  const ended = (e: string) => (now ? new Date(e).getTime() <= now : false);
  return (
    <div>
      <PageTitle sub="Live numbers from the database.">Admin overview</PageTitle>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Registered users" value={users.data ?? "…"} />
        <StatCard label="Pending listings" value={all.filter((a) => a.status === "pending").length} />
        <StatCard label="Active auctions" value={all.filter((a) => a.status === "active" && !ended(a.end_time)).length} />
        <StatCard label="Completed auctions" value={all.filter((a) => a.status === "active" && ended(a.end_time)).length} />
        <StatCard label="Total bids" value={bidCount.data ?? "…"} />
        <StatCard label="Open reports" value={openReports.data ?? "…"} />
      </div>
      <h2 className="mt-10 text-xl font-extrabold">Latest bids</h2>
      <ul className="paddle-card mt-3 divide-y">
        {bids.data?.length ? bids.data.map((b) => (
          <li key={b.id} className="flex justify-between gap-3 p-3 text-sm">
            <span><strong>{b.bidder_name}</strong> on <Link to="/auctions/$id" params={{ id: b.auction_id }} className="text-primary hover:underline">{b.auctions?.title}</Link></span>
            <span>{inr(b.amount)} · <span className="text-muted-foreground">{fmtDate(b.created_at)}</span></span>
          </li>
        )) : <li className="p-6 text-center text-sm text-muted-foreground">No bids yet.</li>}
      </ul>
    </div>
  );
}
