import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageTitle } from "@/components/DashShell";
import { supabase } from "@/integrations/supabase/client";
import { meta } from "@/lib/admin-data";
import { fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/security")({
  head: () => meta("Security", "Admin accounts and the audit trail of admin actions."),
  component: Security,
});

const LABEL: Record<string, string> = {
  auction_active: "Approved listing",
  auction_rejected: "Rejected listing",
  auction_pending: "Moved listing to pending",
  auction_deleted: "Deleted listing",
  user_suspended: "Suspended account",
  user_active: "Reactivated account",
  report_resolved: "Resolved report",
  report_dismissed: "Dismissed report",
};

function Security() {
  const admins = useQuery({
    queryKey: ["admin-admins"],
    queryFn: async () => {
      const { data: r } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      const ids = (r ?? []).map((x) => x.user_id);
      if (!ids.length) return [];
      return (await supabase.from("profiles").select("id, full_name, email").in("id", ids)).data ?? [];
    },
  });
  const log = useQuery({
    queryKey: ["admin-audit"],
    queryFn: async () => (await supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(200)).data ?? [],
  });
  const names = new Map((admins.data ?? []).map((a) => [a.id, a.full_name]));

  return (
    <div>
      <PageTitle>Security & settings</PageTitle>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="paddle-card p-5">
          <h2 className="font-bold">Administrators</h2>
          <ul className="mt-3 space-y-1 text-sm">{admins.data?.map((a) => <li key={a.id}><strong>{a.full_name || "Admin"}</strong> · {a.email}</li>)}</ul>
          <p className="mt-4 text-xs text-muted-foreground">New sign-ups are always students. Admin rights can only be granted directly in the backend, never from the app.</p>
        </div>
        <div className="paddle-card p-5 text-sm">
          <h2 className="font-bold">Protections in place</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li>Admin actions are checked by the database, not just this page.</li>
            <li>Suspended accounts are blocked from bidding and listing.</li>
            <li>Students can't change their email, status or role.</li>
            <li>Login email codes: <strong>waiting for email domain setup</strong>.</li>
          </ul>
        </div>
      </div>
      <h2 className="mt-10 text-xl font-extrabold">Audit log</h2>
      <div className="paddle-card mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b-2 border-ink text-left"><tr>{["When", "Admin", "Action", "Item"].map((h) => <th key={h} className="p-3">{h}</th>)}</tr></thead>
          <tbody>{log.data?.length ? log.data.map((l) => (
            <tr key={l.id} className="border-b last:border-0">
              <td className="p-3">{fmtDate(l.created_at)}</td>
              <td className="p-3">{(l.actor_id && names.get(l.actor_id)) || "System"}</td>
              <td className="p-3 font-semibold">{LABEL[l.action] ?? l.action}</td>
              <td className="p-3">{l.details}</td>
            </tr>
          )) : <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No admin actions recorded yet.</td></tr>}</tbody>
        </table>
      </div>
    </div>
  );
}
