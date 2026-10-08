import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

const search = z.object({ mode: z.enum(["login", "register", "forgot"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Login or Register — Student Auction" },
      { name: "description", content: "Sign in or create your Student Auction account." },
      { property: "og:title", content: "Login or Register — Student Auction" },
      { property: "og:description", content: "Join your campus auction marketplace." },
    ],
  }),
  component: AuthPage,
});

const registerSchema = z
  .object({
    full_name: z.string().trim().min(2, "Enter your full name").max(100),
    email: z.string().trim().email("Enter a valid email").max(255),
    student_id: z.string().trim().min(2, "Enter your student ID").max(50),
    college: z.string().trim().min(2, "Enter your college").max(150),
    phone: z.string().trim().regex(/^[0-9+\-\s]{7,15}$/, "Enter a valid phone number"),
    password: z.string().min(8, "Password must be at least 8 characters").max(72),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: "Passwords don't match", path: ["confirm"] });

function AuthPage() {
  const { mode = "login" } = Route.useSearch();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const setMode = (m: "login" | "register" | "forgot") => navigate({ to: "/auth", search: { mode: m } });

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    setBusy(true);
    try {
      if (mode === "register") {
        const r = registerSchema.safeParse(f);
        if (!r.success) return void toast.error(r.error.issues[0].message);
        const { password, confirm: _c, email, ...meta } = r.data;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin, data: meta },
        });
        if (error) return void toast.error(error.message);
        toast.success("Check your email to confirm your account, then log in.");
        setMode("login");
      } else if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: f.email, password: f.password });
        if (error) return void toast.error(error.message);
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(f.email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) return void toast.error(error.message);
        toast.success("Password reset link sent. Check your email.");
      }
    } finally {
      setBusy(false);
    }
  };

  const title = { login: "Welcome back", register: "Create your account", forgot: "Reset password" }[mode];

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <div className="paddle-card p-8">
        <h1 className="text-3xl font-extrabold">{title}</h1>
        <form onSubmit={onSubmit} className="mt-6 space-y-4" key={mode}>
          {mode === "register" && (
            <>
              <Field name="full_name" label="Full Name" />
              <Field name="student_id" label="Student ID" />
              <Field name="college" label="College Name" />
              <Field name="phone" label="Phone Number" type="tel" />
            </>
          )}
          <Field name="email" label="Email" type="email" />
          {mode !== "forgot" && <Field name="password" label="Password" type="password" />}
          {mode === "register" && <Field name="confirm" label="Confirm Password" type="password" />}
          <Button variant="paddle" className="w-full" size="lg" disabled={busy}>
            {busy ? "Please wait…" : mode === "login" ? "Log in" : mode === "register" ? "Register" : "Send reset link"}
          </Button>
        </form>
        <div className="mt-6 flex flex-col gap-2 text-center text-sm">
          {mode === "login" && (
            <>
              <button onClick={() => setMode("forgot")} className="text-muted-foreground hover:underline">Forgot password?</button>
              <button onClick={() => setMode("register")} className="font-semibold text-primary hover:underline">New here? Create an account</button>
            </>
          )}
          {mode !== "login" && (
            <button onClick={() => setMode("login")} className="font-semibold text-primary hover:underline">Back to login</button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ name, label, type = "text" }: { name: string; label: string; type?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} required className="border-2 border-ink bg-background" />
    </div>
  );
}
