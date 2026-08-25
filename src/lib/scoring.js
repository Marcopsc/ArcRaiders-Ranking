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

/**
 * Tier de um streamer = o tier que recebeu mais votos individuais (moda),
 * não a média. Isso evita que poucos votos extremos (ex: 3 votos S+)
 * superem streamers com muito mais votos espalhados entre tiers próximos.
 * Em caso de empate no número de votos entre dois ou mais tiers, prevalece
 * o tier mais alto (TIERS já está ordenado de S+ a D).
 */
export function tierFromVotes(distCount) {
  let best = null;
  let bestCount = -1;
  TIERS.forEach((t) => {
    const c = distCount[t] || 0;
    if (c > bestCount) {
      best = t;
      bestCount = c;
    }
  });
  return best;
}

/**
 * Ordena duas linhas de estatística dentro do mesmo tier: primeiro por
 * quantidade de votos QUE O STREAMER RECEBEU NAQUELE TIER (o critério
 * "mais justo" pedido — quem tem mais gente confirmando aquele tier fica
 * na frente), depois por total de votos geral, depois pela média, e por
 * fim por nome, para desempate determinístico.
 */
export function compareStatsRows(a, b) {
  if (b.tierVotes !== a.tierVotes) return b.tierVotes - a.tierVotes;
  if (b.count !== a.count) return b.count - a.count;
  if (b.avg !== a.avg) return b.avg - a.avg;
  return (a.streamer?.nickname || "").localeCompare(b.streamer?.nickname || "", "pt-BR");
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
    const distCount = {};
    TIERS.forEach((t) => {
      const c = sv.filter((v) => v.tier === t).length;
      distCount[t] = c;
      dist[t] = count ? Math.round((c / count) * 100) : 0;
    });
    const tier = count ? tierFromVotes(distCount) : null;
    return {
      streamer,
      count,
      avg,
      tier,
      tierVotes: tier ? distCount[tier] : 0,
      dist,
      distCount,
    };
  });
}
