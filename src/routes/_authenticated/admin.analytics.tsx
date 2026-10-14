import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageTitle, StatCard } from "@/components/DashShell";
import { supabase } from "@/integrations/supabase/client";
import { useNow } from "@/hooks/use-now";
import { fetchAllAuctions, meta } from "@/lib/admin-data";
import { inr } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  head: () => meta("Analytics", "Sales, categories and signups from real data."),
  component: Analytics,
});

function Bars({ rows }: { rows: [string, number][] }) {
  const max = Math.max(1, ...rows.map((r) => r[1]));
  return (
    <div className="space-y-2">
      {rows.map(([k, v]) => (
        <div key={k} className="text-sm">
          <div className="flex justify-between"><span>{k}</span><span className="font-bold">{v}</span></div>
          <div className="mt-1 h-3 rounded-full border-2 border-ink bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${(v / max) * 100}%` }} /></div>
        </div>
      ))}
      {!rows.length && <p className="text-sm text-muted-foreground">No data yet.</p>}
    </div>
  );
}

function Analytics() {
  const now = useNow();
  const auctions = useQuery({ queryKey: ["admin-auctions"], queryFn: fetchAllAuctions });
  const profiles = useQuery({ queryKey: ["admin-signups"], queryFn: async () => (await supabase.from("profiles").select("created_at, college")).data ?? [] });

  const all = auctions.data ?? [];
  const sold = all.filter((a) => a.status === "active" && now && new Date(a.end_time).getTime() <= now && a.bid_count > 0);
  const revenue = sold.reduce((s, a) => s + Number(a.current_price), 0);
  const count = (xs: string[]) => Object.entries(xs.reduce<Record<string, number>>((m, k) => ((m[k] = (m[k] ?? 0) + 1), m), {})).sort((a, b) => b[1] - a[1]);
  const months = (profiles.data ?? []).map((p) => new Date(p.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" }));

  return (
    <div>
      <PageTitle sub="Calculated live from listings, bids and accounts.">Analytics</PageTitle>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total listings" value={all.length} />
        <StatCard label="Items sold" value={sold.length} />
        <StatCard label="Value of sold items" value={inr(revenue)} />
        <StatCard label="Avg. bids per listing" value={all.length ? (all.reduce((s, a) => s + a.bid_count, 0) / all.length).toFixed(1) : "0"} />
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="paddle-card p-5"><h2 className="mb-4 font-bold">Listings by category</h2><Bars rows={count(all.map((a) => a.category))} /></div>
        <div className="paddle-card p-5"><h2 className="mb-4 font-bold">Listings by status</h2><Bars rows={count(all.map((a) => a.status))} /></div>
        <div className="paddle-card p-5"><h2 className="mb-4 font-bold">Signups by month</h2><Bars rows={count(months)} /></div>
        <div className="paddle-card p-5"><h2 className="mb-4 font-bold">Students by college</h2><Bars rows={count((profiles.data ?? []).map((p) => p.college || "Not set")).slice(0, 8)} /></div>
      </div>
    </div>
  );
}
