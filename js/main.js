import { Board } from "./board.js";
import { PyWorker } from "./worker-client.js";
import * as store from "./storage.js";

const $ = (id) => document.getElementById(id);
const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const BUILTIN = {
  "b:pybot": { name: "PyBot (alpha-beta)", url: "py/engines/pybot_wrapper.py" },
  "b:random": { name: "Random", url: "py/templates/random.py" },
  "b:greedy": { name: "Greedy", url: "py/templates/greedy.py" },
  "b:minimax": { name: "Minimax", url: "py/templates/minimax.py" },
};

// ---------- editor ----------
const cm = CodeMirror.fromTextArea($("code"), { mode: "python", theme: "material-darker", lineNumbers: true, indentUnit: 4, indentWithTabs: false,
  extraKeys: { Tab: (c) => c.replaceSelection("    ") } });
const text = (url) => fetch(url).then((r) => r.text());
text("py/templates/minimax.py").then((t) => cm.setValue(store.loadDraft() ?? t));
cm.on("change", () => store.saveDraft(cm.getValue()));

function refreshSaved() {
  $("saved").innerHTML = '<option value="">Saved bots…</option>' + store.listBots().map((n) => `<option>${n}</option>`).join("");
  for (const sel of [$("white"), $("black")]) {
    const cur = sel.value;
    sel.innerHTML = '<option value="human">Human</option><option value="me">My bot (editor)</option>' +
      Object.entries(BUILTIN).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join("") +
      store.listBots().map((n) => `<option value="s:${n}">Saved: ${n}</option>`).join("");
    if (cur) sel.value = cur;
  }
}
refreshSaved();
$("white").value = "human"; $("black").value = "me";

$("template").onchange = async (e) => { if (e.target.value) cm.setValue(await text(`py/templates/${e.target.value}.py`)); e.target.value = ""; };
$("save").onclick = () => { const n = $("botname").value.trim(); if (!n) return alert("Enter a bot name"); store.saveBot(n, cm.getValue()); refreshSaved(); log(`Saved "${n}"`); };
$("saved").onchange = (e) => { if (e.target.value) { cm.setValue(store.getBot(e.target.value)); $("botname").value = e.target.value; } };
$("del").onclick = () => { const n = $("saved").value; if (n && confirm(`Delete "${n}"?`)) { store.deleteBot(n); refreshSaved(); } };
$("download").onclick = () => store.download(($("botname").value.trim() || "bot") + ".py", cm.getValue());
$("upload").onchange = async (e) => { const f = e.target.files[0]; if (f) { cm.setValue(await f.text()); $("botname").value = f.name.replace(/\.py$/, ""); } e.target.value = ""; };

// ---------- log / ui ----------
function log(msg, err) {
  const el = $("log"), d = document.createElement("div");
  if (err) d.className = "err";
  d.textContent = msg; el.appendChild(d); el.scrollTop = el.scrollHeight;
}
const banner = (t) => ($("banner").textContent = t);

// ---------- workers ----------
const ref = new PyWorker();       // referee (python-chess board logic)
const slots = [new PyWorker(), new PyWorker()]; // one per player spec
Promise.all([ref.ready, ...slots.map((s) => s.ready)]).then(() => {
  $("status").textContent = "Ready";
  ["play", "match"].forEach((b) => ($(b).disabled = false));
}).catch((e) => { $("status").textContent = "Failed to load Python: " + e.message; });
["play", "match"].forEach((b) => ($(b).disabled = true));

const board = new Board($("board"), (uci) => humanResolve?.(uci));
let humanResolve = null;
let token = 0; // bump to cancel running game
let current = { ucis: [], white: "", black: "", result: "*" };

async function specSource(key) {
  if (key === "me") return { name: $("botname").value.trim() || "My bot", src: cm.getValue() };
  if (key.startsWith("s:")) return { name: key.slice(2), src: store.getBot(key.slice(2)) };
  return { name: BUILTIN[key].name, src: await text(BUILTIN[key].url) };
}

