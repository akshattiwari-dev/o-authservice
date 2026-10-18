import Link from "next/link";
import AuthCard from "@/components/auth/AuthCard";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export const metadata = { title: "Forgot password — o-auth 2.0 Simplified" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Reset your password"
      subtitle="Enter the email on your account and we'll send a reset link"
      footer={
        <>
          Remembered it?{" "}
          <Link href="/signin" className="font-medium text-accent hover:underline">
            Back to sign in
          </Link>
        </>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
