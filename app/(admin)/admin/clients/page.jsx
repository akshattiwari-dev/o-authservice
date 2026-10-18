import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import AdminShell from "@/components/admin/AdminShell";
import AdminClientsManager from "@/components/admin/AdminClientsManager";

export const metadata = { title: "Manage clients — o-auth 2.0 Simplified" };

export default async function AdminClientsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  return (
    <AdminShell>
      <AdminClientsManager />
    </AdminShell>
  );
}
