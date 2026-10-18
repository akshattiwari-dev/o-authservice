import Link from "next/link";
import AuthCard from "@/components/auth/AuthCard";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export const metadata = { title: "Reset password — o-auth 2.0 Simplified" };

export default function ResetPasswordPage() {
  return (
    <AuthCard
      title="Choose a new password"
      footer={
        <Link href="/signin" className="font-medium text-accent hover:underline">
          Back to sign in
        </Link>
      }
    >
      <ResetPasswordForm />
    </AuthCard>
  );
}
