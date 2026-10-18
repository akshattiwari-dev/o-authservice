import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import DashboardShell from "@/components/dashboard/DashboardShell";
import ClientsManager from "@/components/dashboard/ClientsManager";

export const metadata = { title: "OAuth Clients — o-auth 2.0 Simplified" };

export default async function ClientsPage() {
  const session = await getServerSession(authOptions);
  return (
    <DashboardShell user={session.user}>
      <ClientsManager />
    </DashboardShell>
  );
}
