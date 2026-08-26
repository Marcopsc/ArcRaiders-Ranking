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
 * Tier "por média", por COLOCAÇÃO: ordena todo mundo (quem já tem voto)
 * da maior pra menor média e divide em 6 grupos do tamanho mais igual
 * possível — o grupo com as melhores médias vira S+, o com as piores vira
 * D. Assim os 6 tiers ficam sempre preenchidos (contanto que haja pelo
 * menos 6 streamers com voto), mesmo quando há "buracos" na distribuição
 * real das notas — ao contrário de uma faixa fixa ou relativa ao range,
 * que podia deixar um tier vazio se, por coincidência, ninguém tivesse
 * média bem naquele intervalo.
 * Empate na média é desempatado por total de votos e depois por nome, pra
 * ficar determinístico (não mudar de posição sozinho a cada carregamento).
 */
export function assignTiersByPlacement(rows) {
  const withVotes = rows.filter((r) => r.count > 0);
  const sorted = [...withVotes].sort((a, b) => {
    if (b.avg !== a.avg) return b.avg - a.avg;
    if (b.count !== a.count) return b.count - a.count;
    return (a.streamer?.nickname || "").localeCompare(b.streamer?.nickname || "", "pt-BR");
  });
  const n = sorted.length;
  const tierById = new Map();
  sorted.forEach((r, i) => {
    const idx = Math.min(TIERS.length - 1, Math.floor((i * TIERS.length) / n));
    tierById.set(r.streamer.id, TIERS[idx]);
  });
  return tierById;
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
 * Ordena duas linhas de estatística dentro do mesmo tier (modo "por tier
 * mais votado"): primeiro por quantidade de votos QUE O STREAMER RECEBEU
 * NAQUELE TIER (o critério "mais justo" — quem tem mais gente confirmando
 * aquele tier fica na frente), depois por total de votos geral, depois
 * pela média, e por fim por nome, para desempate determinístico.
 */
export function compareByVotes(a, b) {
  if (b.tierVotes !== a.tierVotes) return b.tierVotes - a.tierVotes;
  if (b.count !== a.count) return b.count - a.count;
  if (b.avg !== a.avg) return b.avg - a.avg;
  return (a.streamer?.nickname || "").localeCompare(b.streamer?.nickname || "", "pt-BR");
}

/**
 * Ordena duas linhas de estatística dentro do mesmo tier (modo "por
 * média"): a forma original de rankear, pela nota média, com total de
 * votos e nome como desempate.
 */
export function compareByAvg(a, b) {
  if (b.avg !== a.avg) return b.avg - a.avg;
  if (b.count !== a.count) return b.count - a.count;
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
 *
 * Cada linha já sai com os DOIS critérios de tier calculados, para a tela
 * poder alternar entre as duas visualizações sem precisar buscar de novo:
 *  - tierByVotes: tier = o mais votado (moda) — o critério "mais justo".
 *  - tierByAvg: tier = por colocação na média (ver `assignTiersByPlacement`)
 *    — os 6 tiers sempre ficam preenchidos, dividindo quem tem voto em 6
 *    grupos iguais da maior pra menor média.
 * `tier` fica como atalho para tierByVotes (visualização padrão).
 */
export function computeStats(streamers, votes) {
  const rows = streamers.map((streamer) => {
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
    const tierByVotes = count ? tierFromVotes(distCount) : null;
    return { streamer, count, avg, tierByVotes, dist, distCount };
  });

  const tierByAvgMap = assignTiersByPlacement(rows);

  return rows.map((r) => {
    const tierByAvg = r.count ? tierByAvgMap.get(r.streamer.id) || null : null;
    return {
      streamer: r.streamer,
      count: r.count,
      avg: r.avg,
      tier: r.tierByVotes,
      tierByVotes: r.tierByVotes,
      tierByAvg,
      tierVotes: r.tierByVotes ? r.distCount[r.tierByVotes] : 0,
      dist: r.dist,
      distCount: r.distCount,
    };
  });
}
