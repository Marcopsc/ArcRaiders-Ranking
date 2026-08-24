import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { VOTER_COOKIE_NAME } from "@/lib/auth";
import {
  getRankingBySlug,
  getRankingStreamers,
  getVotesForVoterInRanking,
} from "@/lib/repo";

export async function GET(_req, { params }) {
  const { slug } = await params;
  const ranking = await getRankingBySlug(slug);
  if (!ranking) {
    return NextResponse.json({ error: "Votação não encontrada." }, { status: 404 });
  }
  const streamers = await getRankingStreamers(ranking.id);

  const store = await cookies();
  const voterId = store.get(VOTER_COOKIE_NAME)?.value;
  let myVotes = {};
  if (voterId) {
    const votes = await getVotesForVoterInRanking(ranking.id, voterId);
    votes.forEach((v) => {
      myVotes[v.streamer_id] = v.tier;
    });
  }

  return NextResponse.json({
    ranking: {
      id: ranking.id,
      slug: ranking.slug,
      name: ranking.name,
      description: ranking.description,
      status: ranking.status,
    },
    streamers: streamers.map((s) => ({
      id: s.id,
      nickname: s.nickname,
      name: s.name,
      avatarUrl: s.avatar_url,
      platform: s.platform,
    })),
    myVotes,
  });
}
