import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import DashboardShell from "@/components/dashboard/DashboardShell";
import ClientDetail from "@/components/dashboard/ClientDetail";

export const metadata = { title: "Client details — o-auth 2.0 Simplified" };

export default async function ClientDetailPage({ params }) {
  const session = await getServerSession(authOptions);
  return (
    <DashboardShell user={session.user}>
      <ClientDetail clientRecordId={params.id} />
    </DashboardShell>
  );
}
