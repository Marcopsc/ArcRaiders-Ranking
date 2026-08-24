"use client";

export function fmtInt(n) {
  try {
    return Number(n).toLocaleString("pt-BR");
  } catch {
    return String(n);
  }
}

const AVATAR_PALETTE = ["#5b4b66", "#4b5b66", "#665b4b", "#4b6659", "#66504b", "#4b5566", "#5c664b"];

export function initials(nick) {
  const n = String(nick || "?").trim();
  return (n.slice(0, 2) || "?").toUpperCase();
}

export function colorFor(nick) {
  const s = String(nick || "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

export function fileToAvatarDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const size = 200;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
