// Bot Arena: official leaderboard (bots/arena.json, made by the GitHub Action)
// + in-browser round-robin battles + instant game replays (no Python needed to watch).
import { Board } from "./board.js";
import { PyWorker } from "./worker-client.js";
import * as store from "./storage.js";

const $ = (id) => document.getElementById(id);
const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const MAX_PLIES = 200; // same as learn/tools/tournament.py
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const board = new Board($("board"), () => {});

// ---------- tabs ----------
document.querySelectorAll(".tabs button").forEach((b) => (b.onclick = () => {
  document.querySelectorAll(".tabs button").forEach((x) => x.classList.toggle("on", x === b));
  document.querySelectorAll(".tab").forEach((t) => (t.hidden = t.id !== "tab-" + b.dataset.tab));
}));
if (location.hash === "#battle") document.querySelector('[data-tab="battle"]').click();

// ---------- replay (pure JS: applies UCI moves, no legality check needed) ----------
function parsePlacement(fen) {
  const p = {};
  fen.split(" ")[0].split("/").forEach((row, r) => {
    let f = 0;
    for (const ch of row) /\d/.test(ch) ? (f += +ch) : (p["abcdefgh"[f++] + (8 - r)] = ch);
  });
  return p;
}
function applyUci(prev, u) {
  const p = { ...prev }, from = u.slice(0, 2), to = u.slice(2, 4);
  let pc = p[from]; delete p[from];
  if ("Kk".includes(pc) && Math.abs(from.charCodeAt(0) - to.charCodeAt(0)) === 2) { // castling: move the rook too
    const r = to[1], kside = to[0] === "g";
    p[(kside ? "f" : "d") + r] = p[(kside ? "h" : "a") + r]; delete p[(kside ? "h" : "a") + r];
  }
  if ("Pp".includes(pc) && from[0] !== to[0] && !p[to]) delete p[to[0] + from[1]]; // en passant
  if (u[4]) pc = pc === "P" ? u[4].toUpperCase() : u[4];
  p[to] = pc;
  return p;
}
function draw(pieces, last) {
  Object.assign(board, { pieces, last, legal: [], sel: null, checkSq: null });
  board.render();
}

const R = { game: null, pos: [], ply: 0, timer: null };
let following = true; // live battle draws to the board only while true
function watch(g, names) {
  following = false; stopAuto();
  $("r-live").hidden = !running;
  R.game = g; R.pos = [parsePlacement(START)];
  for (const u of g.moves) R.pos.push(applyUci(R.pos.at(-1), u));
  $("vs").innerHTML = `♔ <b>${esc(names(g.white))}</b> vs ♚ <b>${esc(names(g.black))}</b>`;
  $("r-result").textContent = `${g.result} · ${g.reason}`;
  $("r-result").hidden = true;
  goto(0); toggleAuto();
  $("stage").scrollIntoView({ behavior: "smooth", block: "nearest" });
}
function goto(n) {
  if (!R.game) return;
  R.ply = Math.max(0, Math.min(n, R.pos.length - 1));
  draw(R.pos[R.ply], R.game.moves[R.ply - 1] || null);
  $("r-ply").textContent = `move ${Math.ceil(R.ply / 2)} / ${Math.ceil((R.pos.length - 1) / 2)}`;
  if (R.ply === R.pos.length - 1) { $("r-result").hidden = false; stopAuto(); }
}
const stopAuto = () => { clearInterval(R.timer); R.timer = null; };
function toggleAuto() {
  if (R.timer) return stopAuto();
  if (R.ply === R.pos.length - 1) goto(0);
  R.timer = setInterval(() => goto(R.ply + 1), 350);
}
$("r-first").onclick = () => { stopAuto(); goto(0); };
$("r-prev").onclick = () => { stopAuto(); goto(R.ply - 1); };
$("r-next").onclick = () => { stopAuto(); goto(R.ply + 1); };
$("r-last").onclick = () => { stopAuto(); goto(1e9); };
$("r-play").onclick = toggleAuto;
$("r-live").onclick = () => { stopAuto(); R.game = null; following = true; $("r-live").hidden = true; $("r-ply").textContent = ""; $("r-result").textContent = ""; showLive(); };
document.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT") return;
  if (e.key === "ArrowLeft") $("r-prev").click();
  if (e.key === "ArrowRight") $("r-next").click();
});
draw(parsePlacement(START), null);

