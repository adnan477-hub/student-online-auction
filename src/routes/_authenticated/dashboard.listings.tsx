import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/DashShell";
import { useAuth } from "@/hooks/use-auth";
import { useNow } from "@/hooks/use-now";
import { badge, fetchMyListings } from "@/lib/student-data";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate, inr } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard/listings")({
  head: () => ({
    meta: [
      { title: "My Listings — Student Auction" },
      { name: "description", content: "Manage the items you've put up for auction." },
      { property: "og:title", content: "My Listings — Student Auction" },
      { property: "og:description", content: "Manage the items you've put up for auction." },
    ],
  }),
  component: MyListings,
});

function MyListings() {
  const { user } = useAuth();
  const now = useNow();
  const qc = useQueryClient();
  const uid = user?.id ?? "";
  const q = useQuery({ enabled: !!uid, queryKey: ["my-listings", uid], queryFn: () => fetchMyListings(uid) });

  const remove = async (id: string) => {
    if (!confirm("Delete this listing?")) return;
    const { error } = await supabase.from("auctions").delete().eq("id", id);
    if (error) return void toast.error(error.message);
    toast.success("Listing deleted");
    qc.invalidateQueries({ queryKey: ["my-listings", uid] });
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageTitle sub="Pending and rejected listings can be deleted. Live auctions stay until they end.">My listings</PageTitle>
        <Button variant="paddle" asChild><Link to="/sell">New listing</Link></Button>
      </div>
      <div className="paddle-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b-2 border-ink text-left"><tr>{["Product", "Current bid", "Bids", "Ends", "Status", ""].map((h) => <th key={h} className="p-3">{h}</th>)}</tr></thead>
          <tbody>
            {q.data?.length ? q.data.map((a) => {
              const st = a.status === "active" && now && new Date(a.end_time).getTime() <= now ? "ended" : a.status;
              return (
                <tr key={a.id} className="border-b last:border-0">
                  <td className="p-3"><Link to="/auctions/$id" params={{ id: a.id }} className="font-semibold hover:text-primary">{a.title}</Link></td>
                  <td className="p-3">{inr(a.current_price)}</td>
                  <td className="p-3">{a.bid_count}</td>
                  <td className="p-3">{fmtDate(a.end_time)}</td>
                  <td className="p-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${badge[st]}`}>{st === "pending" ? "Pending approval" : st}</span></td>
                  <td className="p-3">{a.status !== "active" && <Button size="sm" variant="outlineInk" onClick={() => remove(a.id)}>Delete</Button>}</td>
                </tr>
              );
            }) : <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">You haven't listed anything yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
