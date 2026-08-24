"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ToastHost from "@/components/ToastHost";
import { useToasts } from "@/lib/useToasts";

export default function AdminLoginClient() {
  const router = useRouter();
  const { toasts, showToast } = useToasts();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Senha incorreta.", "error");
        setSubmitting(false);
        return;
      }
      router.refresh();
    } catch {
      showToast("Não foi possível conectar ao servidor.", "error");
      setSubmitting(false);
    }
  }

  return (
    <div className="page container">
      <div className="login-wrap">
        <div className="eyebrow" style={{ textAlign: "center" }}>
          ÁREA RESTRITA
        </div>
        <h1 className="h1">Painel administrativo</h1>
        <p className="subtitle">Digite a senha de administrador para continuar.</p>
        <form className="card" onSubmit={handleSubmit}>
          <div className="field">
            <label>Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              required
            />
          </div>
          <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
            {submitting ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
      <ToastHost toasts={toasts} />
    </div>
  );
}
