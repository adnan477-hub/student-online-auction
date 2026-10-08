import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { Clock, ImageOff, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useNow } from "@/hooks/use-now";
import { fmtDate, inr, timeLeft } from "@/lib/format";

export const Route = createFileRoute("/auctions/$id")({
  head: () => ({
    meta: [
      { title: "Auction — Student Auction" },
      { name: "description", content: "See the current bid, bid history and place your bid live." },
      { property: "og:title", content: "Auction — Student Auction" },
      { property: "og:description", content: "Bid live on this student auction." },
    ],
  }),
  component: AuctionDetail,
});

function AuctionDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const now = useNow();
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(0);

  const auction = useQuery({
    queryKey: ["auction", id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("auctions").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const bids = useQuery({
    queryKey: ["bids", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("bids").select("*").eq("auction_id", id).order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel(`auction-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "auctions", filter: `id=eq.${id}` }, () => {
        qc.invalidateQueries({ queryKey: ["auction", id] });
        setFlash((f) => f + 1);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "bids", filter: `auction_id=eq.${id}` }, () => {
        qc.invalidateQueries({ queryKey: ["bids", id] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, qc]);

  const a = auction.data;
  if (auction.isLoading) return <p className="p-12 text-center text-muted-foreground">Loading…</p>;
  if (!a)
    return (
      <div className="p-16 text-center">
        <h1 className="text-3xl font-extrabold">Auction not found</h1>
        <Link to="/auctions" className="mt-4 inline-block text-primary hover:underline">Back to auctions</Link>
      </div>
    );

  const t = now ? timeLeft(a.end_time, now) : null;
  const minNext = a.bid_count > 0 ? Number(a.current_price) + Number(a.min_increment) : Number(a.starting_price);
  const isSeller = user?.id === a.seller_id;
  const leading = user && a.leader_id === user.id;
  const open = a.status === "active" && t && !t.ended;

  const placeBid = async (e: FormEvent) => {
    e.preventDefault();
    const n = Number(amount);
    if (!n || n < minNext) return void toast.error(`Bid must be at least ${inr(minNext)}`);
    setBusy(true);
    const { error } = await supabase.rpc("place_bid", { _auction_id: id, _amount: n });
    setBusy(false);
    if (error) return void toast.error(error.message);
    toast.success(`You bid ${inr(n)}!`);
    setAmount("");
    qc.invalidateQueries({ queryKey: ["auction", id] });
    qc.invalidateQueries({ queryKey: ["bids", id] });
  };

  return (
    <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 lg:grid-cols-[1.2fr_1fr]">
      <div>
        <div className="paddle-card aspect-[4/3] overflow-hidden">
          {a.image_url ? <img src={a.image_url} alt={a.title} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-muted-foreground"><ImageOff className="h-10 w-10" /></div>}
        </div>
        <div className="mt-8">
          <span className="rounded-full border-2 border-ink bg-accent px-3 py-1 text-xs font-bold">{a.category}</span>
          <h1 className="mt-4 text-4xl font-extrabold md:text-5xl">{a.title}</h1>
          <p className="mt-4 whitespace-pre-line text-muted-foreground">{a.description}</p>
          <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
            {[
              ["Seller", a.seller_name || "Student"],
              ["Condition", a.condition],
              ["Starting price", inr(a.starting_price)],
              ["Min. increment", inr(a.min_increment)],
              ["Listed", fmtDate(a.created_at)],
              ["Ends", fmtDate(a.end_time)],
            ].map(([k, v]) => (
              <div key={k}><dt className="text-muted-foreground">{k}</dt><dd className="font-semibold">{v}</dd></div>
            ))}
          </dl>
        </div>
      </div>

      <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
        <div className="paddle-card p-6">
          {a.status !== "active" && (
            <p className="mb-4 rounded-md border-2 border-ink bg-accent px-3 py-2 text-sm font-semibold">
              {a.status === "pending" ? "Pending admin approval — not visible to others yet." : "This listing was rejected."}
            </p>
          )}
          <div className="flex items-center justify-between">
            <p className="text-sm uppercase tracking-wide text-muted-foreground">{a.bid_count > 0 ? "Current highest bid" : "Starting bid"}</p>
            {t && <span className={`flex items-center gap-1 text-sm font-bold ${t.urgent ? "text-primary" : ""}`}><Clock className="h-4 w-4" />{t.label}</span>}
          </div>
          <p key={flash} className="animate-bid-flash mt-1 rounded-md font-display text-5xl font-extrabold">{inr(a.current_price)}</p>
          <p className="mt-1 text-sm text-muted-foreground">{a.bid_count} bids</p>
          {leading && <p className="mt-3 flex items-center gap-2 font-semibold text-success"><Trophy className="h-4 w-4" />{open ? "You're the highest bidder" : "You won this auction!"}</p>}

          {open ? (
            !user ? (
              <Button variant="paddle" size="lg" className="mt-6 w-full" asChild><Link to="/auth">Log in to bid</Link></Button>
            ) : isSeller ? (
              <p className="mt-6 text-sm text-muted-foreground">This is your listing — you can't bid on it.</p>
            ) : (
              <form onSubmit={placeBid} className="mt-6 space-y-3">
                <p className="text-sm">Minimum next bid: <strong>{inr(minNext)}</strong></p>
                <div className="flex gap-2">
                  <Input type="number" step="1" min={minNext} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter your bid" className="h-11 border-2 border-ink" />
                  <Button variant="paddle" size="lg" className="h-11" disabled={busy}>PLACE BID</Button>
                </div>
              </form>
            )
          ) : (
            t?.ended && <p className="mt-6 font-semibold">Auction ended{a.bid_count > 0 ? ` — sold for ${inr(a.current_price)}` : " with no bids"}.</p>
          )}
        </div>

        <div className="paddle-card p-6">
          <h2 className="text-xl font-bold">Bid history</h2>
          <ul className="mt-4 divide-y">
            {bids.data?.length ? bids.data.map((b, i) => (
              <li key={b.id} className={`flex justify-between py-2 text-sm ${i === 0 ? "font-bold" : ""}`}>
                <span>{b.bidder_name}{b.bidder_id === user?.id ? " (you)" : ""}</span>
                <span className="flex gap-3"><span className="text-muted-foreground font-normal">{now ? new Date(b.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : ""}</span>{inr(b.amount)}</span>
              </li>
            )) : <li className="py-2 text-sm text-muted-foreground">No bids yet — be the first.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
