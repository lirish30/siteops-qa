import { Suspense } from "react";
import { AuthForm } from "@/components/features/auth/AuthForm";

export const metadata = { title: "Sign up — SiteOps QA" };

export default function SignupPage() {
  return (
    <Suspense>
      <AuthForm mode="signup" />
    </Suspense>
  );
}
