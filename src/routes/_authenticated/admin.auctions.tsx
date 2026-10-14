import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/DashShell";
import { supabase } from "@/integrations/supabase/client";
import { useNow } from "@/hooks/use-now";
import { fetchAllAuctions, meta } from "@/lib/admin-data";
import { fmtDate, inr } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/auctions")({
  head: () => meta("Auctions", "Approve, reject and remove listings."),
  component: AdminAuctions,
});

const TABS = ["Pending", "Active", "Completed", "Rejected", "Reported"] as const;

function AdminAuctions() {
  const now = useNow();
  const qc = useQueryClient();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Pending");
  const auctions = useQuery({ queryKey: ["admin-auctions"], queryFn: fetchAllAuctions });
  const reports = useQuery({ queryKey: ["admin-reports"], queryFn: async () => (await supabase.from("reports").select("*").order("created_at", { ascending: false })).data ?? [] });

  const all = auctions.data ?? [];
  const reported = new Set((reports.data ?? []).filter((r) => r.status === "open").map((r) => r.auction_id));
  const ended = (e: string) => (now ? new Date(e).getTime() <= now : false);
  const groups = {
    Pending: all.filter((a) => a.status === "pending"),
    Active: all.filter((a) => a.status === "active" && !ended(a.end_time)),
    Completed: all.filter((a) => a.status === "active" && ended(a.end_time)),
    Rejected: all.filter((a) => a.status === "rejected"),
    Reported: all.filter((a) => reported.has(a.id)),
  };

  const setStatus = async (id: string, status: "active" | "rejected") => {
    const { error } = await supabase.from("auctions").update({ status }).eq("id", id);
    if (error) return void toast.error(error.message);
    toast.success(status === "active" ? "Approved — now live" : "Rejected");
    qc.invalidateQueries({ queryKey: ["admin-auctions"] });
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this auction permanently?")) return;
    const { error } = await supabase.from("auctions").delete().eq("id", id);
    if (error) return void toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["admin-auctions"] });
    qc.invalidateQueries({ queryKey: ["admin-reports"] });
  };

  return (
    <div>
      <PageTitle>Auction management</PageTitle>
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button key={t} variant={tab === t ? "ink" : "outlineInk"} size="sm" onClick={() => setTab(t)}>{t} ({groups[t].length})</Button>
        ))}
      </div>
      <div className="mt-6 space-y-4">
        {groups[tab].length === 0 && <div className="paddle-card p-8 text-center text-muted-foreground">Nothing here.</div>}
        {groups[tab].map((a) => (
          <div key={a.id} className="paddle-card flex flex-col gap-4 p-4 md:flex-row">
            <div className="h-32 w-full shrink-0 overflow-hidden rounded-lg border-2 border-ink bg-muted md:w-44">
              {a.image_url && <img src={a.image_url} alt={a.title} className="h-full w-full object-cover" />}
            </div>
            <div className="flex-1">
              <Link to="/auctions/$id" params={{ id: a.id }} className="text-xl font-bold hover:text-primary">{a.title}</Link>
              <p className="text-sm text-muted-foreground">{a.category} · {a.condition} · by {a.seller_name || "Student"}</p>
              <p className="mt-2 line-clamp-2 text-sm">{a.description}</p>
              <p className="mt-2 text-sm">Start {inr(a.starting_price)} · Current {inr(a.current_price)} · {a.bid_count} bids · Ends {fmtDate(a.end_time)}</p>
              {reported.has(a.id) && <p className="mt-2 text-sm font-semibold text-destructive">Reported by students — see Reports.</p>}
            </div>
            <div className="flex shrink-0 flex-row gap-2 md:flex-col">
              {a.status !== "active" && <Button variant="paddle" size="sm" onClick={() => setStatus(a.id, "active")}>Approve</Button>}
              {a.status !== "rejected" && <Button variant="outlineInk" size="sm" onClick={() => setStatus(a.id, "rejected")}>Reject</Button>}
              <Button variant="destructive" size="sm" onClick={() => remove(a.id)}>Delete</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
