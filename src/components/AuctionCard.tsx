import { Link } from "@tanstack/react-router";
import { Clock, Gavel, ImageOff } from "lucide-react";
import { inr, timeLeft } from "@/lib/format";
import type { Tables } from "@/integrations/supabase/types";

export type Auction = Tables<"auctions">;

export function AuctionCard({ a, now }: { a: Auction; now: number | null }) {
  const t = now ? timeLeft(a.end_time, now) : null;
  return (
    <Link
      to="/auctions/$id"
      params={{ id: a.id }}
      className="paddle-card group flex flex-col overflow-hidden transition-transform hover:-translate-y-1"
    >
      <div className="relative aspect-[4/3] overflow-hidden border-b-2 border-ink bg-muted">
        {a.image_url ? (
          <img src={a.image_url} alt={a.title} loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
        ) : (
          <div className="grid h-full place-items-center text-muted-foreground"><ImageOff /></div>
        )}
        <span className="absolute left-3 top-3 rounded-full border-2 border-ink bg-accent px-2.5 py-0.5 text-xs font-bold">
          {a.category}
        </span>
        {t && (
          <span className={`absolute right-3 top-3 flex items-center gap-1 rounded-full border-2 border-ink px-2.5 py-0.5 text-xs font-bold ${t.ended ? "bg-muted" : t.urgent ? "bg-primary text-primary-foreground" : "bg-card"}`}>
            <Clock className="h-3 w-3" /> {t.label}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="line-clamp-1 text-lg font-bold">{a.title}</h3>
          <p className="text-xs text-muted-foreground">by {a.seller_name || "Student"} · starts {inr(a.starting_price)}</p>
        </div>
        <div className="mt-auto flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{a.bid_count > 0 ? "Current bid" : "Starting bid"}</p>
            <p className="font-display text-2xl font-extrabold">{inr(a.current_price)}</p>
          </div>
          <span className="flex items-center gap-1 text-sm text-muted-foreground"><Gavel className="h-4 w-4" />{a.bid_count} bids</span>
        </div>
      </div>
    </Link>
  );
}
