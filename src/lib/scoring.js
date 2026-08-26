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
 * Tier "por média", em faixas RELATIVAS ao intervalo real das médias desta
 * votação — não em faixas fixas de 0 a 6 pontos. Com poucos votos as médias
 * quase sempre ficam concentradas no meio da escala (ninguém tira 6,00 nem
 * 1,00 puro), então as faixas fixas (`tierFromAvg`) deixavam quase todo
 * mundo preso em S/A/B e o S+ e o D praticamente vazios. Aqui, o streamer
 * com a MAIOR média da votação sempre cai em S+ e o de MENOR média sempre
 * cai em D, com o resto distribuído proporcionalmente entre os dois —
 * preenchendo o range inteiro do S+ ao D nesta votação específica.
 * Se todo mundo tem a mesma média (sem variação nenhuma pra comparar),
 * cai tudo em S (nota neutra), já que não existe "melhor" nem "pior".
 */
export function tierFromAvgRange(avg, minAvg, maxAvg) {
  if (minAvg === maxAvg) return "S";
  const normalized = (avg - minAvg) / (maxAvg - minAvg); // 0 = pior desta votação, 1 = melhor
  const idx = Math.min(TIERS.length - 1, Math.max(0, Math.floor((1 - normalized) * TIERS.length)));
  return TIERS[idx];
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
 *  - tierByAvg: tier = faixa RELATIVA de média nesta votação (ver
 *    `tierFromAvgRange`) — preenche do S+ ao D proporcionalmente ao maior
 *    e menor média realmente alcançados, em vez de faixas fixas.
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

  // Range real de médias entre quem já tem voto — streamers sem voto (avg=0)
  // ficariam de fora, senão eles puxariam o "mínimo" pra baixo artificialmente.
  const avgs = rows.filter((r) => r.count > 0).map((r) => r.avg);
  const minAvg = avgs.length ? Math.min(...avgs) : 0;
  const maxAvg = avgs.length ? Math.max(...avgs) : 0;

  return rows.map((r) => {
    const tierByAvg = r.count ? tierFromAvgRange(r.avg, minAvg, maxAvg) : null;
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