// ---------- tables ----------
function standingsHtml(rows, nameOf, authorOf, showElo) {
  return `<tr><th>#</th><th>Bot</th><th title="win 1, draw ½">Pts</th><th>W</th><th>D</th><th>L</th>${showElo ? "<th title='rough estimate'>Elo</th>" : ""}<th></th></tr>` +
    rows.map((s, i) => {
      const medal = ["🥇", "🥈", "🥉"][i] || i + 1;
      const a = authorOf(s.id);
      const warn = s.problem_count ? `<span class="warn" title="${esc(s.problems.join("\n"))}">⚠️ ${s.problem_count}</span>` : "";
      return `<tr><td>${medal}</td><td><b>${esc(nameOf(s.id))}</b>${a ? `<br><small>${esc(a)}</small>` : ""}</td><td>${s.points}/${s.played}</td><td>${s.w}</td><td>${s.d}</td><td>${s.l}</td>${showElo ? `<td>${s.elo}</td>` : ""}<td>${warn}</td></tr>`;
    }).join("");
}
function gamesHtml(games, nameOf) {
  const icon = (g) => g.result === "1-0" ? "1–0" : g.result === "0-1" ? "0–1" : g.result === "*" ? "🔴" : "½";
  return games.map((g, i) => `<button class="game ${g.result === "*" ? "live" : ""}" data-i="${i}">
    <span class="res">${icon(g)}</span> ${esc(nameOf(g.white))} <i>vs</i> ${esc(nameOf(g.black))}
    <small>${g.result === "*" ? "live" : esc(g.reason)}</small></button>`).join("");
}

// ---------- official leaderboard ----------
let official = null;
fetch("bots/arena.json", { cache: "no-cache" }).then((r) => r.ok ? r.json() : Promise.reject(r.status)).then((A) => {
  official = A;
  const by = Object.fromEntries(A.bots.map((b) => [b.id, b]));
  const nameOf = (id) => by[id]?.name || id, authorOf = (id) => by[id]?.author || "";
  const s = A.settings;
  $("o-info").textContent = `Updated ${A.updated} · ${A.games.length} games · ${s.games_per_pair} per pair · ${s.time}s/move`;
  $("o-table").innerHTML = standingsHtml(A.standings, nameOf, authorOf, true) +
    A.bots.filter((b) => b.error).map((b) => `<tr class="broken"><td>❌</td><td colspan="7"><b>${esc(b.name)}</b> could not load: <small>${esc(b.error)}</small></td></tr>`).join("");
  $("o-games").innerHTML = gamesHtml(A.games, nameOf);
  $("o-games").onclick = (e) => { const b = e.target.closest(".game"); if (b) watch(A.games[+b.dataset.i], nameOf); };
  fighters.unshift(...A.bots.filter((b) => !b.error).map((b) => ({ id: "o:" + b.id, name: b.name, author: b.author, url: "bots/" + b.file, on: true, tag: "official" })));
  renderFighters();
}).catch(() => { $("o-info").textContent = "No official results yet (bots/arena.json is created by the GitHub Action)."; });

