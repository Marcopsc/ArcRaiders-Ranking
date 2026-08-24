import crypto from "crypto";
import bcrypt from "bcryptjs";

const ADMIN_COOKIE = "arc_admin_session";
const VOTER_COOKIE = "arc_voter_id";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET não configurada (ou muito curta) no ambiente.");
  }
  return secret;
}

function sign(payload) {
  const secret = getSecret();
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${sig}`;
}

function verify(token) {
  try {
    const secret = getSecret();
    const [data, sig] = String(token || "").split(".");
    if (!data || !sig) return null;
    const expected = crypto.createHmac("sha256", secret).update(data).digest("base64url");
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;
    const payload = JSON.parse(Buffer.from(data, "base64url").toString());
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function createAdminSessionCookie() {
  const token = sign({ role: "admin", exp: Date.now() + SESSION_TTL_MS });
  return {
    name: ADMIN_COOKIE,
    value: token,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_TTL_MS / 1000,
    },
  };
}

export function isAdminToken(token) {
  const payload = verify(token);
  return !!payload && payload.role === "admin";
}

export const ADMIN_COOKIE_NAME = ADMIN_COOKIE;
export const VOTER_COOKIE_NAME = VOTER_COOKIE;

export async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}
export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

export function newId(prefix) {
  return (prefix ? prefix + "_" : "") + crypto.randomUUID();
}
