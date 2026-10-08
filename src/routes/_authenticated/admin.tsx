import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useNow } from "@/hooks/use-now";
import { fmtDate, inr } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Student Auction" },
      { name: "description", content: "Approve listings and manage auctions and users." },
      { property: "og:title", content: "Admin — Student Auction" },
      { property: "og:description", content: "Admin control panel." },
    ],
  }),
  component: Admin,
});

const TABS = ["Pending", "Active", "Completed", "Rejected", "Users"] as const;

function Admin() {
  const { isAdmin, loading } = useAuth();
  const now = useNow();
  const qc = useQueryClient();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Pending");

  const auctions = useQuery({
    enabled: isAdmin,
    queryKey: ["admin-auctions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("auctions").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const users = useQuery({
    enabled: isAdmin && tab === "Users",
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (loading) return <p className="p-12 text-center text-muted-foreground">Loading…</p>;
  if (!isAdmin) return <p className="p-16 text-center text-lg font-semibold">Only admins can see this page.</p>;

  const all = auctions.data ?? [];
  const ended = (e: string) => (now ? new Date(e).getTime() <= now : false);
  const groups = {
    Pending: all.filter((a) => a.status === "pending"),
    Active: all.filter((a) => a.status === "active" && !ended(a.end_time)),
    Completed: all.filter((a) => a.status === "active" && ended(a.end_time)),
    Rejected: all.filter((a) => a.status === "rejected"),
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
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="text-4xl font-extrabold">Admin panel</h1>
      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button key={t} variant={tab === t ? "ink" : "outlineInk"} size="sm" onClick={() => setTab(t)}>
            {t}{t !== "Users" && ` (${groups[t].length})`}
          </Button>
        ))}
      </div>

      {tab === "Users" ? (
        <div className="paddle-card mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b-2 border-ink text-left"><tr>{["Name", "Email", "Student ID", "College", "Phone", "Joined"].map((h) => <th key={h} className="p-3">{h}</th>)}</tr></thead>
            <tbody>{users.data?.map((u) => (
              <tr key={u.id} className="border-b last:border-0">
                <td className="p-3 font-semibold">{u.full_name}</td><td className="p-3">{u.email}</td><td className="p-3">{u.student_id}</td><td className="p-3">{u.college}</td><td className="p-3">{u.phone}</td><td className="p-3">{fmtDate(u.created_at)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : (
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
              </div>
              <div className="flex shrink-0 flex-row gap-2 md:flex-col">
                {a.status !== "active" && <Button variant="paddle" size="sm" onClick={() => setStatus(a.id, "active")}>Approve</Button>}
                {a.status !== "rejected" && <Button variant="outlineInk" size="sm" onClick={() => setStatus(a.id, "rejected")}>Reject</Button>}
                <Button variant="destructive" size="sm" onClick={() => remove(a.id)}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
