"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Nav from "@/components/Nav";
import Avatar from "@/components/Avatar";
import ToastHost from "@/components/ToastHost";
import { useToasts } from "@/lib/useToasts";
import { isValidEmail } from "@/lib/scoring";

const TIERS = ["S+", "S", "A", "B", "C", "D"];
const TIER_SCORE = { "S+": 6, S: 5, A: 4, B: 3, C: 2, D: 1 };
const TIER_COLOR = {
  "S+": "var(--tier-splus)",
  S: "var(--tier-s)",
  A: "var(--tier-a)",
  B: "var(--tier-b)",
  C: "var(--tier-c)",
  D: "var(--tier-d)",
};

export default function VotePageClient({ slug }) {
  const { toasts, showToast } = useToasts();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [ranking, setRanking] = useState(null);
  const [streamers, setStreamers] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);

  const [pendingVotes, setPendingVotes] = useState({});
  const [voterName, setVoterName] = useState("");
  const [voterEmail, setVoterEmail] = useState("");
  const [pickerStreamerId, setPickerStreamerId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [justVoted, setJustVoted] = useState(false);
  const [dragOverZone, setDragOverZone] = useState(null);
  const dragStreamerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/rankings/${encodeURIComponent(slug)}`)
      .then((r) => {
        if (r.status === 404) {
          if (!cancelled) setNotFound(true);
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (cancelled || !data) return;
        setRanking(data.ranking);
        setStreamers(data.streamers);
        setPendingVotes(data.myVotes || {});
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    fetch("/api/admin/me")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setIsAdmin(!!data.authed);
      })
      .catch(() => {});

    try {
      setVoterName(localStorage.getItem("arc_voter_name") || "");
      setVoterEmail(localStorage.getItem("arc_voter_email") || "");
    } catch {}

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const placedIds = useMemo(
    () => Object.keys(pendingVotes).filter((k) => pendingVotes[k]),
    [pendingVotes]
  );
  const unplaced = useMemo(
    () => streamers.filter((s) => !pendingVotes[s.id]),
    [streamers, pendingVotes]
  );
  const byTier = useMemo(() => {
    const m = {};
    TIERS.forEach((t) => {
      m[t] = streamers.filter((s) => pendingVotes[s.id] === t);
    });
    return m;
  }, [streamers, pendingVotes]);

  function placeTier(streamerId, tier) {
    setPendingVotes((prev) => {
      const next = { ...prev };
      if (tier) next[streamerId] = tier;
      else delete next[streamerId];
      return next;
    });
    setPickerStreamerId(null);
  }

  function handleDrop(zoneTier) {
    const sid = dragStreamerRef.current;
    dragStreamerRef.current = null;
    setDragOverZone(null);
    if (!sid) return;
    placeTier(sid, zoneTier || "");
  }

  async function handleSubmit() {
    const tierMap = {};
    Object.keys(pendingVotes).forEach((k) => {
      if (pendingVotes[k]) tierMap[k] = pendingVotes[k];
    });
    if (Object.keys(tierMap).length === 0) {
      showToast("Classifique pelo menos um streamer antes de enviar.", "error");
      return;
    }
    const name = voterName.trim();
    const email = voterEmail.trim();
    if (!name) {
      showToast("Informe seu nome ou nick para votar.", "error");
      return;
    }
    if (!isValidEmail(email)) {
      showToast("Informe um e-mail válido para votar.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, votes: tierMap, voterName: name, voterEmail: email }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Não foi possível salvar seu voto agora. Tente novamente.", "error");
        setSubmitting(false);
        return;
      }
      try {
        localStorage.setItem("arc_voter_name", name);
        localStorage.setItem("arc_voter_email", email);
      } catch {}
      setJustVoted(true);
    } catch {
      showToast("Não foi possível conectar ao servidor. Tente novamente.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleShare() {
    const url = typeof window !== "undefined" ? window.location.origin + `/ranking/${slug}` : "";
    const shareText = "Vote aqui no Ranking de Streamers PvP BR";
    if (navigator.share) {
      try {
        await navigator.share({ title: "Ranking de Streamers PvP BR", text: shareText, url });
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(`${shareText} 👉 ${url}`);
        showToast("Link copiado!");
      } catch {
        showToast(url);
      }
    }
  }

  if (loading) {
    return (
      <>
        <Nav activePage="votar" ranking={null} isAdmin={isAdmin} />
        <div className="center-loading">Carregando…</div>
      </>
    );
  }

  if (notFound || !ranking) {
    return (
      <>
        <Nav activePage="votar" ranking={null} isAdmin={isAdmin} />
        <div className="page container">
          <div className="card" style={{ textAlign: "center", padding: 40 }}>
            <p style={{ color: "var(--text-dim)" }}>Essa votação não foi encontrada.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Nav activePage="votar" ranking={ranking} isAdmin={isAdmin} />
      <div className="page container">
        <MetaRow ranking={ranking} />

        {justVoted ? (
          <div className="thanks">
            <div className="thanks-icon">✅</div>
            <h2>Seu ranking foi contabilizado.</h2>
            <p>Obrigado por votar! Você pode ajustar sua classificação a qualquer momento enquanto a votação estiver aberta.</p>
            <div className="thanks-actions">
              <button className="btn btn-primary" onClick={handleShare}>
                COMPARTILHAR
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="eyebrow">RANKING PvP</div>
            <h1 className="h1">RANKING PvP — ARC RAIDERS BR</h1>
            <p className="subtitle">Na sua opinião, em qual Tier cada streamer se encaixa?</p>

            {ranking.status !== "open" ? (
              <div className="closed-banner">
                <span>🔒</span>
                <span>Essa votação está fechada no momento.</span>
              </div>
            ) : (
              <>
                <div className="card" style={{ marginBottom: 26 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 14 }}>
                    Antes de votar, como podemos te chamar?
                  </div>
                  <div className="field-row">
                    <div className="field" style={{ marginBottom: 0 }}>
                      <label>Nome ou nick</label>
                      <input
                        type="text"
                        placeholder="Seu nome ou nick"
                        value={voterName}
                        onChange={(e) => setVoterName(e.target.value)}
                        autoComplete="name"
                      />
                    </div>
                    <div className="field" style={{ marginBottom: 0 }}>
                      <label>E-mail</label>
                      <input
                        type="email"
                        placeholder="voce@email.com"
                        value={voterEmail}
                        onChange={(e) => setVoterEmail(e.target.value)}
                        autoComplete="email"
                      />
                    </div>
                  </div>
                  <div className="field-hint">
                    Usado só para identificar seu voto — não é compartilhado publicamente.
                  </div>
                </div>

                <div className="pool-section">
                  <div className="pool-title">Ainda não classificados</div>
                  <div
                    className={`pool ${dragOverZone === "" ? "drag-over" : ""}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverZone("");
                    }}
                    onDragLeave={() => setDragOverZone((z) => (z === "" ? null : z))}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDrop("");
                    }}
                  >
                    {unplaced.length === 0 && (
                      <div className="pool-empty">Todos os streamers foram classificados. 🎉</div>
                    )}
                    {unplaced.map((s) => (
                      <Chip
                        key={s.id}
                        streamer={s}
                        onOpenPicker={() => setPickerStreamerId(s.id)}
                        onDragStart={() => (dragStreamerRef.current = s.id)}
                      />
                    ))}
                  </div>
                </div>

                <div className="tierlist">
                  {TIERS.map((t) => (
                    <div className="tier-row" key={t}>
                      <div className="tier-label" style={{ background: TIER_COLOR[t] }}>
                        {t}
                        <small>
                          {TIER_SCORE[t]} pt{TIER_SCORE[t] > 1 ? "s" : ""}
                        </small>
                      </div>
                      <div
                        className={`tier-slots ${dragOverZone === t ? "drag-over" : ""}`}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOverZone(t);
                        }}
                        onDragLeave={() => setDragOverZone((z) => (z === t ? null : z))}
                        onDrop={(e) => {
                          e.preventDefault();
                          handleDrop(t);
                        }}
                      >
                        {byTier[t].length === 0 && <div className="tier-slots-empty">Arraste aqui</div>}
                        {byTier[t].map((s) => (
                          <Chip
                            key={s.id}
                            streamer={s}
                            onOpenPicker={() => setPickerStreamerId(s.id)}
                            onDragStart={() => (dragStreamerRef.current = s.id)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="submit-bar">
                  <div className="submit-bar-inner">
                    <span className="submit-count">
                      <b>{placedIds.length}</b> de {streamers.length} streamers classificados
                    </span>
                    <button
                      className="btn btn-primary"
                      disabled={placedIds.length === 0 || submitting}
                      onClick={handleSubmit}
                    >
                      {submitting ? "Enviando..." : "ENVIAR MEU RANKING"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
      <div className="footer-note">Tier list colaborativa da comunidade — não afiliado à Embark Studios.</div>

      {pickerStreamerId && (
        <PickerSheet
          streamer={streamers.find((s) => s.id === pickerStreamerId)}
          currentTier={pendingVotes[pickerStreamerId]}
          onPick={(tier) => placeTier(pickerStreamerId, tier)}
          onClose={() => setPickerStreamerId(null)}
        />
      )}
      <ToastHost toasts={toasts} />
    </>
  );
}

function MetaRow({ ranking }) {
  const cls = ranking.status === "open" ? "status-open" : "status-closed";
  const label = ranking.status === "open" ? "Votação aberta" : "Votação encerrada";
  return (
    <div className="meta-row">
      <span className={`status-pill ${cls}`}>
        <span className="status-dot" />
        {label}
      </span>
      <span style={{ color: "var(--text-faint)", fontSize: 12.5 }}>{ranking.name}</span>
    </div>
  );
}

function Chip({ streamer, onOpenPicker, onDragStart }) {
  return (
    <div
      className="chip"
      draggable
      onDragStart={onDragStart}
      onClick={onOpenPicker}
    >
      <Avatar streamer={streamer} size={30} />
      <span className="chip-name">{streamer.nickname}</span>
    </div>
  );
}

function PickerSheet({ streamer, currentTier, onPick, onClose }) {
  if (!streamer) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <Avatar streamer={streamer} size={42} />
          <div>
            <div className="sheet-title">{streamer.nickname}</div>
            <div className="sheet-sub">Onde você colocaria este streamer?</div>
          </div>
        </div>
        <div className="sheet-tiers">
          {TIERS.map((t) => (
            <button
              key={t}
              className={`sheet-tier-btn ${currentTier === t ? "current" : ""}`}
              style={{ background: TIER_COLOR[t] }}
              onClick={() => onPick(t)}
            >
              {t}
            </button>
          ))}
        </div>
        {currentTier && (
          <button className="btn btn-ghost btn-block" onClick={() => onPick("")}>
            Remover do ranking
          </button>
        )}
        <button className="btn btn-ghost btn-block" style={{ marginTop: 6 }} onClick={onClose}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
