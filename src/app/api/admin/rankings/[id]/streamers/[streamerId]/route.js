import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/requireAdmin";
import { setRankingStreamerMembership } from "@/lib/repo";

export async function PUT(req, { params }) {
  const isAdmin = await checkAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  const { id, streamerId } = await params;

  let body;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  await setRankingStreamerMembership(id, streamerId, !!body.included);
  return NextResponse.json({ ok: true });
}
