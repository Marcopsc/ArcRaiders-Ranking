import { NextResponse } from "next/server";
import { createAdminSessionCookie, verifyPassword } from "@/lib/auth";
import { getAdminPasswordHash } from "@/lib/repo";

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }
  const password = String(body?.password || "");
  const hash = await getAdminPasswordHash();
  if (!hash) {
    return NextResponse.json(
      { error: "Nenhuma senha de administrador configurada. Rode o script de setup." },
      { status: 500 }
    );
  }
  const ok = await verifyPassword(password, hash);
  if (!ok) {
    return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
  }
  const cookie = createAdminSessionCookie();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(cookie.name, cookie.value, cookie.options);
  return res;
}
