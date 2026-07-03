import { Card } from "@/components/ui/card";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-4">
      <p className="text-lg font-semibold tracking-tight text-on-surface">
        SiteOps <span className="text-primary">QA</span>
      </p>
      <Card className="w-full max-w-sm">{children}</Card>
    </main>
  );
}
