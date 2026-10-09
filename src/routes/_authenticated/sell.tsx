import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { CATEGORIES, CONDITIONS } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/sell")({
  head: () => ({
    meta: [
      { title: "Sell an Item — Student Auction" },
      { name: "description", content: "List an item for auction on your campus marketplace." },
      { property: "og:title", content: "Sell an Item — Student Auction" },
      { property: "og:description", content: "List an item for auction." },
    ],
  }),
  component: Sell,
});

const schema = z.object({
  title: z.string().trim().min(3, "Product name is too short").max(120),
  category: z.enum(CATEGORIES),
  condition: z.enum(CONDITIONS),
  description: z.string().trim().min(10, "Add a short description (10+ characters)").max(2000),
  starting_price: z.coerce.number().positive("Starting price must be above 0"),
  min_increment: z.coerce.number().positive("Increment must be above 0"),
  end: z.string().min(1, "Pick an end date and time"),
});

const box = "border-2 border-ink bg-background";

function Sell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const fd = new FormData(e.currentTarget);
    const r = schema.safeParse(Object.fromEntries(fd));
    if (!r.success) return void toast.error(r.error.issues[0]?.message ?? "Check the form");
    const end = new Date(r.data.end);
    if (end.getTime() < Date.now() + 10 * 60_000) return void toast.error("End time must be at least 10 minutes from now");
    setBusy(true);
    try {
      let image_url: string | null = null;
      const file = fd.get("image") as File | null;
      if (file && file.size) {
        if (file.size > 5 * 1024 * 1024) return void toast.error("Image must be under 5 MB");
        const path = `${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.]/g, "_")}`;
        const up = await supabase.storage.from("auction-images").upload(path, file);
        if (up.error) return void toast.error(up.error.message);
        const signed = await supabase.storage.from("auction-images").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
        image_url = signed.data?.signedUrl ?? null;
      }
      const { end: _e, ...rest } = r.data;
      const { error } = await supabase.from("auctions").insert({
        ...rest,
        seller_id: user.id,
        image_url,
        end_time: end.toISOString(),
        status: "pending",
      });
      if (error) return void toast.error(error.message);
      toast.success("Submitted! Your item is pending admin approval.");
      navigate({ to: "/dashboard" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-4xl font-extrabold">Sell an item</h1>
      <p className="mt-2 text-muted-foreground">An admin reviews every listing before it goes live.</p>
      <form onSubmit={onSubmit} className="paddle-card mt-8 grid gap-5 p-6 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="title">Product name</Label><Input id="title" name="title" required className={box} /></div>
        <div className="space-y-1.5"><Label htmlFor="category">Category</Label>
          <select id="category" name="category" className={`h-9 w-full rounded-md px-3 text-sm ${box}`}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
        <div className="space-y-1.5"><Label htmlFor="condition">Condition</Label>
          <select id="condition" name="condition" defaultValue="Good" className={`h-9 w-full rounded-md px-3 text-sm ${box}`}>{CONDITIONS.map((c) => <option key={c}>{c}</option>)}</select></div>
        <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="description">Description</Label><Textarea id="description" name="description" rows={4} required className={box} /></div>
        <div className="space-y-1.5"><Label htmlFor="starting_price">Starting price (₹)</Label><Input id="starting_price" name="starting_price" type="number" min="1" required className={box} /></div>
        <div className="space-y-1.5"><Label htmlFor="min_increment">Minimum bid increment (₹)</Label><Input id="min_increment" name="min_increment" type="number" min="1" defaultValue="50" required className={box} /></div>
        <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="end">Auction ends</Label><Input id="end" name="end" type="datetime-local" required className={box} /></div>
        <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="image">Product photo</Label><Input id="image" name="image" type="file" accept="image/*" className={box} /></div>
        <Button variant="paddle" size="lg" className="sm:col-span-2" disabled={busy}>{busy ? "Submitting…" : "Submit Auction"}</Button>
      </form>
    </div>
  );
}
