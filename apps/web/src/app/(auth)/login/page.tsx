import { Suspense } from "react";
import { AuthForm } from "@/components/features/auth/AuthForm";

export const metadata = { title: "Log in — SiteOps QA" };

export default function LoginPage() {
  return (
    <Suspense>
      <AuthForm mode="login" />
    </Suspense>
  );
}