// ---------- fighters ----------
const fighters = [];
const metaFrom = (src, fallback) => {
  const get = (k) => (src.split("\n").slice(0, 15).join("\n").match(new RegExp(`^\\s*#\\s*${k}\\s*:\\s*(.+)$`, "im")) || [])[1]?.trim().slice(0, 40);
  return { name: get("name") || fallback, author: get("author") || "" };
};
for (const n of store.listBots()) fighters.push({ id: "s:" + n, name: n, src: store.getBot(n), on: false, tag: "saved" });
if (store.loadDraft()?.trim()) fighters.push({ id: "me", ...metaFrom(store.loadDraft(), "My bot (editor)"), src: store.loadDraft(), on: true, tag: "editor" });
function renderFighters() {
  $("fighters").innerHTML = fighters.map((f, i) => `<label class="fighter"><input type="checkbox" data-i="${i}" ${f.on ? "checked" : ""}>
    ${esc(f.name)} <small class="tag ${f.tag}">${f.tag}</small></label>`).join("") || "<p class='tiny'>No bots yet - add .py files.</p>";
}
$("fighters").onchange = (e) => { if (e.target.dataset.i) fighters[+e.target.dataset.i].on = e.target.checked; };
$("add").onchange = async (e) => {
  for (const f of e.target.files) {
    const src = await f.text();
    fighters.push({ id: "f:" + f.name + fighters.length, ...metaFrom(src, f.name.replace(/\.py$/, "")), src, on: true, tag: "file" });
  }
  e.target.value = ""; renderFighters();
};
renderFighters();

// ---------- live battle ----------
let ref = null, slots = null, running = false, stopToken = 0;
let B = null; // {bots:[{id,name,author,src}], standings:{}, games:[]}
let livePos = { fen: START, last: null }, liveTitle = "";
function showLive() { if (following && running) { board.set(livePos.fen, [], livePos.last); $("vs").innerHTML = liveTitle; } }
function log(m, err) { const d = document.createElement("div"); d.textContent = m; if (err) d.className = "err"; $("log").appendChild(d); $("log").scrollTop = 1e9; }

async function ensurePython() {
  if (ref) return Promise.all([ref.ready, ...slots.map((s) => s.ready)]);
  $("status").textContent = "Loading Python… (first time can take ~10–60 s)";
  ref = new PyWorker(); slots = [new PyWorker(), new PyWorker()];
  await Promise.all([ref.ready, ...slots.map((s) => s.ready)]);
  $("status").textContent = "Python ready";
}

const bName = (id) => B.bots.find((b) => b.id === id)?.name || id;
function renderBattle() {
  const rows = Object.values(B.standings).sort((a, b) => b.points - a.points || b.w - a.w);
  $("b-table").innerHTML = standingsHtml(rows, bName, (id) => B.bots.find((b) => b.id === id)?.author, false);
  $("b-list").innerHTML = gamesHtml(B.games, bName);
}
$("b-list").onclick = (e) => { const b = e.target.closest(".game"); if (!b) return; const g = B.games[+b.dataset.i]; if (g.result === "*") return $("r-live").click(); watch(g, bName); };

async function playOne(w, b, limit, my) {
  const g = { white: w.id, black: b.id, result: "*", reason: "", moves: [] };
  B.games.push(g); renderBattle();
  const lose = (white, why) => Object.assign(g, { result: white ? "0-1" : "1-0", reason: why });
  for (const [k, p] of [[0, w], [1, b]]) {
    let err = await slots[k].callTimed("load", { src: p.src, name: p.name }, 5000);
    if (my !== stopToken) return Object.assign(g, { reason: "stopped" });
    if (err?.timeout) err = "took over 5 s to start";
    if (err) { log(`${p.name}: ${err}`, true); return lose(k === 0, `${p.name} could not start`); }
  }
  liveTitle = `🔴 LIVE · ♔ <b>${esc(w.name)}</b> vs ♚ <b>${esc(b.name)}</b>`;
  while (true) {
    if (my !== stopToken) return Object.assign(g, { reason: "stopped" });
    const st = await ref.call("status", { start: START, ucis: g.moves });
    livePos = { fen: st.fen, last: g.moves.at(-1) || null }; showLive();
    if (st.over) return Object.assign(g, { result: st.result, reason: st.reason });
    if (g.moves.length >= MAX_PLIES) return Object.assign(g, { result: "1/2-1/2", reason: "draw: 100-move cap" });
    const white = st.turn === true, p = white ? w : b;
    const r = await slots[white ? 0 : 1].callTimed("move", { fen: st.fen, timeLeft: limit }, limit * 1000 + 1500);
    if (my !== stopToken || r.aborted) return Object.assign(g, { reason: "stopped" });
    if (r.timeout) { log(`${p.name} was too slow (over ${limit}s).`, true); return lose(white, `${p.name} lost on time`); }
    if (r.err) { log(`${p.name}: ${r.err}`, true); return lose(white, `${p.name} crashed / illegal move`); }
    g.moves.push(r.uci);
  }
}

