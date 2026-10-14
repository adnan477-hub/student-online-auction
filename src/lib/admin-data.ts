import { supabase } from "@/integrations/supabase/client";

export async function fetchAllAuctions() {
  const { data, error } = await supabase.from("auctions").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export const meta = (title: string, description: string) => ({
  meta: [
    { title: `${title} — Student Auction Admin` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} — Student Auction Admin` },
    { property: "og:description", content: description },
  ],
});
