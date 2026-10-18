import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import DashboardShell from "@/components/dashboard/DashboardShell";
import DeleteAccountForm from "@/components/dashboard/DeleteAccountForm";

export const metadata = { title: "Settings — o-auth 2.0 Simplified" };

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  return (
    <DashboardShell user={session.user}>
      <h1 className="text-xl font-bold text-ink">Settings</h1>

      <div className="mt-8 rounded-lg border border-red-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-red-700">Danger zone</h2>
        <p className="mt-1 text-sm text-muted">
          Deleting your account revokes all your tokens, removes your OAuth clients, and permanently deletes your
          account. This can't be undone.
        </p>
        <DeleteAccountForm />
      </div>
    </DashboardShell>
  );
}
