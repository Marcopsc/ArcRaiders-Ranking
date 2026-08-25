# Ranking PvP — ARC Raiders BR

Aplicação web de votação e ranking (tier list colaborativa) para streamers brasileiros de ARC Raiders, com foco em desempenho PvP.

Stack: **Next.js (App Router) + PostgreSQL** (via `pg`, sem ORM pesado). Sem exigência de login para votar — qualquer pessoa com o link acessa e vota anonimamente, com identificação por nome/nick + e-mail e um cookie próprio para evitar votos duplicados no mesmo streamer.

## O que já vem pronto

- Página pública de votação com tier list (`S+ S A B C D`), drag-and-drop no desktop e seletor por toque no mobile.
- Identificação obrigatória (nome ou nick + e-mail) antes de votar.
- Cálculo automático de tier por streamer: o tier é o que recebeu mais votos individuais (moda), não a média — assim poucos votos extremos não superam quem tem muito mais votos.
- Página de resultados ("Ranking da comunidade") **visível apenas para o admin** — usuários comuns não veem o resultado em tempo real.
- Painel admin (senha única) com: criar votação/temporada, cadastrar/editar/excluir streamer (com upload de foto), abrir/fechar votação, zerar votos, ver total de participantes e avaliações, lista de participantes (nome + e-mail), trocar a senha.
- Anti-voto-duplicado: cookie `httpOnly` de identificação do votante + restrição no banco (`UNIQUE(ranking_id, streamer_id, voter_id)`) — a pessoa pode reenviar/ajustar seu próprio voto, mas não consegue votar duas vezes "como pessoas diferentes" no mesmo streamer usando o mesmo navegador.

## Estrutura de dados

Implementada em `db/schema.sql` (tabelas `streamers`, `rankings`, `ranking_streamers`, `voters`, `votes`, `settings`), batendo com as entidades pedidas (`Streamer`, `Ranking`, `RankingStreamer`, `Vote`).

## 1. Rodando localmente (opcional, para testar antes do deploy)

Pré-requisitos: Node 18+, um Postgres acessível (local ou já na nuvem).

```bash
npm install
cp .env.example .env.local   # edite DATABASE_URL, ADMIN_PASSWORD, SESSION_SECRET
psql "$DATABASE_URL" -f db/schema.sql
node --env-file=.env.local db/seed.js
npm run dev
```

Acesse `http://localhost:3000`.

## 2. Deploy em produção (Vercel + Neon Postgres)

### 2.1. Criar o banco de dados (Neon — camada gratuita)

