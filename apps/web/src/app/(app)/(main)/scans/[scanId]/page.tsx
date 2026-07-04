import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ScanResults } from "@/components/features/scans/ScanResults";

export const metadata = { title: "Scan results — SiteOps QA" };

export default async function ScanPage({
  params,
}: {
  params: Promise<{ scanId: string }>;
}) {
  const { scanId } = await params;
  const supabase = await createClient();

  const { data: scan } = await supabase
    .from("scans")
    .select("id")
    .eq("id", scanId)
    .maybeSingle();
  if (!scan) notFound();

  return <ScanResults scanId={scanId} />;
}
