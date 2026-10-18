import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import DashboardShell from "@/components/dashboard/DashboardShell";
import KeysManager from "@/components/dashboard/KeysManager";

export const metadata = { title: "API Keys — o-auth 2.0 Simplified" };

export default async function KeysPage() {
  const session = await getServerSession(authOptions);
  return (
    <DashboardShell user={session.user}>
      <KeysManager />
    </DashboardShell>
  );
}
