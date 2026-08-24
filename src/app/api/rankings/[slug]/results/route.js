import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/requireAdmin";
import { computeStats } from "@/lib/scoring";
import {
  getRankingBySlug,
  getRankingStreamers,
  getVotesForRanking,
  getParticipantsByVoter,
} from "@/lib/repo";

export async function GET(_req, { params }) {
  const isAdmin = await checkAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
  }
  const { slug } = await params;
  const ranking = await getRankingBySlug(slug);
  if (!ranking) {
    return NextResponse.json({ error: "Votação não encontrada." }, { status: 404 });
  }
  const streamers = await getRankingStreamers(ranking.id);
  const votes = await getVotesForRanking(ranking.id);
  const stats = computeStats(
    streamers.map((s) => ({
      id: s.id,
      nickname: s.nickname,
      name: s.name,
      avatarUrl: s.avatar_url,
      platform: s.platform,
    })),
    votes
  );
  const participants = await getParticipantsByVoter(ranking.id);
  const totalParticipants = new Set(votes.map((v) => v.voter_id)).size;

  return NextResponse.json({
    ranking: {
      id: ranking.id,
      slug: ranking.slug,
      name: ranking.name,
      description: ranking.description,
      status: ranking.status,
    },
    stats,
    totalVotes: votes.length,
    totalParticipants,
    participants,
  });
}
