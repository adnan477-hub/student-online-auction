import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { PageTitle, StatCard } from "@/components/DashShell";
import { useAuth } from "@/hooks/use-auth";
import { useNow } from "@/hooks/use-now";
import { bidStatus, fetchMyBids, fetchMyListings } from "@/lib/student-data";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({
    meta: [
      { title: "My Dashboard — Student Auction" },
      { name: "description", content: "Your bids, wins, listings and updates at a glance." },
      { property: "og:title", content: "My Dashboard — Student Auction" },
      { property: "og:description", content: "Your bids, wins, listings and updates at a glance." },
    ],
  }),
  component: Overview,
});

function Overview() {
  const { user, profile } = useAuth();
  const now = useNow();
  const uid = user?.id ?? "";
  const bids = useQuery({ enabled: !!uid, queryKey: ["my-bids", uid], queryFn: () => fetchMyBids(uid) });
  const listings = useQuery({ enabled: !!uid, queryKey: ["my-listings", uid], queryFn: () => fetchMyListings(uid) });
  const notes = useQuery({
    enabled: !!uid,
    queryKey: ["notifications", uid, "recent"],
    queryFn: async () => (await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(5)).data ?? [],
  });
  const st = (bids.data ?? []).map((r) => bidStatus(r.a, uid, now));
  const c = (s: string) => st.filter((x) => x === s).length;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageTitle sub={profile?.college ? `${profile.college} · ID ${profile.student_id}` : undefined}>
          Welcome back, {profile?.full_name?.split(" ")[0] || "Student"}
        </PageTitle>
        <Button variant="paddle" asChild className="mb-6"><Link to="/sell">Sell an item</Link></Button>
      </div>
      {profile?.status === "suspended" && (
        <p className="mb-6 rounded-md border-2 border-ink bg-destructive p-3 text-sm font-semibold text-destructive-foreground">Your account is suspended. You can't bid or list items. Contact an admin.</p>
      )}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Leading" value={c("Leading")} />
        <StatCard label="Outbid" value={c("Outbid")} />
        <StatCard label="Won" value={c("Won")} />
        <StatCard label="My listings" value={listings.data?.length ?? 0} />
      </div>
      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold">Latest updates</h2>
          <Link to="/dashboard/notifications" className="text-sm font-semibold text-primary hover:underline">See all</Link>
        </div>
        <ul className="paddle-card mt-3 divide-y">
          {notes.data?.length ? notes.data.map((n) => (
            <li key={n.id} className="p-4 text-sm">
              <p className="font-semibold">{n.title}</p>
              <p className="text-muted-foreground">{n.body} · {fmtDate(n.created_at)}</p>
            </li>
          )) : <li className="p-6 text-center text-sm text-muted-foreground">No updates yet.</li>}
        </ul>
      </section>
    </div>
  );
}
