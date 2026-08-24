"use client";

export default function ConfirmModal({ title, body, confirmLabel, danger, onConfirm, onCancel }) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 340 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 17, marginBottom: 8 }}>
          {title}
        </div>
        <div style={{ color: "var(--text-dim)", fontSize: 14, marginBottom: 22 }}>{body}</div>
        <div className="form-actions">
          <button className="btn btn-block" onClick={onCancel}>
            Cancelar
          </button>
          <button className={`btn btn-block ${danger ? "btn-danger" : "btn-primary"}`} onClick={onConfirm}>
            {confirmLabel || "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
