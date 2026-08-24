import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/requireAdmin";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { getAdminPasswordHash, setAdminPasswordHash } from "@/lib/repo";

export async function POST(req) {
  const isAdmin = await checkAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Não autorizado." }, { status: 403 });

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }
  const current = String(body?.current || "");
  const next1 = String(body?.next1 || "");
  const next2 = String(body?.next2 || "");

  const hash = await getAdminPasswordHash();
  const ok = hash ? await verifyPassword(current, hash) : false;
  if (!ok) return NextResponse.json({ error: "Senha atual incorreta." }, { status: 401 });
  if (next1.length < 4) {
    return NextResponse.json({ error: "A nova senha deve ter ao menos 4 caracteres." }, { status: 400 });
  }
  if (next1 !== next2) {
    return NextResponse.json({ error: "As novas senhas não coincidem." }, { status: 400 });
  }
  const newHash = await hashPassword(next1);
  await setAdminPasswordHash(newHash);
  return NextResponse.json({ ok: true });
}
