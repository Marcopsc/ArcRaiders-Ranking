import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/requireAdmin";
import { resetRankingVotes, getRankingById } from "@/lib/repo";

export async function POST(_req, { params }) {
  const isAdmin = await checkAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  const { id } = await params;
  const ranking = await getRankingById(id);
  if (!ranking) return NextResponse.json({ error: "Votação não encontrada." }, { status: 404 });
  await resetRankingVotes(id);
  return NextResponse.json({ ok: true });
}
