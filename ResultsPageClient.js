"use client";
import { useEffect, useMemo, useState } from "react";
import Nav from "@/components/Nav";
import Avatar from "@/components/Avatar";
import { fmtInt } from "@/lib/clientUtils";
import { TIERS, TIER_COLOR, fmtAvg, compareByVotes, compareByAvg } from "@/lib/scoring";

const MODES = {
  votes: { field: "tierByVotes", cmp: compareByVotes, label: "Por tier mais votado" },
  avg: { field: "tierByAvg", cmp: compareByAvg, label: "Por média" },
};

export default function ResultsPageClient({ slug, ranking }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState("votes");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/rankings/${encodeURIComponent(slug)}/results`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const { field: tierField, cmp } = MODES[mode];

  const byTier = useMemo(() => {
    const m = {};
    TIERS.forEach((t) => (m[t] = []));
    if (data?.stats) {
      data.stats.forEach((row) => {
        const t = row[tierField];
        if (t) m[t].push(row);
      });
      TIERS.forEach((t) => m[t].sort(cmp));
    }
    return m;
  }, [data, tierField, cmp]);

  const noVotes = useMemo(() => (data?.stats || []).filter((r) => !r.count), [data]);

  if (loading) {
    return (
      <>
        <Nav activePage="resultados" ranking={ranking} isAdmin />
        <div className="center-loading">Carregando…</div>
      </>
    );
  }

  if (!data || data.error) {
    return (
      <>
        <Nav activePage="resultados" ranking={ranking} isAdmin />
        <div className="page container">
          <div className="card" style={{ textAlign: "center", padding: 40 }}>
            <p style={{ color: "var(--text-dim)" }}>{data?.error || "Não foi possível carregar os resultados."}</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Nav activePage="resultados" ranking={ranking} isAdmin />
      <div className="page container">
        <div className="eyebrow">RESULTADOS</div>
        <h1 className="h1">RANKING DA COMUNIDADE</h1>
        <p className="subtitle">{data.ranking.name}</p>
        <div className="total-line">
          Total de votos da comunidade: <b className="tabular">{fmtInt(data.totalVotes)}</b> · Participantes:{" "}
          <b className="tabular">{fmtInt(data.totalParticipants)}</b>
        </div>

        <div className="mode-toggle">
          {Object.entries(MODES).map(([key, m]) => (
            <button
              key={key}
              className={`btn btn-sm ${mode === key ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setMode(key)}
            >
              {m.label}
            </button>
          ))}
        </div>

        {TIERS.map((t) => (
          <div className="result-tier-row" key={t}>
            <div className="tier-label" style={{ background: TIER_COLOR[t] }}>
              {t}
            </div>
            <div className="result-list">
              {byTier[t].length === 0 && <div className="result-list-empty">Ninguém por aqui ainda</div>}
              {byTier[t].map((row, i) => (
                <div
                  className="result-item"
                  key={row.streamer.id}
                  onClick={() => setSelected(row)}
                >
                  <span className="result-rank">{i + 1}</span>
                  <Avatar streamer={row.streamer} size={36} />
                  <span className="result-name">{row.streamer.nickname}</span>
                  <span className="result-votes">
                    {mode === "votes"
                      ? `${fmtInt(row.tierVotes)}/${fmtInt(row.count)} voto${row.count !== 1 ? "s" : ""} no tier`
                      : `${fmtInt(row.count)} voto${row.count !== 1 ? "s" : ""}`}
                  </span>
                  <span className="result-avg tabular">{fmtAvg(row.avg)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {noVotes.length > 0 && (
          <div className="novotes-section">
            <div className="pool-title">Ainda sem votos</div>
            <div className="novotes-list">
              {noVotes.map((row) => (
                <div className="chip" key={row.streamer.id} style={{ cursor: "default" }}>
                  <Avatar streamer={row.streamer} size={30} />
                  <span className="chip-name">{row.streamer.nickname}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.participants?.length > 0 && (
          <>
            <div className="section-title">Participantes</div>
            {data.participants.map((p) => (
              <div className="streamer-row" key={p.voter_id}>
                <div className="info">
                  <div className="nm">{p.name || "(sem nome)"}</div>
                  <div className="meta">{p.email || "—"}</div>
                </div>
                <span className="badge">
                  {p.vote_count} voto{p.vote_count !== 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </>
        )}
      </div>

      {selected && <StreamerModal row={selected} mode={mode} onClose={() => setSelected(null)} />}
    </>
  );
}

function StreamerModal({ row, mode, onClose }) {
  const { streamer, avg, count, dist, tierVotes } = row;
  const tier = mode === "avg" ? row.tierByAvg : row.tierByVotes;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="btn btn-ghost btn-sm modal-close" onClick={onClose}>
          ✕
        </button>
        <div className="modal-head">
          <Avatar streamer={streamer} size={76} className="modal-avatar" />
          <div className="modal-name">{streamer.nickname}</div>
          {tier ? (
            <span className="modal-tier-badge" style={{ background: TIER_COLOR[tier] }}>
              Tier atual: {tier}
            </span>
          ) : (
            <span className="badge">Sem votos ainda</span>
          )}
        </div>
        <div className="modal-stats">
          {mode === "votes" && (
            <div className="modal-stat">
              <b className="tabular">{count ? tierVotes : "—"}</b>
              <span>Votos no tier</span>
            </div>
          )}
          <div className="modal-stat">
            <b className="tabular">{count}</b>
            <span>Votos totais</span>
          </div>
          <div className="modal-stat">
            <b className="tabular">{count ? fmtAvg(avg) : "—"}</b>
            <span>Média</span>
          </div>
        </div>
        {count > 0 &&
          TIERS.map((t) => (
            <div className="dist-row" key={t}>
              <span className="dist-tier" style={{ color: TIER_COLOR[t] }}>
                {t}
              </span>
              <div className="dist-bar-track">
                <div className="dist-bar-fill" style={{ width: `${dist[t]}%`, background: TIER_COLOR[t] }} />
              </div>
              <span className="dist-pct tabular">{Math.round(dist[t])}%</span>
            </div>
          ))}
      </div>
    </div>
  );
}
