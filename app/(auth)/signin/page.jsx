import Link from "next/link";
import AuthCard from "@/components/auth/AuthCard";
import SignInForm from "@/components/auth/SignInForm";

export const metadata = { title: "Sign in — o-auth 2.0 Simplified" };

export default function SignInPage() {
  return (
    <AuthCard
      title="Sign in to o-auth"
      subtitle="Access your dashboard, clients, and learning progress"
      footer={
        <>
          Don't have an account?{" "}
          <Link href="/signup" className="font-medium text-accent hover:underline">
            Sign up
          </Link>
        </>
      }
    >
      <SignInForm
        hasGoogle={!!process.env.GOOGLE_CLIENT_ID}
        hasGithub={!!process.env.GITHUB_CLIENT_ID}
      />
    </AuthCard>
  );
}