// Plays one game. Returns {result, reason, ucis}. wKey/bKey: "human" | "me" | builtin | s:name; slot index per side.
async function playGame(w, b, limit, myToken) {
  $("moves").textContent = "";
  const players = [w, b]; // {key, name, src, slot}
  for (const p of players) {
    if (p.key === "human") continue;
    await slots[p.slot].ready;
    let err = await slots[p.slot].callTimed("load", { src: p.src, name: p.name }, 5000);
    if (err && err.timeout) err = "Timed out while loading (infinite loop at top level?)";
    if (err) { log(`${p.name} failed to load:\n${err}`, true); return { result: p === w ? "0-1" : "1-0", reason: `${p.name} has an error`, ucis: [] }; }
  }
  const ucis = [];
  current = { ucis, white: w.name, black: b.name, result: "*" };
  $("moves").textContent = "";
  let last = null;
  while (true) {
    if (myToken !== token) return { result: "*", reason: "stopped", ucis };
    const st = await ref.call("status", { start: START, ucis });
    const turnWhite = st.turn === true;
    const p = turnWhite ? w : b;
    board.set(st.fen, st.legal, last); board.setCheck(st.check);
    if (st.over) return { result: st.result, reason: st.reason, ucis };
    let uci;
    if (p.key === "human") {
      board.setInteractive(true);
      uci = await new Promise((res) => (humanResolve = res));
      humanResolve = null; board.setInteractive(false);
      if (uci === null || myToken !== token) return { result: "*", reason: "stopped", ucis };
    } else {
      banner(`${p.name} is thinking…`);
      const r = await slots[p.slot].callTimed("move", { fen: st.fen, timeLeft: limit }, limit * 1000 + 1500);
      if (myToken !== token) return { result: "*", reason: "stopped", ucis };
      const lose = (reason) => ({ result: turnWhite ? "0-1" : "1-0", reason: `${p.name} ${reason}`, ucis });
      if (r.timeout) { log(`${p.name} exceeded the time limit; worker killed.`, true); return lose("lost on time"); }
      if (r.out) log(`[${p.name}] ${r.out.trimEnd()}`);
      if (r.err) { log(`[${p.name}] ${r.err}`, true); return lose("forfeits (error / illegal move)"); }
      uci = r.uci;
    }
    const { san } = await ref.call("san", { start: START, ucis, uci });
    ucis.push(uci); last = uci;
    const n = ucis.length;
    $("moves").textContent += (n % 2 ? `${(n + 1) / 2}. ` : "") + san + " ";
    $("moves").scrollTop = 1e9;
  }
}

async function makePlayer(key, color, slot) {
  if (key === "human") return { key, name: "Human", slot };
  const s = await specSource(key);
  return { key, name: s.name, src: s.src, slot };
}

function stopAll() {
  token++;
  humanResolve?.(null);
  slots.forEach((s) => s.restart()); // aborts any thinking bot
}

let busy = false;
function setBusy(v) { busy = v; $("play").disabled = $("match").disabled = v; }

$("play").onclick = async () => {
  if (busy) return;
  setBusy(true); const my = ++token;
  window.lastMatchPgn = null;
  const w = await makePlayer($("white").value, "w", 0), b = await makePlayer($("black").value, "b", 1);
  board.flipped = w.key === "human" ? false : b.key === "human";
  banner("");
  const limit = +$("movetime").value || 1;
  const g = await playGame(w, b, limit, my);
  if (my === token) { banner(`${g.result} — ${g.reason}`); current.result = g.result; log(`Game over: ${g.result} (${g.reason})`); }
  setBusy(false);
};

$("match").onclick = async () => {
  if (busy) return;
  const wk = $("white").value, bk = $("black").value;
  if (wk === "human" || bk === "human") return alert("Pick two bots for a match.");
  setBusy(true); const my = ++token;
  const A = await makePlayer(wk, "w", 0), B = await makePlayer(bk, "b", 1);
  const n = +$("games").value || 10, limit = +$("movetime").value || 1;
  let a = 0, d = 0, bw = 0, pgns = [];
  for (let i = 0; i < n && my === token; i++) {
    const aWhite = i % 2 === 0;
    const g = await playGame(aWhite ? A : B, aWhite ? B : A, limit, my);
    if (my !== token) break;
    const score = g.result === "1/2-1/2" ? 0 : (g.result === "1-0") === aWhite ? 1 : -1;
    score > 0 ? a++ : score < 0 ? bw++ : d++;
    $("tally").textContent = `${A.name}: ${a} W / ${d} D / ${bw} L (game ${i + 1}/${n})`;
    log(`Game ${i + 1}: ${g.result} (${g.reason})`);
    pgns.push(await ref.call("pgn", { start: START, ucis: g.ucis, white: aWhite ? A.name : B.name, black: aWhite ? B.name : A.name, result: g.result }));
    window.lastMatchPgn = pgns.join("\n\n");
  }
  setBusy(false);
};

$("stop").onclick = () => { stopAll(); banner("Stopped"); setBusy(false); };
$("flip").onclick = () => board.flip();
$("pgn").onclick = async () => {
  const pgn = window.lastMatchPgn && $("tally").textContent
    ? window.lastMatchPgn
    : await ref.call("pgn", { start: START, ucis: current.ucis, white: current.white || "?", black: current.black || "?", result: current.result });
  store.download("game.pgn", pgn);
};

ref.ready.then(async () => { const st = await ref.call("status", { start: START, ucis: [] }); board.set(st.fen); });
