import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { isValidTier, isValidEmail } from "@/lib/scoring";
import { VOTER_COOKIE_NAME } from "@/lib/auth";
import {
  getRankingBySlug,
  getRankingStreamerIds,
  upsertVoter,
  submitVotes,
} from "@/lib/repo";

const VOTER_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const { slug, votes, voterName, voterEmail } = body || {};
  if (!slug || typeof votes !== "object" || votes === null) {
    return NextResponse.json({ error: "Dados de votação inválidos." }, { status: 400 });
  }
  const name = String(voterName || "").trim();
  const email = String(voterEmail || "").trim();
  if (!name) {
    return NextResponse.json({ error: "Informe seu nome ou nick para votar." }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Informe um e-mail válido para votar." }, { status: 400 });
  }

  const ranking = await getRankingBySlug(slug);
  if (!ranking) {
    return NextResponse.json({ error: "Votação não encontrada." }, { status: 404 });
  }
  if (ranking.status !== "open") {
    return NextResponse.json({ error: "Essa votação está fechada no momento." }, { status: 409 });
  }

  const validStreamerIds = new Set(await getRankingStreamerIds(ranking.id));
  const tierMap = {};
  for (const [streamerId, tier] of Object.entries(votes)) {
    if (!validStreamerIds.has(streamerId)) continue;
    if (!isValidTier(tier)) continue;
    tierMap[streamerId] = tier;
  }
  if (Object.keys(tierMap).length === 0) {
    return NextResponse.json(
      { error: "Classifique pelo menos um streamer antes de enviar." },
      { status: 400 }
    );
  }

  const store = await cookies();
  let voterId = store.get(VOTER_COOKIE_NAME)?.value;
  const isNewVoter = !voterId;
  if (!voterId) {
    voterId = crypto.randomUUID();
  }

  await upsertVoter(voterId, name, email);
  await submitVotes(ranking.id, voterId, tierMap);

  const res = NextResponse.json({ ok: true, votesRecorded: Object.keys(tierMap).length });
  if (isNewVoter) {
    res.cookies.set(VOTER_COOKIE_NAME, voterId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: VOTER_COOKIE_MAX_AGE,
    });
  }
  return res;
}
