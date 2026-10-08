import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — Student Auction" },
      { name: "description", content: "Choose a new password for your Student Auction account." },
      { property: "og:title", content: "Set a new password — Student Auction" },
      { property: "og:description", content: "Choose a new password." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const p = String(f.get("password"));
    if (p.length < 8) return void toast.error("Password must be at least 8 characters");
    if (p !== f.get("confirm")) return void toast.error("Passwords don't match");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: p });
    setBusy(false);
    if (error) return void toast.error(error.message);
    toast.success("Password updated");
    navigate({ to: "/dashboard" });
  };
  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <form onSubmit={onSubmit} className="paddle-card space-y-4 p-8">
        <h1 className="text-3xl font-extrabold">Set a new password</h1>
        <div className="space-y-1.5"><Label htmlFor="password">New password</Label><Input id="password" name="password" type="password" required className="border-2 border-ink" /></div>
        <div className="space-y-1.5"><Label htmlFor="confirm">Confirm password</Label><Input id="confirm" name="confirm" type="password" required className="border-2 border-ink" /></div>
        <Button variant="paddle" className="w-full" disabled={busy}>Update password</Button>
      </form>
    </div>
  );
}
