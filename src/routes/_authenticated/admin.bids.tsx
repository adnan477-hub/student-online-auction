import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageTitle } from "@/components/DashShell";
import { supabase } from "@/integrations/supabase/client";
import { meta } from "@/lib/admin-data";
import { fmtDate, inr } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/bids")({
  head: () => meta("Bidding", "Review bidding activity and spot unusual patterns."),
  component: AdminBids,
});

function AdminBids() {
  const activity = useQuery({
    queryKey: ["admin-bid-activity"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_bid_activity");
      if (error) throw error;
      return data;
    },
  });
  const recent = useQuery({
    queryKey: ["admin-bids-recent"],
    queryFn: async () => (await supabase.from("bids").select("*, auctions(title, seller_id)").order("created_at", { ascending: false }).limit(50)).data ?? [],
  });

  return (
    <div>
      <PageTitle sub="Bidders are shown by display name only. Flags are hints to investigate, not proof.">Bidding management</PageTitle>
      <h2 className="text-xl font-extrabold">Bidders</h2>
      <div className="paddle-card mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b-2 border-ink text-left"><tr>{["Bidder", "Bids", "Items", "Total bid", "Last bid", "Flag"].map((h) => <th key={h} className="p-3">{h}</th>)}</tr></thead>
          <tbody>{activity.data?.length ? activity.data.map((r) => {
            const flag = Number(r.fast_bids) >= 10 ? "Many bids in last 10 min" : Number(r.bid_count) / Math.max(1, Number(r.auctions)) >= 8 ? "Heavy bidding on few items" : "";
            return (
              <tr key={r.bidder_id} className="border-b last:border-0">
                <td className="p-3 font-semibold">{r.bidder_name}</td><td className="p-3">{r.bid_count}</td><td className="p-3">{r.auctions}</td>
                <td className="p-3">{inr(r.total)}</td><td className="p-3">{fmtDate(r.last_bid)}</td>
                <td className="p-3">{flag && <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold">{flag}</span>}</td>
              </tr>
            );
          }) : <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No bids yet.</td></tr>}</tbody>
        </table>
      </div>
      <h2 className="mt-10 text-xl font-extrabold">Recent bids</h2>
      <ul className="paddle-card mt-3 divide-y">
        {recent.data?.map((b) => (
          <li key={b.id} className="flex flex-wrap justify-between gap-2 p-3 text-sm">
            <span><strong>{b.bidder_name}</strong> on <Link to="/auctions/$id" params={{ id: b.auction_id }} className="text-primary hover:underline">{b.auctions?.title}</Link></span>
            <span>{inr(b.amount)} · <span className="text-muted-foreground">{fmtDate(b.created_at)}</span></span>
          </li>
        ))}
      </ul>
    </div>
  );
}