$("b-start").onclick = async () => {
  const picked = fighters.filter((f) => f.on);
  if (picked.length < 2) return alert("Pick at least 2 fighters.");
  running = true; following = true; R.game = null; const my = ++stopToken;
  $("b-start").disabled = true; $("b-stop").disabled = false; $("log").textContent = "";
  try {
    await ensurePython();
    const bots = [];
    for (const f of picked) {
      const src = f.src ?? await (await fetch(f.url)).text();
      bots.push({ id: f.id, name: f.name, author: f.author || "", src });
    }
    B = { bots, games: [], standings: Object.fromEntries(bots.map((b) => [b.id, { id: b.id, points: 0, played: 0, w: 0, d: 0, l: 0, problems: [], problem_count: 0 }])) };
    const per = Math.max(1, +$("b-games").value || 2), limit = +$("b-time").value || 1;
    const pairs = [];
    for (let i = 0; i < bots.length; i++) for (let j = i + 1; j < bots.length; j++) for (let k = 0; k < per; k++) pairs.push(k % 2 ? [bots[j], bots[i]] : [bots[i], bots[j]]);
    for (let n = 0; n < pairs.length && my === stopToken; n++) {
      $("b-progress").textContent = `game ${n + 1} / ${pairs.length}`;
      const [w, b] = pairs[n];
      const g = await playOne(w, b, limit, my);
      if (g.result === "*") { B.games.pop(); break; }
      const sw = g.result === "1-0" ? 1 : g.result === "0-1" ? 0 : 0.5;
      for (const [id, s] of [[w.id, sw], [b.id, 1 - sw]]) {
        const t = B.standings[id]; t.points += s; t.played++; t[s === 1 ? "w" : s === 0 ? "l" : "d"]++;
      }
      if (/could not start|on time|crashed/.test(g.reason)) { const t = B.standings[sw === 0 ? w.id : b.id]; t.problems.push(g.reason); t.problem_count++; }
      renderBattle();
    }
    if (my === stopToken) { $("b-progress").textContent = "🏁 Done!"; const top = Object.values(B.standings).sort((a, b) => b.points - a.points)[0]; log(`🏆 Winner: ${bName(top.id)} (${top.points} pts)`); }
  } catch (e) { log("Arena error: " + e.message, true); }
  running = false; $("r-live").hidden = true;
  if (following) $("vs").textContent = "🏁 Battle over · click a game to replay ▶";
  $("b-start").disabled = false; $("b-stop").disabled = true;
  $("b-pgn").disabled = $("b-json").disabled = !B?.games.length;
  renderBattle();
};
$("b-stop").onclick = () => { stopToken++; slots?.forEach((s) => s.restart()); $("b-progress").textContent = "Stopped"; };

$("b-pgn").onclick = async () => {
  const pg = [];
  for (const g of B.games) pg.push(await ref.call("pgn", { start: START, ucis: g.moves, white: bName(g.white), black: bName(g.black), result: g.result }));
  store.download("arena.pgn", pg.join("\n\n"));
};
$("b-json").onclick = () => store.download("results.json", JSON.stringify({
  updated: new Date().toISOString().slice(0, 16).replace("T", " ") + " (browser)",
  settings: { games_per_pair: +$("b-games").value, time: +$("b-time").value, max_moves: MAX_PLIES / 2 },
  bots: B.bots.map(({ id, name, author }) => ({ id, name, author })),
  standings: Object.values(B.standings).sort((a, b) => b.points - a.points), games: B.games,
}, null, 1));
