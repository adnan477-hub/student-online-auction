import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useNow } from "@/hooks/use-now";
import { fmtDate, inr } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "My Dashboard — Student Auction" },
      { name: "description", content: "Track your bids, wins and listings." },
      { property: "og:title", content: "My Dashboard — Student Auction" },
      { property: "og:description", content: "Track your bids, wins and listings." },
    ],
  }),
  component: Dashboard,
});

type Status = "Leading" | "Outbid" | "Won" | "Lost";
const badge: Record<string, string> = {
  Leading: "bg-success text-success-foreground",
  Won: "bg-success text-success-foreground",
  Outbid: "bg-primary text-primary-foreground",
  Lost: "bg-muted text-muted-foreground",
  pending: "bg-accent",
  active: "bg-success text-success-foreground",
  rejected: "bg-destructive text-destructive-foreground",
  ended: "bg-muted",
};

function Dashboard() {
  const { user, profile } = useAuth();
  const now = useNow();
  const uid = user?.id;

  const myBids = useQuery({
    enabled: !!uid,
    queryKey: ["my-bids", uid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bids")
        .select("amount, auction_id, auctions(id, title, current_price, end_time, leader_id)")
        .eq("bidder_id", uid!)
        .order("amount", { ascending: false });
      if (error) throw error;
      const map = new Map<string, { a: NonNullable<(typeof data)[0]["auctions"]>; mine: number }>();
      for (const b of data) if (b.auctions && !map.has(b.auction_id)) map.set(b.auction_id, { a: b.auctions, mine: Number(b.amount) });
      return [...map.values()];
    },
  });
  const myListings = useQuery({
    enabled: !!uid,
    queryKey: ["my-listings", uid],
    queryFn: async () => {
      const { data, error } = await supabase.from("auctions").select("*").eq("seller_id", uid!).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const rows = (myBids.data ?? []).map(({ a, mine }) => {
    const ended = now ? new Date(a.end_time).getTime() <= now : false;
    const lead = a.leader_id === uid;
    const status: Status = ended ? (lead ? "Won" : "Lost") : lead ? "Leading" : "Outbid";
    return { a, mine, status };
  });
  const count = (s: Status) => rows.filter((r) => r.status === s).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground">Welcome back,</p>
          <h1 className="text-4xl font-extrabold">{profile?.full_name || "Student"}</h1>
          {profile?.college && <p className="text-sm text-muted-foreground">{profile.college} · ID {profile.student_id}</p>}
        </div>
        <Button variant="paddle" asChild><Link to="/sell">Sell an item</Link></Button>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          ["Leading", count("Leading")],
          ["Outbid", count("Outbid")],
          ["Won", count("Won")],
          ["My listings", myListings.data?.length ?? 0],
        ].map(([k, v]) => (
          <div key={k} className="paddle-card p-5">
            <p className="font-display text-4xl font-extrabold">{v}</p>
            <p className="text-sm text-muted-foreground">{k}</p>
          </div>
        ))}
      </div>

      <section className="mt-12">
        <h2 className="text-2xl font-extrabold">My bids</h2>
        <div className="paddle-card mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b-2 border-ink text-left"><tr>{["Product", "Current bid", "My highest bid", "Ends", "Status"].map((h) => <th key={h} className="p-3">{h}</th>)}</tr></thead>
            <tbody>
              {rows.length ? rows.map(({ a, mine, status }) => (
                <tr key={a.id} className="border-b last:border-0">
                  <td className="p-3"><Link to="/auctions/$id" params={{ id: a.id }} className="font-semibold hover:text-primary">{a.title}</Link></td>
                  <td className="p-3">{inr(a.current_price)}</td>
                  <td className="p-3">{inr(mine)}</td>
                  <td className="p-3">{fmtDate(a.end_time)}</td>
                  <td className="p-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${badge[status]}`}>{status}</span></td>
                </tr>
              )) : <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No bids yet. <Link to="/auctions" className="text-primary hover:underline">Browse auctions</Link></td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-extrabold">My listings</h2>
        <div className="paddle-card mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b-2 border-ink text-left"><tr>{["Product", "Current bid", "Bids", "Ends", "Status"].map((h) => <th key={h} className="p-3">{h}</th>)}</tr></thead>
            <tbody>
              {myListings.data?.length ? myListings.data.map((a) => {
                const st = a.status === "active" && now && new Date(a.end_time).getTime() <= now ? "ended" : a.status;
                return (
                  <tr key={a.id} className="border-b last:border-0">
                    <td className="p-3"><Link to="/auctions/$id" params={{ id: a.id }} className="font-semibold hover:text-primary">{a.title}</Link></td>
                    <td className="p-3">{inr(a.current_price)}</td>
                    <td className="p-3">{a.bid_count}</td>
                    <td className="p-3">{fmtDate(a.end_time)}</td>
                    <td className="p-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${badge[st]}`}>{st === "pending" ? "Pending approval" : st}</span></td>
                  </tr>
                );
              }) : <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">You haven't listed anything yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
