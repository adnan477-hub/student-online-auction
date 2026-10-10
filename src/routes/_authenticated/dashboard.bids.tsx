import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageTitle } from "@/components/DashShell";
import { useAuth } from "@/hooks/use-auth";
import { useNow } from "@/hooks/use-now";
import { badge, bidStatus, fetchMyBids } from "@/lib/student-data";
import { fmtDate, inr } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard/bids")({
  head: () => ({
    meta: [
      { title: "My Bids — Student Auction" },
      { name: "description", content: "Every item you've bid on and whether you're winning." },
      { property: "og:title", content: "My Bids — Student Auction" },
      { property: "og:description", content: "Every item you've bid on and whether you're winning." },
    ],
  }),
  component: MyBids,
});

function MyBids() {
  const { user } = useAuth();
  const now = useNow();
  const uid = user?.id ?? "";
  const q = useQuery({ enabled: !!uid, queryKey: ["my-bids", uid], queryFn: () => fetchMyBids(uid) });
  return (
    <div>
      <PageTitle sub="Your highest bid on each item and its current status.">My bids</PageTitle>
      <div className="paddle-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b-2 border-ink text-left"><tr>{["Product", "Current bid", "My highest bid", "Ends", "Status"].map((h) => <th key={h} className="p-3">{h}</th>)}</tr></thead>
          <tbody>
            {q.data?.length ? q.data.map(({ a, mine }) => {
              const s = bidStatus(a, uid, now);
              return (
                <tr key={a.id} className="border-b last:border-0">
                  <td className="p-3"><Link to="/auctions/$id" params={{ id: a.id }} className="font-semibold hover:text-primary">{a.title}</Link></td>
                  <td className="p-3">{inr(a.current_price)}</td>
                  <td className="p-3">{inr(mine)}</td>
                  <td className="p-3">{fmtDate(a.end_time)}</td>
                  <td className="p-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${badge[s]}`}>{s}</span></td>
                </tr>
              );
            }) : <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No bids yet. <Link to="/auctions" className="text-primary hover:underline">Browse auctions</Link></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
