import { Suspense } from "react";
import { AuthForm } from "@/components/features/auth/AuthForm";

export const metadata = { title: "Reset password — SiteOps QA" };

export default function ResetPage() {
  return (
    <Suspense>
      <AuthForm mode="reset" />
    </Suspense>
  );
}
