"use client";
import Link from "next/link";

export default function Nav({ activePage, ranking, isAdmin }) {
  return (
    <div className="nav">
      <div className="nav-inner">
        <div className="brand">
          <span className="brand-dot" />
          ARC RANKING
        </div>
        <div className="nav-links">
          {ranking && (
            <Link
              className={`nav-link ${activePage === "votar" ? "active" : ""}`}
              href={`/ranking/${ranking.slug}`}
            >
              Votar
            </Link>
          )}
          {ranking && isAdmin && (
            <Link
              className={`nav-link ${activePage === "resultados" ? "active" : ""}`}
              href={`/ranking/${ranking.slug}/resultados`}
            >
              Resultados
            </Link>
          )}
          <Link className={`nav-link ${activePage === "admin" ? "active" : ""}`} href="/admin">
            Admin
          </Link>
        </div>
      </div>
    </div>
  );
}
