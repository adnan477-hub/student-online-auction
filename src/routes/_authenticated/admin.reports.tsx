import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/DashShell";
import { supabase } from "@/integrations/supabase/client";
import { meta } from "@/lib/admin-data";
import { badge } from "@/lib/student-data";
import { fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  head: () => meta("Reports", "Review complaints about listings and take action."),
  component: AdminReports,
});

function AdminReports() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-reports-full"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reports").select("*, auctions(id, title, status)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-reports-full"] });
    qc.invalidateQueries({ queryKey: ["admin-reports"] });
    qc.invalidateQueries({ queryKey: ["admin-auctions"] });
  };
  const setStatus = async (id: string, status: "resolved" | "dismissed") => {
    const { error } = await supabase.from("reports").update({ status }).eq("id", id);
    if (error) return void toast.error(error.message);
    toast.success(`Report ${status}`);
    refresh();
  };
  const takeDown = async (reportId: string, auctionId: string) => {
    const { error } = await supabase.from("auctions").update({ status: "rejected" }).eq("id", auctionId);
    if (error) return void toast.error(error.message);
    await setStatus(reportId, "resolved");
  };

  return (
    <div>
      <PageTitle sub="Students report listings from the auction page.">Reports & complaints</PageTitle>
      <div className="space-y-3">
        {q.data?.length ? q.data.map((r) => (
          <div key={r.id} className="paddle-card flex flex-col gap-3 p-4 md:flex-row md:items-center">
            <div className="flex-1 text-sm">
              <p>
                <span className={`mr-2 rounded-full px-2 py-0.5 text-xs font-bold capitalize ${badge[r.status]}`}>{r.status}</span>
                {r.auctions ? <Link to="/auctions/$id" params={{ id: r.auctions.id }} className="font-bold hover:text-primary">{r.auctions.title}</Link> : "Deleted listing"}
              </p>
              <p className="mt-1">"{r.reason}"</p>
              <p className="text-xs text-muted-foreground">{fmtDate(r.created_at)}</p>
            </div>
            {r.status === "open" && (
              <div className="flex gap-2">
                {r.auctions && r.auctions.status !== "rejected" && <Button size="sm" variant="destructive" onClick={() => takeDown(r.id, r.auction_id)}>Take down listing</Button>}
                <Button size="sm" variant="paddle" onClick={() => setStatus(r.id, "resolved")}>Resolve</Button>
                <Button size="sm" variant="outlineInk" onClick={() => setStatus(r.id, "dismissed")}>Dismiss</Button>
              </div>
            )}
          </div>
        )) : <div className="paddle-card p-8 text-center text-muted-foreground">No reports yet.</div>}
      </div>
    </div>
  );
}
