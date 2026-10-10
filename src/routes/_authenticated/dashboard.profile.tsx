import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageTitle } from "@/components/DashShell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — Student Auction" },
      { name: "description", content: "View and update your student profile." },
      { property: "og:title", content: "My Profile — Student Auction" },
      { property: "og:description", content: "View and update your student profile." },
    ],
  }),
  component: Profile,
});

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(100),
  student_id: z.string().trim().min(2, "Enter your student ID").max(50),
  college: z.string().trim().min(2, "Enter your college").max(150),
  phone: z.string().trim().regex(/^[0-9+\-\s]{7,15}$/, "Enter a valid phone number"),
});

function Profile() {
  const { user, profile, refresh } = useAuth();
  const [busy, setBusy] = useState(false);
  if (!profile) return <p className="text-muted-foreground">Loading…</p>;

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const r = schema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!r.success) return void toast.error(r.error.issues[0]?.message ?? "Check the form");
    setBusy(true);
    const { error } = await supabase.from("profiles").update(r.data).eq("id", user!.id);
    setBusy(false);
    if (error) return void toast.error(error.message);
    toast.success("Profile updated");
    refresh();
  };

  const f = (name: keyof z.infer<typeof schema>, label: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={profile[name]} required className="border-2 border-ink bg-background" />
    </div>
  );

  return (
    <div className="max-w-xl">
      <PageTitle sub="Your email can't be changed here.">My profile</PageTitle>
      <form onSubmit={onSubmit} className="paddle-card space-y-4 p-6">
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input value={profile.email} disabled className="border-2 border-ink" />
        </div>
        {f("full_name", "Full name")}
        {f("student_id", "Student ID")}
        {f("college", "College name")}
        {f("phone", "Phone number")}
        <p className="text-sm text-muted-foreground">Account status: <strong className="capitalize">{profile.status}</strong></p>
        <Button variant="paddle" disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>
      </form>
    </div>
  );
}
