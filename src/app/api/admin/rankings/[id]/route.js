import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/requireAdmin";
import { setRankingStatus, setActiveRankingId, getRankingById } from "@/lib/repo";

export async function PATCH(req, { params }) {
  const isAdmin = await checkAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  const { id } = await params;
  const ranking = await getRankingById(id);
  if (!ranking) return NextResponse.json({ error: "Votação não encontrada." }, { status: 404 });

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  if (body.status && ["open", "closed"].includes(body.status)) {
    await setRankingStatus(id, body.status);
  }
  if (body.makeActive) {
    await setActiveRankingId(id);
  }

  const updated = await getRankingById(id);
  return NextResponse.json({ ranking: updated });
}
