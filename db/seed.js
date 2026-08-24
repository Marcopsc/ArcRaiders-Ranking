// One-time / idempotent setup script.
// Run with: node --env-file=.env.local db/seed.js
//
// Creates: admin password (from ADMIN_PASSWORD env, or default), the initial
// 12 streamers (only if the streamers table is empty), and the first ranking
// "Ranking PvP ARC Raiders BR — Agosto 2026" (only if there are no rankings yet).

const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const NICKS = [
  "FlavinnBr",
  "xZiggsRj",
  "TrvKing__",
  "BigTayga",
  "Lnz",
  "CascaPlayer",
  "Nnninjak",
  "SraMaravilha",
  "Sangras",
  "FlamengoKg",
  "Pracinha_gamer",
  "KingSizeJoga",
];

function newId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL não definida.");
  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false },
  });

  // 1. Admin password
  const existingHash = await pool.query("SELECT value FROM settings WHERE key='admin_password_hash'");
  if (existingHash.rows.length === 0) {
    const plain = process.env.ADMIN_PASSWORD || "ARCraiders2026!";
    const hash = await bcrypt.hash(plain, 10);
    await pool.query(
      "INSERT INTO settings(key,value) VALUES ('admin_password_hash',$1) ON CONFLICT (key) DO NOTHING",
      [hash]
    );
    console.log(`✔ Senha de administrador definida (a partir de ADMIN_PASSWORD ou padrão).`);
  } else {
    console.log("• Senha de administrador já configurada — mantida.");
  }

  // 2. Streamers (only seed if table is empty)
  const countRes = await pool.query("SELECT COUNT(*)::int as c FROM streamers");
  let streamerIds = [];
  if (countRes.rows[0].c === 0) {
    for (const nickname of NICKS) {
      const id = newId("st");
      await pool.query(
        `INSERT INTO streamers (id, nickname, name, avatar_url, platform, channel_url, active)
         VALUES ($1,$2,'','','','',true)`,
        [id, nickname]
      );
      streamerIds.push(id);
    }
    console.log(`✔ ${NICKS.length} streamers cadastrados.`);
  } else {
    const r = await pool.query("SELECT id FROM streamers WHERE active=true");
    streamerIds = r.rows.map((row) => row.id);
    console.log(`• Streamers já existentes (${countRes.rows[0].c}) — mantidos.`);
  }

  // 3. Initial ranking
  const rankingCount = await pool.query("SELECT COUNT(*)::int as c FROM rankings");
  if (rankingCount.rows[0].c === 0) {
    const id = newId("rk");
    const slug = "arc-raiders-br-2026";
    await pool.query(
      `INSERT INTO rankings (id, slug, name, description, status)
       VALUES ($1,$2,$3,$4,'open')`,
      [
        id,
        slug,
        "Ranking PvP ARC Raiders BR — Agosto 2026",
        "Vote e ajude a comunidade a definir quem manda no PvP de ARC Raiders no Brasil.",
      ]
    );
    for (const sid of streamerIds) {
      await pool.query(
        `INSERT INTO ranking_streamers (ranking_id, streamer_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [id, sid]
      );
    }
    await pool.query(
      "INSERT INTO settings(key,value) VALUES ('active_ranking_id',$1) ON CONFLICT (key) DO UPDATE SET value=$1",
      [id]
    );
    console.log(`✔ Votação inicial criada: /ranking/${slug}`);
  } else {
    console.log("• Já existem votações cadastradas — nenhuma nova criada.");
  }

  await pool.end();
  console.log("\nSetup concluído.");
}

main().catch((err) => {
  console.error("Falha no setup:", err);
  process.exit(1);
});
