import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import DashboardShell from "@/components/dashboard/DashboardShell";
import TokensManager from "@/components/dashboard/TokensManager";

export const metadata = { title: "Tokens — o-auth 2.0 Simplified" };

export default async function TokensPage() {
  const session = await getServerSession(authOptions);
  return (
    <DashboardShell user={session.user}>
      <TokensManager />
    </DashboardShell>
  );
}
