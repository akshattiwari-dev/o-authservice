import Link from "next/link";
import AuthCard from "@/components/auth/AuthCard";
import SignUpForm from "@/components/auth/SignUpForm";

export const metadata = { title: "Sign up — o-auth 2.0 Simplified" };

export default function SignUpPage() {
  return (
    <AuthCard
      title="Create your o-auth account"
      subtitle="Register OAuth clients, track your progress, and use the Playground"
      footer={
        <>
          Already have an account?{" "}
          <Link href="/signin" className="font-medium text-accent hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <SignUpForm />
    </AuthCard>
  );
}
