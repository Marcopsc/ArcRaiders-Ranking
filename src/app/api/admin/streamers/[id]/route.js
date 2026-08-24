import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/requireAdmin";
import { updateStreamer, deleteStreamer } from "@/lib/repo";

export async function PATCH(req, { params }) {
  const isAdmin = await checkAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  const { id } = await params;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }
  const fields = {};
  if (body.nickname !== undefined) {
    const n = String(body.nickname).trim();
    if (!n) return NextResponse.json({ error: "Nick não pode ser vazio." }, { status: 400 });
    fields.nickname = n;
  }
  if (body.name !== undefined) fields.name = String(body.name).trim();
  if (body.avatarUrl !== undefined) fields.avatarUrl = String(body.avatarUrl);
  if (body.platform !== undefined) fields.platform = String(body.platform);
  if (body.channelUrl !== undefined) fields.channelUrl = String(body.channelUrl).trim();
  if (body.active !== undefined) fields.active = !!body.active;

  const streamer = await updateStreamer(id, fields);
  return NextResponse.json({ streamer });
}

export async function DELETE(_req, { params }) {
  const isAdmin = await checkAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  const { id } = await params;
  await deleteStreamer(id);
  return NextResponse.json({ ok: true });
}
