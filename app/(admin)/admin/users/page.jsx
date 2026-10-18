import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import AdminShell from "@/components/admin/AdminShell";
import UsersManager from "@/components/admin/UsersManager";

export const metadata = { title: "Manage users — o-auth 2.0 Simplified" };

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  return (
    <AdminShell>
      <UsersManager />
    </AdminShell>
  );
}
