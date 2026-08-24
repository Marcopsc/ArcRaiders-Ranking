export const TIERS = ["S+", "S", "A", "B", "C", "D"];

export const TIER_SCORE = { "S+": 6, S: 5, A: 4, B: 3, C: 2, D: 1 };

export const TIER_COLOR = {
  "S+": "#ff5c5c",
  S: "#ff8a3d",
  A: "#ffc24b",
  B: "#ffe066",
  C: "#c6e84c",
  D: "#4caf6d",
};

export function tierFromAvg(avg) {
  if (avg >= 5.5) return "S+";
  if (avg >= 4.5) return "S";
  if (avg >= 3.5) return "A";
  if (avg >= 2.5) return "B";
  if (avg >= 1.5) return "C";
  return "D";
}

export function isValidTier(t) {
  return TIERS.indexOf(t) !== -1;
}

export function isValidEmail(str) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(str || "").trim());
}

export function fmtAvg(n) {
  return (Math.round(n * 100) / 100).toFixed(2).replace(".", ",");
}

/**
 * Given an array of votes ({streamerId, tier, score}) for a single ranking,
 * and the list of streamers in that ranking, compute per-streamer stats.
 */
export function computeStats(streamers, votes) {
  return streamers.map((streamer) => {
    const sv = votes.filter((v) => v.streamer_id === streamer.id);
    const count = sv.length;
    const total = sv.reduce((a, v) => a + v.score, 0);
    const avg = count ? total / count : 0;
    const dist = {};
    TIERS.forEach((t) => {
      dist[t] = count ? Math.round((sv.filter((v) => v.tier === t).length / count) * 100) : 0;
    });
    return {
      streamer,
      count,
      avg,
      tier: count ? tierFromAvg(avg) : null,
      dist,
    };
  });
}
