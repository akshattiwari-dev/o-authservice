import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import AdminShell from "@/components/admin/AdminShell";
import AdminTokensManager from "@/components/admin/AdminTokensManager";

export const metadata = { title: "Manage tokens — o-auth 2.0 Simplified" };

export default async function AdminTokensPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  return (
    <AdminShell>
      <AdminTokensManager />
    </AdminShell>
  );
}
