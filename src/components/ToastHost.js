"use client";

export default function ToastHost({ toasts }) {
  if (!toasts?.length) return null;
  return (
    <div className="toast-wrap">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type === "error" ? "error" : ""}`}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}
