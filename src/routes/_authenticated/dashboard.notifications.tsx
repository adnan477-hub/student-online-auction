import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/DashShell";
import { useAuth } from "@/hooks/use-auth";
import { useNow } from "@/hooks/use-now";
import { supabase } from "@/integrations/supabase/client";
import { bidStatus, fetchMyBids } from "@/lib/student-data";
import { fmtDate, inr } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Student Auction" },
      { name: "description", content: "Outbid alerts, approvals and auction results." },
      { property: "og:title", content: "Notifications — Student Auction" },
      { property: "og:description", content: "Outbid alerts, approvals and auction results." },
    ],
  }),
  component: Notifications,
});

function Notifications() {
  const { user } = useAuth();
  const now = useNow();
  const qc = useQueryClient();
  const uid = user?.id ?? "";
  const q = useQuery({
    enabled: !!uid,
    queryKey: ["notifications", uid],
    queryFn: async () => {
      const { data, error } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
  });
  const bids = useQuery({ enabled: !!uid, queryKey: ["my-bids", uid], queryFn: () => fetchMyBids(uid) });
  const results = (bids.data ?? []).filter((r) => ["Won", "Lost"].includes(bidStatus(r.a, uid, now)));

  useEffect(() => {
    if (!uid) return;
    const ch = supabase
      .channel(`notes-${uid}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` }, () => {
        qc.invalidateQueries({ queryKey: ["notifications"] });
        qc.invalidateQueries({ queryKey: ["unread"] });
      })
      .subscribe();
    return () => void supabase.removeChannel(ch);
  }, [uid, qc]);

  const markAll = async () => {
    await supabase.from("notifications").update({ read: true }).eq("read", false).eq("user_id", uid);
    qc.invalidateQueries({ queryKey: ["notifications"] });
    qc.invalidateQueries({ queryKey: ["unread"] });
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageTitle sub="Updates arrive here instantly.">Notifications</PageTitle>
        <Button variant="outlineInk" size="sm" onClick={markAll}>Mark all as read</Button>
      </div>
      {results.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 font-bold">Auction results</h2>
          <ul className="paddle-card divide-y">
            {results.map(({ a }) => {
              const won = bidStatus(a, uid, now) === "Won";
              return (
                <li key={a.id} className="p-4 text-sm">
                  <span className="font-semibold">{won ? "🏆 You won " : "Ended: "}</span>
                  <Link to="/auctions/$id" params={{ id: a.id }} className="font-semibold text-primary hover:underline">{a.title}</Link>
                  <span className="text-muted-foreground"> — final price {inr(a.current_price)}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      <ul className="paddle-card divide-y">
        {q.data?.length ? q.data.map((n) => (
          <li key={n.id} className={`p-4 text-sm ${n.read ? "" : "bg-accent/30"}`}>
            <p className="font-semibold">{n.title}</p>
            <p className="text-muted-foreground">{n.body}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {fmtDate(n.created_at)}
              {n.auction_id && <> · <Link to="/auctions/$id" params={{ id: n.auction_id }} className="text-primary hover:underline">View item</Link></>}
            </p>
          </li>
        )) : <li className="p-6 text-center text-sm text-muted-foreground">No notifications yet.</li>}
      </ul>
    </div>
  );
}
