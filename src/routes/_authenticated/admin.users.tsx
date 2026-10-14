import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageTitle } from "@/components/DashShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { meta } from "@/lib/admin-data";
import { badge } from "@/lib/student-data";
import { fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => meta("Users", "View students and suspend or reactivate accounts."),
  component: AdminUsers,
});

function AdminUsers() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [{ data: p, error }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role").eq("role", "admin"),
      ]);
      if (error) throw error;
      const admins = new Set((r ?? []).map((x) => x.user_id));
      return p.map((u) => ({ ...u, admin: admins.has(u.id) }));
    },
  });
  const setStatus = async (id: string, status: "active" | "suspended") => {
    if (status === "suspended" && !confirm("Suspend this account? They won't be able to bid or list.")) return;
    const { error } = await supabase.from("profiles").update({ status }).eq("id", id);
    if (error) return void toast.error(error.message);
    toast.success(status === "active" ? "Account reactivated" : "Account suspended");
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  };
  const s = q.toLowerCase();
  const rows = (users.data ?? []).filter((u) => !s || [u.full_name, u.email, u.student_id, u.college].some((v) => v.toLowerCase().includes(s)));

  return (
    <div>
      <PageTitle sub={`${users.data?.length ?? 0} registered accounts`}>User management</PageTitle>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, student ID, college" className="mb-4 max-w-md border-2 border-ink bg-background" />
      <div className="paddle-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b-2 border-ink text-left"><tr>{["Name", "Email", "Student ID", "College", "Phone", "Joined", "Status", ""].map((h) => <th key={h} className="p-3">{h}</th>)}</tr></thead>
          <tbody>{rows.map((u) => (
            <tr key={u.id} className="border-b last:border-0">
              <td className="p-3 font-semibold">{u.full_name}{u.admin && <span className="ml-2 rounded bg-ink px-1.5 text-xs text-ink-foreground">admin</span>}</td>
              <td className="p-3">{u.email}</td><td className="p-3">{u.student_id}</td><td className="p-3">{u.college}</td><td className="p-3">{u.phone}</td><td className="p-3">{fmtDate(u.created_at)}</td>
              <td className="p-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${badge[u.status] ?? badge.active}`}>{u.status}</span></td>
              <td className="p-3">{u.id !== user?.id && (u.status === "active"
                ? <Button size="sm" variant="outlineInk" onClick={() => setStatus(u.id, "suspended")}>Suspend</Button>
                : <Button size="sm" variant="paddle" onClick={() => setStatus(u.id, "active")}>Reactivate</Button>)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