1. Acesse [neon.tech](https://neon.tech) e crie uma conta gratuita.
2. Crie um novo projeto/banco (ex: `arc-ranking`).
3. Copie a **connection string** (formato `postgresql://usuario:senha@host/banco?sslmode=require`).

> Alternativa: você também pode adicionar o Neon direto pela integração de Storage/Marketplace dentro do próprio dashboard da Vercel — o efeito final (uma `DATABASE_URL`) é o mesmo.

### 2.2. Preparar o banco (rodar uma vez)

Na sua máquina, com Node instalado:

```bash
git clone <este-repositorio>
cd arc-ranking-app
npm install
DATABASE_URL="cole-aqui-a-connection-string-do-neon" psql "$DATABASE_URL" -f db/schema.sql
DATABASE_URL="cole-aqui-a-connection-string-do-neon" ADMIN_PASSWORD="escolha-uma-senha-forte" node -e "process.env.DATABASE_URL=process.argv[1]; process.env.ADMIN_PASSWORD=process.argv[2]; require('./db/seed.js')" "$DATABASE_URL" "escolha-uma-senha-forte"
```

(Se preferir, edite `.env.local` com esses valores e simplesmente rode `node --env-file=.env.local db/seed.js`.)

Isso cria a senha de admin, os 12 streamers iniciais e a votação "Ranking PvP ARC Raiders BR — Agosto 2026" em `/ranking/arc-raiders-br-2026`.

### 2.3. Publicar na Vercel

1. Suba este projeto para um repositório no GitHub (ou GitLab/Bitbucket).
2. Em [vercel.com](https://vercel.com), clique em **Add New → Project** e importe o repositório.
3. Em **Environment Variables**, adicione:
   - `DATABASE_URL` — a connection string do Neon (passo 2.1).
   - `ADMIN_PASSWORD` — não é usada em produção pelo app (só pelo script de setup), pode deixar em branco ou omitir.
   - `SESSION_SECRET` — gere um valor aleatório longo, por exemplo rodando `openssl rand -base64 32` no terminal.
4. Clique em **Deploy**.
5. Pronto — a Vercel te dá uma URL pública (ex: `https://seu-projeto.vercel.app`). Esse é o link que qualquer pessoa acessa **sem precisar logar em nada** para votar.

### 2.4. Depois do primeiro deploy

- Acesse `/admin` no link publicado, entre com a senha definida no passo 2.2, e troque a senha pelo próprio painel (Trocar senha).
- Cadastre fotos reais, links de canal e ajuste a lista de streamers pelo painel, se quiser.
- Compartilhe o link público (`/ranking/arc-raiders-br-2026`) — ele já funciona para qualquer visitante, sem cadastro nem login.
- Os resultados (`/ranking/arc-raiders-br-2026/resultados`) só aparecem para quem estiver logado no `/admin`.

## Onde cada regra do briefing foi implementada

- **Pontuação**: `src/lib/scoring.js` (`computeStats`, `tierFromVotes`, `tierFromAvg`). A tela de resultados (pública/admin e o painel admin) tem duas visualizações alternáveis por um botão no topo:
  - **Por tier mais votado** (padrão): o tier de cada streamer é o que recebeu mais votos individuais (moda) — não a média — para que poucos votos extremos não superem streamers com muito mais votos. Em empate no número de votos, vence o tier mais alto. Ordem dentro do tier (`compareByVotes`): quantidade de votos naquele tier → total de votos → média → nome.
  - **Por média**: o critério original do briefing, por faixa de nota (5,50–6,00 = S+, etc., ver `tierFromAvg`). Ordem dentro do tier (`compareByAvg`): média → total de votos → nome.

  As duas visualizações usam os mesmos votos já registrados — trocar de visualização só recalcula a exibição, não altera nem descarta nenhum voto.
- **Um voto por streamer por pessoa**: índice único `UNIQUE(ranking_id, streamer_id, voter_id)` em `db/schema.sql`, upsert em `src/lib/repo.js#submitVotes`.
- **Identificação anônima do votante**: cookie `httpOnly` `arc_voter_id` (1 ano de validade), setado em `src/app/api/vote/route.js`. Nome/e-mail informados pela pessoa ficam salvos na tabela `voters` — não são verificados/autenticados, é uma identificação por honestidade, não uma prova criptográfica.
- **Resultados só para admin**: checado no servidor em `src/app/ranking/[slug]/resultados/page.js` e na própria API (`src/app/api/rankings/[slug]/results/route.js`), então mesmo chamando a API diretamente sem estar logado como admin, a resposta vem bloqueada (403).

## Limitações conhecidas (mesmas do MVP pedido)

- Sem cadastro de usuário, sem comentários, sem chat, sem gamificação — como pedido para a primeira versão.
- A identificação nome/e-mail é auto-declarada (não há verificação de posse do e-mail); combinada com o cookie de votante, isso cobre o cenário de abuso casual, mas não impede alguém tecnicamente decidido a votar várias vezes limpando cookies.
- Upload de foto do streamer é redimensionado para um quadrado pequeno (200×200) e guardado como imagem embutida no banco — simples e suficiente para o volume de streamers do MVP, sem precisar de um serviço de armazenamento de arquivos à parte.
