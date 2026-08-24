import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, isAdminToken } from "./auth";

export async function checkAdmin() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE_NAME)?.value;
  return isAdminToken(token);
}
