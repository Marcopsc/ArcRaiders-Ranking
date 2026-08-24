"use client";
import { colorFor, initials } from "@/lib/clientUtils";

export default function Avatar({ streamer, size = 40, className = "" }) {
  const style = { width: size, height: size };
  if (streamer?.avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={`avatar ${className}`} style={style} src={streamer.avatarUrl} alt="" />;
  }
  return (
    <div
      className={`avatar-fallback ${className}`}
      style={{ ...style, background: colorFor(streamer?.nickname), fontSize: size * 0.4 }}
    >
      {initials(streamer?.nickname)}
    </div>
  );
}
