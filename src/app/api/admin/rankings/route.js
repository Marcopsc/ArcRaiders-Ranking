import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/requireAdmin";
import { newId } from "@/lib/auth";
import {
  listRankings,
  createRanking,
  listStreamers,
  getActiveRankingId,
  setActiveRankingId,
  getVotesForRanking,
} from "@/lib/repo";

function slugify(s) {
  return (
    String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || newId("r")
  );
}

export async function GET() {
  const isAdmin = await checkAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  const rankings = await listRankings();
  const activeRankingId = await getActiveRankingId();
  const withCounts = await Promise.all(
    rankings.map(async (r) => {
      const votes = await getVotesForRanking(r.id);
      return {
        ...r,
        totalVotes: votes.length,
        totalParticipants: new Set(votes.map((v) => v.voter_id)).size,
      };
    })
  );
  return NextResponse.json({ rankings: withCounts, activeRankingId });
}

export async function POST(req) {
  const isAdmin = await checkAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Não autorizado." }, { status: 403 });

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }
  const name = String(body?.name || "").trim();
  if (!name) return NextResponse.json({ error: "Informe o nome da votação." }, { status: 400 });

  const includeAll = body?.includeAll !== false;
  const makeActive = body?.makeActive !== false;

  const allStreamers = includeAll ? await listStreamers() : [];
  const streamerIds = allStreamers.filter((s) => s.active).map((s) => s.id);

  const baseSlug = slugify(name);
  const existing = await listRankings();
  const existingSlugs = new Set(existing.map((r) => r.slug));
  let slug = baseSlug;
  let n = 2;
  while (existingSlugs.has(slug)) {
    slug = `${baseSlug}-${n}`;
    n++;
  }

  const ranking = await createRanking({
    name,
    description: String(body?.description || "").trim(),
    slug,
    streamerIds,
  });

  if (makeActive) {
    await setActiveRankingId(ranking.id);
  }

  return NextResponse.json({ ranking });
}
