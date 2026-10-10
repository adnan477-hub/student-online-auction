import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/DashShell";
import { useAuth } from "@/hooks/use-auth";
import { useNow } from "@/hooks/use-now";
import { supabase } from "@/integrations/supabase/client";
import { inr, timeLeft } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard/watchlist")({
  head: () => ({
    meta: [
      { title: "Watchlist — Student Auction" },
      { name: "description", content: "Auctions you've saved to keep an eye on." },
      { property: "og:title", content: "Watchlist — Student Auction" },
      { property: "og:description", content: "Auctions you've saved to keep an eye on." },
    ],
  }),
  component: Watchlist,
});

function Watchlist() {
  const { user } = useAuth();
  const now = useNow();
  const qc = useQueryClient();
  const q = useQuery({
    enabled: !!user,
    queryKey: ["watchlist", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("watchlist").select("auction_id, auctions(id, title, current_price, end_time, image_url, bid_count)").order("created_at", { ascending: false });
      if (error) throw error;
      return data.filter((w) => w.auctions);
    },
  });
  const remove = async (id: string) => {
    const { error } = await supabase.from("watchlist").delete().eq("auction_id", id).eq("user_id", user!.id);
    if (error) return void toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["watchlist"] });
  };
  return (
    <div>
      <PageTitle sub="Tap the heart on any auction to save it here.">Watchlist</PageTitle>
      {q.data?.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {q.data.map(({ auctions: a }) => a && (
            <div key={a.id} className="paddle-card overflow-hidden">
              <div className="aspect-[4/3] bg-muted">{a.image_url && <img src={a.image_url} alt={a.title} className="h-full w-full object-cover" />}</div>
              <div className="p-4">
                <Link to="/auctions/$id" params={{ id: a.id }} className="font-bold hover:text-primary">{a.title}</Link>
                <p className="text-sm text-muted-foreground">{inr(a.current_price)} · {a.bid_count} bids · {now ? timeLeft(a.end_time, now).label : ""}</p>
                <Button size="sm" variant="outlineInk" className="mt-3" onClick={() => remove(a.id)}>Remove</Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="paddle-card p-8 text-center text-muted-foreground">Nothing saved yet. <Link to="/auctions" className="text-primary hover:underline">Browse auctions</Link></div>
      )}
    </div>
  );
}
