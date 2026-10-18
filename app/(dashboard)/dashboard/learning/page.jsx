import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import DashboardShell from "@/components/dashboard/DashboardShell";
import LearningManager from "@/components/dashboard/LearningManager";
import { chapters } from "@/data/chapters";

export const metadata = { title: "Learning Progress — o-auth 2.0 Simplified" };

export default async function LearningPage() {
  const session = await getServerSession(authOptions);
  const summary = chapters.map((c) => ({ slug: c.slug, title: c.title }));

  return (
    <DashboardShell user={session.user}>
      <LearningManager chapters={summary} />
    </DashboardShell>
  );
}
