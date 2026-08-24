import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/requireAdmin";
import {
  listStreamers,
  createStreamer,
  getActiveRankingId,
  setRankingStreamerMembership,
  getRankingStreamerIds,
} from "@/lib/repo";

export async function GET(req) {
  const isAdmin = await checkAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  const streamers = await listStreamers();
  const { searchParams } = new URL(req.url);
  const rankingId = searchParams.get("rankingId");
  let memberIds = null;
  if (rankingId) {
    memberIds = new Set(await getRankingStreamerIds(rankingId));
  }
  const result = memberIds
    ? streamers.map((s) => ({ ...s, inRanking: memberIds.has(s.id) }))
    : streamers;
  return NextResponse.json({ streamers: result });
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
  const nickname = String(body?.nickname || "").trim();
  if (!nickname) return NextResponse.json({ error: "Informe o nick do streamer." }, { status: 400 });

  const streamer = await createStreamer({
    nickname,
    name: String(body?.name || "").trim(),
    avatarUrl: String(body?.avatarUrl || ""),
    platform: String(body?.platform || ""),
    channelUrl: String(body?.channelUrl || "").trim(),
    active: body?.active !== false,
  });

  // if the caller wants it auto-added to a ranking (e.g. the active one), honor that
  if (body?.addToRankingId) {
    await setRankingStreamerMembership(body.addToRankingId, streamer.id, true);
  }

  return NextResponse.json({ streamer });
}
