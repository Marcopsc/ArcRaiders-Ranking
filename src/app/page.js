import { redirect } from "next/navigation";
import { getActiveRankingId, getRankingById, listRankings } from "@/lib/repo";

// The active ranking can change at any time from the admin panel (creating a
// new season, or "Tornar votação principal"). Force this page to be
// evaluated per-request instead of baked in at build time, or visitors
// hitting the bare domain would keep landing on whatever ranking was active
// when the app was last deployed.
export const dynamic = "force-dynamic";

export default async function Home() {
  const activeId = await getActiveRankingId();
  let ranking = activeId ? await getRankingById(activeId) : null;
  if (!ranking) {
    const all = await listRankings();
    ranking = all[0];
  }
  if (ranking) {
    redirect(`/ranking/${ranking.slug}`);
  }
  return (
    <div className="page container">
      <div className="card" style={{ textAlign: "center", padding: 40 }}>
        <p style={{ color: "var(--text-dim)" }}>Nenhuma votação configurada ainda.</p>
      </div>
    </div>
  );
}
