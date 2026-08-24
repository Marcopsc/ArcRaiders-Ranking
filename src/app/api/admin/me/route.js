import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/requireAdmin";

export async function GET() {
  const isAdmin = await checkAdmin();
  return NextResponse.json({ authed: isAdmin });
}
