import Link from "next/link";
import Nav from "@/components/Nav";
import { checkAdmin } from "@/lib/requireAdmin";
import { getRankingBySlug } from "@/lib/repo";
import ResultsPageClient from "./ResultsPageClient";

export default async function Page({ params }) {
  const { slug } = await params;
  const ranking = await getRankingBySlug(slug);

  if (!ranking) {
    return (
      <>
        <Nav activePage="resultados" ranking={null} isAdmin={false} />
        <div className="page container">
          <div className="card" style={{ textAlign: "center", padding: 40 }}>
            <p style={{ color: "var(--text-dim)" }}>Essa votação não foi encontrada.</p>
          </div>
        </div>
      </>
    );
  }

  const isAdmin = await checkAdmin();
  if (!isAdmin) {
    return (
      <>
        <Nav activePage="votar" ranking={ranking} isAdmin={false} />
        <div className="page container">
          <div className="card" style={{ textAlign: "center", padding: "44px 24px" }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🔒</div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 18, marginBottom: 8 }}>
              Resultados reservados
            </div>
            <p style={{ color: "var(--text-dim)", fontSize: 14, maxWidth: "38ch", margin: "0 auto 22px" }}>
              O ranking da comunidade fica disponível apenas para a administração desta votação.
            </p>
            <Link className="btn btn-primary" href={`/ranking/${ranking.slug}`}>
              Voltar para a votação
            </Link>
          </div>
        </div>
      </>
    );
  }

  return <ResultsPageClient slug={slug} ranking={ranking} />;
}
