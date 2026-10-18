import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import AdminShell from "@/components/admin/AdminShell";
import AuditLogsManager from "@/components/admin/AuditLogsManager";

export const metadata = { title: "Audit logs — o-auth 2.0 Simplified" };

export default async function AdminAuditLogsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  return (
    <AdminShell>
      <AuditLogsManager />
    </AdminShell>
  );
}
