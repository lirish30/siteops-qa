import { NextResponse } from "next/server";
import { createOrgSchema } from "@siteops/shared";
import { createClient } from "@/lib/supabase/server";

// POST /api/orgs — first-run org creation (FR-002). One org per user.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createOrgSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { data: org, error } = await supabase.rpc("create_organization", {
    org_name: parsed.data.name,
  });

  if (error) {
    if (error.message.includes("already_has_org")) {
      return NextResponse.json(
        { error: "You already have an organization." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "We couldn't create your organization. Try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ org }, { status: 201 });
}
