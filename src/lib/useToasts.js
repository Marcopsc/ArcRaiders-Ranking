"use client";
import { useCallback, useRef, useState } from "react";

export function useToasts() {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const showToast = useCallback((msg, type, ms) => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, ms || 3200);
  }, []);

  return { toasts, showToast };
}
