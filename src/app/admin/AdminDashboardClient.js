"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import Avatar from "@/components/Avatar";
import ToastHost from "@/components/ToastHost";
import ConfirmModal from "@/components/ConfirmModal";
import StreamerForm from "@/components/StreamerForm";
import { useToasts } from "@/lib/useToasts";
import { fmtInt } from "@/lib/clientUtils";
import { TIERS, TIER_COLOR, fmtAvg, compareByVotes, compareByAvg } from "@/lib/scoring";

const RESULT_MODES = {
  votes: { field: "tierByVotes", cmp: compareByVotes, label: "Por tier mais votado" },
  avg: { field: "tierByAvg", cmp: compareByAvg, label: "Por média" },
};

async function jsonFetch(url, opts) {
  const res = await fetch(url, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts?.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Algo deu errado.");
  return data;
}

export default function AdminDashboardClient() {
  const router = useRouter();
  const { toasts, showToast } = useToasts();

  const [rankings, setRankings] = useState([]);
  const [activeRankingId, setActiveRankingId] = useState(null);
  const [selectedRankingId, setSelectedRankingId] = useState(null);
  const [streamers, setStreamers] = useState([]);
  const [results, setResults] = useState(null);

  const [loading, setLoading] = useState(true);
  const [passwordFormOpen, setPasswordFormOpen] = useState(false);
  const [newRankingFormOpen, setNewRankingFormOpen] = useState(false);
  const [streamerForm, setStreamerForm] = useState(null); // {mode, streamer}
  const [confirm, setConfirm] = useState(null); // {title, body, confirmLabel, danger, onYes}
  const [busy, setBusy] = useState(false);
  const [resultsMode, setResultsMode] = useState("votes");
  const [selectedVoter, setSelectedVoter] = useState(null);

  const selectedRanking = useMemo(
    () => rankings.find((r) => r.id === selectedRankingId) || null,
    [rankings, selectedRankingId]
  );

  const loadRankings = useCallback(async () => {
    const data = await jsonFetch("/api/admin/rankings");
    setRankings(data.rankings);
    setActiveRankingId(data.activeRankingId);
    return data;
  }, []);

  const loadStreamers = useCallback(async (rankingId) => {
    const qs = rankingId ? `?rankingId=${encodeURIComponent(rankingId)}` : "";
    const data = await jsonFetch(`/api/admin/streamers${qs}`);
    setStreamers(data.streamers);
  }, []);

  const loadResults = useCallback(async (slug) => {
    if (!slug) {
      setResults(null);
      return;
    }
    const data = await jsonFetch(`/api/rankings/${encodeURIComponent(slug)}/results`);
    setResults(data);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await loadRankings();
        const firstId = data.activeRankingId || data.rankings[0]?.id || null;
        setSelectedRankingId(firstId);
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedRankingId) return;
    loadStreamers(selectedRankingId).catch((err) => showToast(err.message, "error"));
    loadResults(selectedRanking?.slug).catch((err) => showToast(err.message, "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRankingId, selectedRanking?.slug]);

  async function refresh() {
    await loadRankings();
    if (selectedRankingId) {
      await loadStreamers(selectedRankingId);
      const r = rankings.find((x) => x.id === selectedRankingId);
      await loadResults(r?.slug || selectedRanking?.slug);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.refresh();
  }

  async function handleTogglePassword() {
    setPasswordFormOpen((v) => !v);
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const current = fd.get("current");
    const next1 = fd.get("next1");
    const next2 = fd.get("next2");
    setBusy(true);
    try {
      await jsonFetch("/api/admin/change-password", {
        method: "POST",
        body: JSON.stringify({ current, next1, next2 }),
      });
      showToast("Senha atualizada.");
      setPasswordFormOpen(false);
      e.target.reset();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateRanking(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const name = fd.get("name");
    if (!String(name || "").trim()) return;
    setBusy(true);
    try {
      const { ranking } = await jsonFetch("/api/admin/rankings", {
        method: "POST",
        body: JSON.stringify({
          name,
          description: fd.get("description"),
          includeAll: fd.get("includeAll") === "on",
          makeActive: fd.get("makeActive") === "on",
        }),
      });
      showToast("Votação criada.");
      setNewRankingFormOpen(false);
      await loadRankings();
      setSelectedRankingId(ranking.id);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleStatus() {
    if (!selectedRanking) return;
    const nextStatus = selectedRanking.status === "open" ? "closed" : "open";
    setBusy(true);
    try {
      await jsonFetch(`/api/admin/rankings/${selectedRanking.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      showToast("Status atualizado.");
      await loadRankings();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleSetActive() {
    if (!selectedRanking) return;
    setBusy(true);
    try {
      await jsonFetch(`/api/admin/rankings/${selectedRanking.id}`, {
        method: "PATCH",
        body: JSON.stringify({ makeActive: true }),
      });
      showToast("Votação principal atualizada.");
      await loadRankings();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setBusy(false);
    }
  }

  function handleResetVotes() {
    if (!selectedRanking) return;
    setConfirm({
      title: "Zerar votação?",
      body: "Todos os votos desta votação serão apagados permanentemente. Essa ação não pode ser desfeita.",
      confirmLabel: "Zerar votos",
      danger: true,
      onYes: async () => {
        setBusy(true);
        try {
          await jsonFetch(`/api/admin/rankings/${selectedRanking.id}/reset`, { method: "POST" });
          showToast("Votação zerada.");
          await loadRankings();
          await loadResults(selectedRanking.slug);
        } catch (err) {
          showToast(err.message, "error");
        } finally {
          setBusy(false);
        }
      },
    });
  }

  async function handleCopy(text, label) {
    try {
      await navigator.clipboard.writeText(text);
      showToast(label || "Copiado!");
    } catch {
      showToast(text);
    }
  }

  async function handleSaveStreamer(fields) {
    setBusy(true);
    try {
      if (streamerForm.mode === "edit") {
        await jsonFetch(`/api/admin/streamers/${streamerForm.streamer.id}`, {
          method: "PATCH",
          body: JSON.stringify(fields),
        });
        showToast("Streamer atualizado.");
      } else {
        await jsonFetch("/api/admin/streamers", {
          method: "POST",
          body: JSON.stringify({ ...fields, addToRankingId: selectedRankingId }),
        });
        showToast("Streamer adicionado.");
      }
      setStreamerForm(null);
      await loadStreamers(selectedRankingId);
      await loadResults(selectedRanking?.slug);
      await loadRankings();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setBusy(false);
    }
  }

  function handleDeleteStreamer(streamer) {
    setConfirm({
      title: `Excluir ${streamer.nickname}?`,
      body: "O streamer será removido do cadastro e de todas as votações. Essa ação não pode ser desfeita.",
      confirmLabel: "Excluir",
      danger: true,
      onYes: async () => {
        setBusy(true);
        try {
          await jsonFetch(`/api/admin/streamers/${streamer.id}`, { method: "DELETE" });
          showToast("Streamer excluído.");
          await loadStreamers(selectedRankingId);
          await loadResults(selectedRanking?.slug);
        } catch (err) {
          showToast(err.message, "error");
        } finally {
          setBusy(false);
        }
      },
    });
  }

  async function handleToggleMembership(streamer, included) {
    if (!selectedRankingId) return;
    try {
      await jsonFetch(`/api/admin/rankings/${selectedRankingId}/streamers/${streamer.id}`, {
        method: "PUT",
        body: JSON.stringify({ included }),
      });
      showToast(included ? "Streamer incluído na votação." : "Streamer removido da votação.");
      await loadStreamers(selectedRankingId);
      await loadResults(selectedRanking?.slug);
      await loadRankings();
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  if (loading) {
    return (
      <>
        <Nav activePage="admin" ranking={null} isAdmin />
        <div className="center-loading">Carregando…</div>
      </>
    );
  }

  const publicUrl = selectedRanking
    ? typeof window !== "undefined"
      ? `${window.location.origin}/ranking/${selectedRanking.slug}`
      : `/ranking/${selectedRanking.slug}`
    : "";

  const { field: resultsTierField, cmp: resultsCmp } = RESULT_MODES[resultsMode];
  const byTier = { };
  TIERS.forEach(
    (t) =>
      (byTier[t] = (results?.stats || []).filter((r) => r[resultsTierField] === t).sort(resultsCmp))
  );

  return (
    <>
      <Nav activePage="admin" ranking={null} isAdmin />
      <div className="page container">
        <div className="admin-header">
          <div>
            <div className="eyebrow">PAINEL ADMINISTRATIVO</div>
            <h1 className="h1" style={{ fontSize: 26, marginBottom: 0 }}>
              Gerenciar votação
            </h1>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-sm" onClick={handleTogglePassword}>
              Trocar senha
            </button>
            <button className="btn btn-sm" onClick={handleLogout}>
              Sair
            </button>
          </div>
        </div>

        {passwordFormOpen && (
          <div className="card" style={{ marginBottom: 20 }}>
            <form onSubmit={handleChangePassword}>
              <div className="field">
                <label>Senha atual</label>
                <input type="password" name="current" required />
              </div>
              <div className="field">
                <label>Nova senha</label>
                <input type="password" name="next1" required minLength={4} />
              </div>
              <div className="field">
                <label>Confirmar nova senha</label>
                <input type="password" name="next2" required minLength={4} />
              </div>
              <div className="form-actions">
                <button className="btn btn-block" type="button" onClick={() => setPasswordFormOpen(false)}>
                  Cancelar
                </button>
                <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
                  Salvar nova senha
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="ranking-select-row">
          {rankings.map((r) => (
            <button
              key={r.id}
              className={`btn btn-sm ${r.id === selectedRankingId ? "btn-primary" : ""}`}
              onClick={() => setSelectedRankingId(r.id)}
            >
              {r.name}
              {r.id === activeRankingId ? " ★" : ""}
            </button>
          ))}
          <button className="btn btn-sm" onClick={() => setNewRankingFormOpen((v) => !v)}>
            + Nova temporada
          </button>
        </div>

        {newRankingFormOpen && (
          <div className="card" style={{ marginBottom: 20 }}>
            <form onSubmit={handleCreateRanking}>
              <div className="field">
                <label>Nome da votação</label>
                <input type="text" name="name" placeholder="Ex: Ranking PvP ARC Raiders BR — Temporada 2" required />
              </div>
              <div className="field">
                <label>Descrição (opcional)</label>
                <textarea name="description" rows={2} />
              </div>
              <label className="checkbox-row" style={{ marginBottom: 6 }}>
                <input type="checkbox" name="includeAll" defaultChecked />
                Incluir todos os streamers ativos
              </label>
              <label className="checkbox-row" style={{ marginBottom: 16 }}>
                <input type="checkbox" name="makeActive" defaultChecked />
                Tornar esta a votação principal (link padrão)
              </label>
              <div className="form-actions">
                <button className="btn btn-block" type="button" onClick={() => setNewRankingFormOpen(false)}>
                  Cancelar
                </button>
                <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
                  Criar votação
                </button>
              </div>
            </form>
          </div>
        )}

        {selectedRanking ? (
          <>
            <div className="card" style={{ marginBottom: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 800, fontFamily: "var(--font-display)", fontSize: 16, marginBottom: 4 }}>
                    {selectedRanking.name}
                  </div>
                  <div style={{ color: "var(--text-dim)", fontSize: 13 }}>{selectedRanking.description}</div>
                </div>
                <span className={`status-pill ${selectedRanking.status === "open" ? "status-open" : "status-closed"}`}>
                  {selectedRanking.status === "open" ? "🟢 Votação aberta" : "🔴 Votação fechada"}
                </span>
              </div>
              <div className="stat-grid" style={{ marginTop: 18 }}>
                <div className="stat-box">
                  <b className="tabular">{fmtInt(selectedRanking.totalParticipants)}</b>
                  <span>Participantes</span>
                </div>
                <div className="stat-box">
                  <b className="tabular">{fmtInt(selectedRanking.totalVotes)}</b>
                  <span>Avaliações</span>
                </div>
                <div className="stat-box">
                  <b className="tabular">{streamers.filter((s) => s.inRanking).length}</b>
                  <span>Streamers na votação</span>
                </div>
              </div>
              <div className="copy-row" style={{ marginBottom: 14 }}>
                <code>{publicUrl}</code>
                <button className="btn btn-sm" onClick={() => handleCopy(publicUrl, "Link copiado!")}>
                  Copiar link
                </button>
                <button
                  className="btn btn-sm"
                  onClick={() =>
                    handleCopy(`Vote aqui no Ranking de Streamers PvP BR 👉 ${publicUrl}`, "Convite copiado!")
                  }
                >
                  Copiar convite
                </button>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn btn-sm" onClick={handleToggleStatus} disabled={busy}>
                  {selectedRanking.status === "open" ? "Fechar votação" : "Abrir votação"}
                </button>
                <button className="btn btn-sm" onClick={handleSetActive} disabled={busy || selectedRanking.id === activeRankingId}>
                  Tornar votação principal
                </button>
                <button className="btn btn-sm btn-danger" onClick={handleResetVotes} disabled={busy}>
                  Zerar votação
                </button>
              </div>
            </div>

            <div className="section-title">
              Streamers cadastrados
              <button className="btn btn-sm btn-primary" onClick={() => setStreamerForm({ mode: "add" })}>
                + Adicionar streamer
              </button>
            </div>

            {streamerForm && (
              <StreamerForm
                mode={streamerForm.mode}
                streamer={streamerForm.streamer}
                onSave={handleSaveStreamer}
                onCancel={() => setStreamerForm(null)}
                saving={busy}
              />
            )}

            {streamers.length === 0 && <div className="empty-note">Nenhum streamer cadastrado ainda.</div>}
            {streamers.map((s) => (
              <div className="streamer-row" key={s.id}>
                <Avatar streamer={{ nickname: s.nickname, avatarUrl: s.avatar_url }} size={38} />
                <div className="info">
                  <div className="nm">
                    {s.nickname}
                    {s.name ? <span style={{ color: "var(--text-faint)", fontWeight: 500 }}> · {s.name}</span> : null}
                  </div>
                  <div className="meta">{s.active ? "ativo" : "inativo"}</div>
                </div>
                <label className="switch" title="Participa desta votação">
                  <input
                    type="checkbox"
                    checked={!!s.inRanking}
                    onChange={(e) => handleToggleMembership(s, e.target.checked)}
                  />
                  <span className="switch-track" />
                  <span className="switch-thumb" />
                </label>
                <div className="actions">
                  <button className="btn btn-sm" onClick={() => setStreamerForm({ mode: "edit", streamer: s })}>
                    Editar
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDeleteStreamer(s)}>
                    Excluir
                  </button>
                </div>
              </div>
            ))}

            <div className="section-title">Ranking em tempo real</div>
            <div className="mode-toggle">
              {Object.entries(RESULT_MODES).map(([key, m]) => (
                <button
                  key={key}
                  className={`btn btn-sm ${resultsMode === key ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setResultsMode(key)}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {TIERS.map((t) => {
              const list = byTier[t];
              if (!list || list.length === 0) return null;
              return (
                <div className="result-tier-row" key={t}>
                  <div className="tier-label" style={{ background: TIER_COLOR[t] }}>
                    {t}
                  </div>
                  <div className="result-list">
                    {list.map((row, i) => (
                      <div className="result-item" style={{ cursor: "default" }} key={row.streamer.id}>
                        <span className="result-rank">{i + 1}</span>
                        <Avatar streamer={{ nickname: row.streamer.nickname, avatarUrl: row.streamer.avatarUrl }} size={32} />
                        <span className="result-name">{row.streamer.nickname}</span>
                        <span className="result-votes">
                          {resultsMode === "votes"
                            ? `${fmtInt(row.tierVotes)}/${fmtInt(row.count)} votos no tier`
                            : `${fmtInt(row.count)} votos`}
                        </span>
                        <span className="result-avg tabular">{fmtAvg(row.avg)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            <div className="section-title">Participantes</div>
            {(!results?.participants || results.participants.length === 0) && (
              <div className="empty-note">Ninguém votou ainda.</div>
            )}
            {results?.participants?.map((p) => (
              <div
                className="streamer-row"
                key={p.voter_id}
                style={{ cursor: "pointer" }}
                onClick={() => setSelectedVoter(p)}
              >
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
        ) : (
          <div className="empty-note">Crie uma votação para começar.</div>
        )}
      </div>

      {selectedVoter && <VoterModal voter={selectedVoter} onClose={() => setSelectedVoter(null)} />}

      {confirm && (
        <ConfirmModal
          title={confirm.title}
          body={confirm.body}
          confirmLabel={confirm.confirmLabel}
          danger={confirm.danger}
          onCancel={() => setConfirm(null)}
          onConfirm={async () => {
            const fn = confirm.onYes;
            setConfirm(null);
            if (fn) await fn();
          }}
        />
      )}
      <ToastHost toasts={toasts} />
    </>
  );
}

function VoterModal({ voter, onClose }) {
  const votes = [...(voter.votes || [])].sort((a, b) => {
    const ia = TIERS.indexOf(a.tier);
    const ib = TIERS.indexOf(b.tier);
    if (ia !== ib) return ia - ib;
    return (a.nickname || "").localeCompare(b.nickname || "", "pt-BR");
  });
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="btn btn-ghost btn-sm modal-close" onClick={onClose}>
          ✕
        </button>
        <div className="modal-head">
          <div className="modal-name">{voter.name || "(sem nome)"}</div>
          <span className="badge">{voter.email || "—"}</span>
        </div>
        <div className="modal-stats">
          <div className="modal-stat">
            <b className="tabular">{votes.length}</b>
            <span>Votos dados</span>
          </div>
        </div>
        {votes.length === 0 && <div className="empty-note">Nenhum voto registrado.</div>}
        {votes.map((v) => (
          <div className="dist-row" key={v.streamerId}>
            <span className="dist-tier" style={{ color: TIER_COLOR[v.tier] }}>
              {v.tier}
            </span>
            <span style={{ flex: 1 }}>{v.nickname}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
