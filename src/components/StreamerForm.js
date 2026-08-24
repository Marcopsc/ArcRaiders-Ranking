"use client";
import { useState } from "react";
import { fileToAvatarDataUrl } from "@/lib/clientUtils";

const PLATFORMS = [
  { value: "", label: "—" },
  { value: "twitch", label: "Twitch" },
  { value: "kick", label: "Kick" },
  { value: "youtube", label: "YouTube" },
];

export default function StreamerForm({ mode, streamer, onSave, onCancel, saving }) {
  const [nickname, setNickname] = useState(streamer?.nickname || "");
  const [name, setName] = useState(streamer?.name || "");
  const [platform, setPlatform] = useState(streamer?.platform || "");
  const [channelUrl, setChannelUrl] = useState(streamer?.channel_url || "");
  const [active, setActive] = useState(streamer?.active !== false);
  const [avatarUrl, setAvatarUrl] = useState(streamer?.avatar_url || "");

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      setAvatarUrl(dataUrl);
    } catch {
      // silently ignore — preview just won't update
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!nickname.trim()) return;
    onSave({
      nickname: nickname.trim(),
      name: name.trim(),
      platform,
      channelUrl: channelUrl.trim(),
      active,
      avatarUrl,
    });
  }

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <form onSubmit={handleSubmit}>
        <div className="upload-row" style={{ marginBottom: 18 }}>
          <div className="upload-preview">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ color: "var(--text-faint)", fontSize: 11 }}>sem foto</span>
            )}
          </div>
          <label className="btn btn-sm file-btn">
            Escolher foto
            <input type="file" accept="image/*" onChange={handleFile} />
          </label>
        </div>
        <div className="field-row">
          <div className="field">
            <label>Nick *</label>
            <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} required />
          </div>
          <div className="field">
            <label>Nome (opcional)</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label>Plataforma</label>
            <select value={platform} onChange={(e) => setPlatform(e.target.value)}>
              {PLATFORMS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Link do canal</label>
            <input
              type="url"
              value={channelUrl}
              onChange={(e) => setChannelUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
        </div>
        <label className="checkbox-row" style={{ marginBottom: 18 }}>
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Streamer ativo
        </label>
        <div className="form-actions">
          <button className="btn btn-block" type="button" onClick={onCancel}>
            Cancelar
          </button>
          <button className="btn btn-primary btn-block" type="submit" disabled={saving}>
            {mode === "edit" ? "Salvar alterações" : "Adicionar streamer"}
          </button>
        </div>
      </form>
    </div>
  );
}
