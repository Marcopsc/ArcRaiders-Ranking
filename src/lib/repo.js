import { query, withTransaction } from "./db";
import { newId } from "./auth";
import { TIER_SCORE } from "./scoring";

export async function getSetting(key) {
  const r = await query("SELECT value FROM settings WHERE key=$1", [key]);
  return r.rows[0]?.value ?? null;
}
export async function setSetting(key, value) {
  await query(
    "INSERT INTO settings(key,value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=$2",
    [key, value]
  );
}

export async function getAdminPasswordHash() {
  return getSetting("admin_password_hash");
}
export async function setAdminPasswordHash(hash) {
  return setSetting("admin_password_hash", hash);
}

export async function getActiveRankingId() {
  return getSetting("active_ranking_id");
}
export async function setActiveRankingId(id) {
  return setSetting("active_ranking_id", id);
}

export async function listStreamers() {
  const r = await query("SELECT * FROM streamers ORDER BY created_at ASC");
  return r.rows;
}
export async function getStreamer(id) {
  const r = await query("SELECT * FROM streamers WHERE id=$1", [id]);
  return r.rows[0] || null;
}
export async function createStreamer({ nickname, name, avatarUrl, platform, channelUrl, active }) {
  const id = newId("st");
  await query(
    `INSERT INTO streamers (id, nickname, name, avatar_url, platform, channel_url, active)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [id, nickname, name || "", avatarUrl || "", platform || "", channelUrl || "", active !== false]
  );
  return getStreamer(id);
}
export async function updateStreamer(id, fields) {
  const cols = [];
  const vals = [];
  let i = 1;
  const map = {
    nickname: "nickname",
    name: "name",
    avatarUrl: "avatar_url",
    platform: "platform",
    channelUrl: "channel_url",
    active: "active",
  };
  for (const key of Object.keys(fields)) {
    if (map[key] === undefined) continue;
    cols.push(`${map[key]}=$${i}`);
    vals.push(fields[key]);
    i++;
  }
  if (!cols.length) return getStreamer(id);
  vals.push(id);
  await query(`UPDATE streamers SET ${cols.join(", ")} WHERE id=$${i}`, vals);
  return getStreamer(id);
}
export async function deleteStreamer(id) {
  await query("DELETE FROM streamers WHERE id=$1", [id]);
}

export async function listRankings() {
  const r = await query("SELECT * FROM rankings ORDER BY created_at DESC");
  return r.rows;
}
export async function getRankingById(id) {
  const r = await query("SELECT * FROM rankings WHERE id=$1", [id]);
  return r.rows[0] || null;
}
export async function getRankingBySlug(slug) {
  const r = await query("SELECT * FROM rankings WHERE slug=$1", [slug]);
  return r.rows[0] || null;
}
export async function getRankingStreamerIds(rankingId) {
  const r = await query("SELECT streamer_id FROM ranking_streamers WHERE ranking_id=$1", [rankingId]);
  return r.rows.map((row) => row.streamer_id);
}
export async function getRankingStreamers(rankingId) {
  const r = await query(
    `SELECT s.* FROM streamers s
     JOIN ranking_streamers rs ON rs.streamer_id = s.id
     WHERE rs.ranking_id = $1
     ORDER BY s.nickname ASC`,
    [rankingId]
  );
  return r.rows;
}
export async function createRanking({ name, description, slug, streamerIds }) {
  const id = newId("rk");
  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO rankings (id, slug, name, description, status) VALUES ($1,$2,$3,$4,'open')`,
      [id, slug, name, description || ""]
    );
    for (const sid of streamerIds || []) {
      await client.query(
        `INSERT INTO ranking_streamers (ranking_id, streamer_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [id, sid]
      );
    }
  });
  return getRankingById(id);
}
export async function setRankingStreamerMembership(rankingId, streamerId, included) {
  if (included) {
    await query(
      `INSERT INTO ranking_streamers (ranking_id, streamer_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [rankingId, streamerId]
    );
  } else {
    await query(`DELETE FROM ranking_streamers WHERE ranking_id=$1 AND streamer_id=$2`, [
      rankingId,
      streamerId,
    ]);
  }
}
export async function setRankingStatus(rankingId, status) {
  await query(
    `UPDATE rankings SET status=$1, closed_at=CASE WHEN $1='closed' THEN now() ELSE NULL END WHERE id=$2`,
    [status, rankingId]
  );
  return getRankingById(rankingId);
}
export async function resetRankingVotes(rankingId) {
  await query("DELETE FROM votes WHERE ranking_id=$1", [rankingId]);
}

export async function getVotesForRanking(rankingId) {
  const r = await query("SELECT * FROM votes WHERE ranking_id=$1", [rankingId]);
  return r.rows;
}
export async function getVotesForVoterInRanking(rankingId, voterId) {
  const r = await query("SELECT * FROM votes WHERE ranking_id=$1 AND voter_id=$2", [
    rankingId,
    voterId,
  ]);
  return r.rows;
}

export async function upsertVoter(voterId, name, email) {
  await query(
    `INSERT INTO voters (id, name, email) VALUES ($1,$2,$3)
     ON CONFLICT (id) DO UPDATE SET name=$2, email=$3, last_seen_at=now()`,
    [voterId, name, email]
  );
}
export async function getVoter(voterId) {
  const r = await query("SELECT * FROM voters WHERE id=$1", [voterId]);
  return r.rows[0] || null;
}

export async function submitVotes(rankingId, voterId, tierMap) {
  await withTransaction(async (client) => {
    for (const streamerId of Object.keys(tierMap)) {
      const tier = tierMap[streamerId];
      const score = TIER_SCORE[tier];
      if (!score) continue;
      await client.query(
        `INSERT INTO votes (id, ranking_id, streamer_id, voter_id, tier, score)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (ranking_id, streamer_id, voter_id)
         DO UPDATE SET tier=$5, score=$6, updated_at=now()`,
        [newId("vt"), rankingId, streamerId, voterId, tier, score]
      );
    }
  });
}

export async function getParticipantsByVoter(rankingId) {
  const r = await query(
    `SELECT vo.id as voter_id, vo.name, vo.email, COUNT(v.id)::int as vote_count
     FROM votes v
     JOIN voters vo ON vo.id = v.voter_id
     WHERE v.ranking_id = $1
     GROUP BY vo.id, vo.name, vo.email
     ORDER BY vo.name ASC`,
    [rankingId]
  );
  return r.rows;
}
