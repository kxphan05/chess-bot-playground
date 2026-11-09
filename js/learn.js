// Chess Bot Quest - visual, interactive lessons. Pure JS (no Python needed, loads instantly).
const $ = (s, r = document) => r.querySelector(s);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const GLYPH = { K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙", k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" };
const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
const FILES = "abcdefgh";

// ---------- progress ----------
const KEY = "quest-progress";
const prog = JSON.parse(localStorage.getItem(KEY) || "{}");
const saveProg = () => localStorage.setItem(KEY, JSON.stringify(prog));

// ---------- helpers ----------
function parseFen(fen) {
  const pcs = {};
  fen.split(" ")[0].split("/").forEach((row, r) => {
    let f = 0;
    for (const ch of row) { if (/\d/.test(ch)) f += +ch; else pcs[FILES[f++] + (8 - r)] = ch; }
  });
  return pcs;
}
const isWhite = (p) => p === p.toUpperCase();
function evalPieces(pcs) {
  let s = 0;
  for (const p of Object.values(pcs)) s += isWhite(p) ? VAL[p.toLowerCase()] : -VAL[p.toLowerCase()];
  return s;
}
const fmt = (s) => (s > 0 ? "+" + s : "" + s);
function hl(code) { // tiny python highlighter
  return code.replace(/&/g, "&amp;").replace(/</g, "&lt;").split("\n").map((line) => {
    const i = line.indexOf("#");
    const body = i >= 0 ? line.slice(0, i) : line, cm = i >= 0 ? `<span class="cm">${line.slice(i)}</span>` : "";
    return body.replace(/\b(def|return|for|in|if|else|elif|import|and|or|not|None|True|False|break|max|min)\b/g, '<span class="kw">$1</span>')
      .replace(/\b(\d+)\b/g, '<span class="nu">$1</span>') + cm;
  }).join("\n");
}
function confetti(x = innerWidth / 2, y = innerHeight / 2) {
  const fx = $("#fx");
  for (let i = 0; i < 24; i++) {
    const s = document.createElement("span");
    s.textContent = ["🎉", "⭐", "♞", "♛", "✨", "🏆"][i % 6];
    s.style.left = x + "px"; s.style.top = y + "px";
    const a = Math.random() * Math.PI * 2, d = 80 + Math.random() * 180;
    s.style.setProperty("--dx", Math.cos(a) * d + "px"); s.style.setProperty("--dy", Math.sin(a) * d - 60 + "px");
    s.style.setProperty("--r", (Math.random() * 720 - 360) + "deg");
    fx.appendChild(s); setTimeout(() => s.remove(), 1300);
  }
}

// Mini board: pieces {sq:ch}; marks {sq:"sel"|"dot"|"hit"}; arrows [[from,to,color]]
function miniBoard(el, onClick) {
  const st = { pcs: {}, marks: {}, arrows: [], popSq: null };
  el.classList.add("mb");
  el.addEventListener("click", (e) => { const sq = e.target.closest("[data-sq]")?.dataset.sq; if (sq && onClick) onClick(sq, e); });
  const xy = (sq) => [FILES.indexOf(sq[0]) + 0.5, 8 - +sq[1] + 0.5];
  st.draw = () => {
    let h = "";
    for (let r = 8; r >= 1; r--) for (let f = 0; f < 8; f++) {
      const sq = FILES[f] + r, p = st.pcs[sq];
      const cls = ["sq", (f + r) % 2 ? "l" : "d", st.marks[sq] || ""];
      h += `<div class="${cls.join(" ")}" data-sq="${sq}">${p ? `<span class="${isWhite(p) ? "w" : "b"} ${st.popSq === sq ? "pop" : ""}">${GLYPH[p]}</span>` : ""}</div>`;
    }
    if (st.arrows.length) {
      h += `<svg viewBox="0 0 8 8"><defs>${st.arrows.map((a, i) => `<marker id="ah${el.id}${i}" markerWidth="3" markerHeight="3" refX="1.5" refY="1.5" orient="auto"><path d="M0,0 L3,1.5 L0,3 z" fill="${a[2] || "#f6c84c"}"/></marker>`).join("")}</defs>`;
      st.arrows.forEach(([a, b, c], i) => {
        const [x1, y1] = xy(a), [x2, y2] = xy(b), dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy);
        h += `<line x1="${x1}" y1="${y1}" x2="${x2 - dx / L * 0.35}" y2="${y2 - dy / L * 0.35}" stroke="${c || "#f6c84c"}" stroke-width="0.17" stroke-linecap="round" opacity=".9" marker-end="url(#ah${el.id}${i})"/>`;
      });
      h += "</svg>";
    }
    el.innerHTML = h; st.popSq = null;
  };
  return st;
}

function tug(el) {
  el.innerHTML = `<div class="tug"><div class="wside"></div><div class="mid"></div></div><div class="tug-label"><span>⚪ White</span><span>Black ⚫</span></div>`;
  return (score) => { const pct = 50 + Math.max(-1, Math.min(1, score / 15)) * 50; $(".wside", el).style.width = pct + "%"; };
}

// ---------- level definitions ----------
const LEVELS = [
  { e: "👀", title: "Meet the board", mission: "Click a white piece. Dots = moves it can make.", toy: toyExplore,
    code: `for move in board.legal_moves:\n    print(board.san(move))   # e4, Nf3, ...` },
  { e: "🎲", title: "Roll the dice", mission: "Your first bot: pick ANY legal move. Roll it!", toy: toyRandom,
    code: `def choose_move(board, time_left):\n    return random.choice(list(board.legal_moves))` },
  { e: "⚖️", title: "Count the treasure", mission: "Click pieces to capture them. Watch the score tug.", toy: toyEval,
    code: `score = 0\nfor piece in board.piece_map().values():\n    v = VALUES[piece.piece_type]\n    score += v if piece.color == chess.WHITE else -v` },
  { e: "👹", title: "The greedy goblin", mission: "Try every move, keep the best score. What could go wrong?", toy: toyGreedy,
    code: `for move in board.legal_moves:\n    board.push(move)          # try it\n    score = evaluate(board)   # score it\n    board.pop()               # undo it!` },
  { e: "🧠", title: "Think like your opponent", mission: "Guess the best move. Your opponent always picks the 😈 smallest number.", toy: toyMinimax,
    code: `def minimax(board, depth):\n    if depth == 0: return evaluate(board)\n    scores = [ ...minimax(child, depth - 1)... ]\n    return max(scores) if white_to_move else min(scores)` },
  { e: "✂️", title: "Snip snip!", mission: "Same answer, less work: stop checking a move once it's already worse.", toy: toyAlphaBeta,
    code: `best = max(best, score)\nalpha = max(alpha, best)\nif alpha >= beta:\n    break     # ✂️ snip the rest` },
  { e: "🚀", title: "Power-ups", mission: "Flip a card. Add ONE power-up, then run a match to see if it helped.", toy: toyPowerups,
    code: `# Lesson 7 starts with a working alpha-beta bot.\n# Make it yours, then challenge your friends!` },
];

function buildLevels() {
  const main = $("#levels"), map = $("#map");
  LEVELS.forEach((L, i) => {
    const n = i + 1;
    const sec = document.createElement("section");
    sec.className = "level"; sec.id = "lvl" + n;
    sec.innerHTML = `<div class="toy"></div><div>
      <span class="lvl-tag">Level ${n}</span><h2>${L.e} ${L.title}</h2>
      <p class="mission">${L.mission}</p>
      <pre class="code">${hl(L.code)}</pre>
      <div class="row"><a class="btn go" href="index.html?lesson=${n}">Try it ▶</a>
      <button class="donebtn">${prog[n] ? "✅ Done!" : "☐ I did it"}</button></div></div>`;
    main.appendChild(sec);
    L.toy($(".toy", sec), n);
    const a = document.createElement("a"); a.href = "#lvl" + n; a.textContent = L.e; a.title = L.title; a.id = "map" + n; map.appendChild(a);
    $(".donebtn", sec).onclick = (e) => {
      prog[n] = !prog[n]; saveProg(); refresh();
      e.target.textContent = prog[n] ? "✅ Done!" : "☐ I did it";
      if (prog[n]) { const r = e.target.getBoundingClientRect(); confetti(r.x + r.width / 2, r.y); }
    };
  });
  refresh();
}
function refresh() {
  const done = LEVELS.filter((_, i) => prog[i + 1]).length;
  $("#xpfill").style.width = (done / LEVELS.length) * 100 + "%";
  $("#xptext").textContent = done === LEVELS.length ? "🏆 7 / 7 – Quest complete!" : `${done} / 7 levels`;
  LEVELS.forEach((_, i) => $("#map" + (i + 1)).classList.toggle("ok", !!prog[i + 1]));
  LEVELS.forEach((_, i) => { const b = $(`#lvl${i + 1} .donebtn`); if (b) b.classList.toggle("done", !!prog[i + 1]); });
}

// ---------- Level 1: explore ----------
function startMoves(sq) { // legal moves from the start position for white pieces
  const p = parseFen(START)[sq];
  if (p === "P") return [sq[0] + "3", sq[0] + "4"];
  if (p === "N") return sq === "b1" ? ["a3", "c3"] : ["f3", "h3"];
  return [];
}
const NAMES = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };
function toyExplore(el) {
  el.innerHTML = `<div id="b1"></div><p class="say"></p><div class="row"><span class="chip">board.legal_moves.count() → <b>20</b></span></div>`;
  const say = $(".say", el);
  const b = miniBoard($("#b1", el), (sq) => {
    const p = b.pcs[sq]; b.marks = {};
    if (!p) { say.textContent = `${sq}: empty square`; b.draw(); return; }
    const name = `${isWhite(p) ? "white" : "black"} ${NAMES[p.toLowerCase()]}`;
    if (!isWhite(p)) { say.textContent = `${GLYPH[p]} ${name} – but it's White's turn ⏳`; b.draw(); return; }
    const mv = startMoves(sq);
    b.marks[sq] = "sel"; mv.forEach((m) => (b.marks[m] = "dot"));
    say.textContent = mv.length ? `${GLYPH[p]} ${name}: ${mv.length} moves` : `${GLYPH[p]} ${name}: blocked 🚧`;
    b.draw();
  });
  b.pcs = parseFen(START); b.draw();
  say.textContent = "👆 click a piece";
}

// ---------- Level 2: random ----------
function allStartMoves() {
  const out = [];
  for (const sq of Object.keys(parseFen(START))) for (const to of startMoves(sq)) out.push([sq, to]);
  return out;
}
function san([from, to]) { return parseFen(START)[from] === "N" ? "N" + to : to; }
function toyRandom(el) {
  el.innerHTML = `<div id="b2"></div><div class="row"><button class="go" id="roll">🎲 Roll!</button><span class="say"></span></div><p class="tiny" id="rolls"></p>`;
  const b = miniBoard($("#b2", el)); b.pcs = parseFen(START); b.draw();
  const moves = allStartMoves(); let n = 0; const seen = new Set();
  $("#roll", el).onclick = async (e) => {
    e.target.disabled = true;
    let m;
    for (let i = 0; i < 12; i++) { m = moves[Math.floor(Math.random() * moves.length)]; b.arrows = [[m[0], m[1], "#b48cff"]]; b.draw(); $(".say", el).textContent = "🎲 " + san(m); await sleep(50 + i * 12); }
    b.arrows = [[m[0], m[1]]]; b.draw();
    $(".say", el).textContent = `Bot plays ${san(m)}!`;
    n++; seen.add(san(m));
    $("#rolls", el).textContent = `Rolled ${n}× · seen ${seen.size}/20 different moves` + (seen.size === 20 ? " 🏅" : "");
    e.target.disabled = false;
  };
}

// ---------- Level 3: evaluate ----------
const EVAL_FEN = "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R";
function toyEval(el) {
  el.innerHTML = `<div id="b3"></div><div class="tugbox"></div>
    <div class="row"><span>evaluate(board) →</span><span class="score-big">0</span></div>
    <div class="tray"></div>
    <div class="coins">${["p", "n", "b", "r", "q"].map((k) => `<span class="coin">${GLYPH[k]} <b>${VAL[k]}</b></span>`).join("")}</div>
    <div class="row"><button class="reset">↺ reset</button></div>`;
  const setTug = tug($(".tugbox", el)), score = $(".score-big", el), tray = $(".tray", el);
  const upd = () => { const s = evalPieces(b.pcs); score.textContent = fmt(s); score.className = "score-big " + (s > 0 ? "pos" : s < 0 ? "neg" : ""); setTug(s); };
  const b = miniBoard($("#b3", el), (sq) => {
    const p = b.pcs[sq]; if (!p) return;
    if (p.toLowerCase() === "k") { const c = $(`[data-sq="${sq}"]`, el); c.classList.add("shake"); setTimeout(() => c.classList.remove("shake"), 400); tray.textContent = "👑 Kings are never captured (worth 0)"; return; }
    if (tray.textContent.startsWith("👑")) tray.textContent = "";
    delete b.pcs[sq]; tray.textContent += GLYPH[p]; b.draw(); upd();
  });
  const reset = () => { b.pcs = parseFen(EVAL_FEN); tray.textContent = ""; b.draw(); upd(); };
  $(".reset", el).onclick = reset; reset();
}

// ---------- Level 4: greedy ----------
const GREEDY_FEN = "4k3/8/2p5/3p4/8/8/3Q4/4K3";
function toyGreedy(el) {
  el.innerHTML = `<div id="b4"></div><div class="tugbox"></div>
    <div class="stepper"><span>push</span><span>evaluate</span><span>pop</span></div>
    <div class="cands"></div><p class="say"></p>
    <div class="row"><button class="go run">👹 Think greedy</button><button class="next" disabled>😈 …and then?</button><button class="reset">↺</button></div>`;
  const b = miniBoard($("#b4", el)), setTug = tug($(".tugbox", el)), say = $(".say", el), steps = [...el.querySelectorAll(".stepper span")];
  const C = [["d2", "d5", "Qxd5"], ["d2", "d4", "Qd4"], ["d2", "a5", "Qa5"], ["d2", "h6", "Qh6"]];
  const step = (i) => steps.forEach((s, j) => s.classList.toggle("on", j === i));
  const after = (from, to, base) => { const p = { ...base }; p[to] = p[from]; delete p[from]; return p; };
  let base;
  const reset = () => {
    base = parseFen(GREEDY_FEN); b.pcs = { ...base }; b.arrows = []; b.marks = {}; b.draw(); setTug(evalPieces(base)); step(-1);
    $(".cands", el).innerHTML = C.map((c) => `<div class="cand"><div>${c[2]}</div><div class="s">?</div></div>`).join("");
    say.textContent = "White to move. Score now: " + fmt(evalPieces(base)); $(".run", el).disabled = false; $(".next", el).disabled = true;
  };
  $(".reset", el).onclick = reset;
  $(".run", el).onclick = async (e) => {
    e.target.disabled = true; const cards = [...el.querySelectorAll(".cand")]; let best = -1, bs = -99;
    for (let i = 0; i < C.length; i++) {
      const [f, t] = C[i]; cards.forEach((c, j) => c.classList.toggle("now", j === i));
      step(0); b.pcs = after(f, t, base); b.popSq = t; b.arrows = [[f, t]]; b.draw(); await sleep(550);
      step(1); const s = evalPieces(b.pcs); $(".s", cards[i]).textContent = fmt(s); setTug(s); await sleep(550);
      step(2); b.pcs = { ...base }; b.arrows = []; b.draw(); setTug(evalPieces(base)); await sleep(350);
      if (s > bs) { bs = s; best = i; }
    }
    step(-1); cards.forEach((c, j) => { c.classList.remove("now"); c.classList.toggle("best", j === best); });
    const [f, t, n] = C[best];
    b.pcs = after(f, t, base); b.arrows = [[f, t]]; b.draw(); setTug(bs);
    say.textContent = `😋 Yum! ${n} wins a pawn: ${fmt(bs)}`; $(".next", el).disabled = false;
  };
  $(".next", el).onclick = async (e) => {
    e.target.disabled = true;
    b.marks = { c6: "sel", d5: "hit" }; b.arrows = [["c6", "d5", "#f85149"]]; b.draw(); await sleep(700);
    b.pcs = after("c6", "d5", b.pcs); b.popSq = "d5"; b.marks = {}; b.arrows = []; b.draw();
    const s = evalPieces(b.pcs); setTug(s);
    say.innerHTML = `💥 Pawn takes queen! Score ${fmt(s)}.<br>Greedy never asks <i>“what will they do next?”</i> → Level 5`;
  };
  reset();
}

// ---------- tree drawing (levels 5 & 6) ----------
function drawTree(svg, leaves, k, st) {
  // st: {mid:[vals|null], root:val|null, win:idx|-1, lit:Set(leafIdx), cut:Set(leafIdx), guess:idx}
  const W = 420, nB = leaves.length / k, xs = (i, n) => (W / n) * (i + 0.5);
  let h = "";
  const rootX = W / 2, midY = 100, leafY = 185;
  for (let i = 0; i < nB; i++) {
    const mx = xs(i, nB);
    h += `<line class="edge ${st.win === i ? "win" : ""}" x1="${rootX}" y1="30" x2="${mx}" y2="${midY}"/>`;
    h += `<text class="lbl" x="${(rootX + mx) / 2 + (i - (nB - 1) / 2) * 14}" y="${(30 + midY) / 2 - 8}">move ${"ABC"[i]}</text>`;
    for (let j = 0; j < k; j++) h += `<line class="edge" x1="${mx}" y1="${midY}" x2="${xs(i * k + j, leaves.length)}" y2="${leafY}"/>`;
  }
  h += `<circle class="node max ${st.root != null ? "win" : ""}" cx="${rootX}" cy="30" r="20"/><text x="${rootX}" y="30">${st.root ?? "😀"}</text>`;
  for (let i = 0; i < nB; i++) {
    const mx = xs(i, nB), v = st.mid[i];
    h += `<g class="${st.clickable ? "clickable" : ""}" data-b="${i}"><circle class="node min ${st.win === i ? "win" : ""} ${st.guess === i ? "lit" : ""}" cx="${mx}" cy="${midY}" r="20"/><text x="${mx}" y="${midY}">${v ?? "😈"}</text></g>`;
  }
  leaves.forEach((v, i) => {
    const x = xs(i, leaves.length), cut = st.cut.has(i);
    h += `<rect class="node ${st.lit.has(i) ? "lit" : ""} ${cut ? "cut" : ""}" x="${x - 16}" y="${leafY - 16}" width="32" height="32" rx="7"/><text class="${cut ? "cut" : ""}" x="${x}" y="${leafY}">${cut ? "✂️" : v}</text>`;
  });
  svg.innerHTML = h;
}

// ---------- Level 5: minimax quiz ----------
function makeTree(k, nB = 3) {
  for (;;) {
    const leaves = Array.from({ length: nB * k }, () => 1 + Math.floor(Math.random() * 9));
    const mins = [...Array(nB)].map((_, i) => Math.min(...leaves.slice(i * k, i * k + k)));
    const best = mins.indexOf(Math.max(...mins));
    if (mins.filter((m) => m === mins[best]).length > 1) continue; // unique answer
    const maxLeafBranch = Math.floor(leaves.indexOf(Math.max(...leaves)) / k);
    if (maxLeafBranch !== best || Math.random() < 0.25) return { leaves, mins, best }; // usually a trap
  }
}
function toyMinimax(el) {
  el.innerHTML = `<svg class="tree" viewBox="0 0 420 210"></svg><p class="say"></p>
    <div class="row"><button class="new">🔀 New puzzle</button><span class="tiny streak"></span></div>
    <p class="legend">😀 you pick the <b class="pos">MAX</b> · 😈 opponent picks the <b class="neg">MIN</b> · bottom = evaluate()</p>`;
  const svg = $("svg", el), say = $(".say", el);
  let T, busy = false, streak = 0, best = +(localStorage.getItem("quest-streak") || 0);
  const showStreak = () => ($(".streak", el).textContent = `🔥 streak ${streak} · best ${best}`);
  const fresh = () => {
    T = makeTree(2); busy = false;
    drawTree(svg, T.leaves, 2, { mid: [null, null, null], root: null, win: -1, lit: new Set(), cut: new Set(), clickable: true });
    say.textContent = "👆 Which move (A, B or C) should 😀 pick?";
  };
  svg.addEventListener("click", async (e) => {
    const g = e.target.closest("[data-b]"); if (!g || busy) return; busy = true;
    const guess = +g.dataset.b, st = { mid: [null, null, null], root: null, win: -1, lit: new Set(), cut: new Set(), guess };
    for (let i = 0; i < 3; i++) {
      st.lit = new Set([i * 2, i * 2 + 1]); drawTree(svg, T.leaves, 2, st); await sleep(450);
      st.mid[i] = T.mins[i]; drawTree(svg, T.leaves, 2, st); say.textContent = `😈 After move ${"ABC"[i]}, opponent picks ${T.mins[i]}`; await sleep(500);
    }
    st.lit = new Set(); st.root = T.mins[T.best]; st.win = T.best; drawTree(svg, T.leaves, 2, st);
    if (guess === T.best) {
      streak++; if (streak > best) { best = streak; localStorage.setItem("quest-streak", best); }
      say.textContent = `🎉 Yes! Move ${"ABC"[T.best]} guarantees ${T.mins[T.best]}. You think like minimax!`;
      const r = svg.getBoundingClientRect(); confetti(r.x + r.width / 2, r.y + 30);
    } else {
      streak = 0;
      say.textContent = `😬 Move ${"ABC"[guess]} lets 😈 pick ${T.mins[guess]}. Move ${"ABC"[T.best]} guarantees ${T.mins[T.best]}.`;
    }
    showStreak();
  });
  $(".new", el).onclick = fresh; fresh(); showStreak();
}

// ---------- Level 6: alpha-beta ----------
function abTrace(leaves, k) { // root MAX over MIN nodes, returns steps
  const steps = []; let best = -Infinity; const nB = leaves.length / k;
  for (let i = 0; i < nB; i++) {
    let m = Infinity;
    for (let j = 0; j < k; j++) {
      const idx = i * k + j; m = Math.min(m, leaves[idx]);
      steps.push({ t: "look", idx, i, m, best });
      if (m <= best && j < k - 1) {
        const cut = []; for (let q = j + 1; q < k; q++) cut.push(i * k + q);
        steps.push({ t: "cut", i, cut, m, best }); break;
      }
    }
    best = Math.max(best, m); steps.push({ t: "done", i, m, best });
  }
  return steps;
}
function toyAlphaBeta(el) {
  el.innerHTML = `<svg class="tree" viewBox="0 0 420 210"></svg><p class="say"></p>
    <div class="row"><button class="go auto">▶ Play</button><button class="step">⏭ Step</button><button class="new">🔀 New</button></div>
    <p class="row"><span class="chip counter"></span></p>`;
  const svg = $("svg", el), say = $(".say", el), K = 3;
  let leaves, steps, at, st, playing = false;
  const fresh = () => {
    for (;;) { leaves = Array.from({ length: 9 }, () => 1 + Math.floor(Math.random() * 9)); steps = abTrace(leaves, K); if (steps.filter((s) => s.t === "cut").reduce((a, s) => a + s.cut.length, 0) >= 2) break; }
    at = 0; playing = false; st = { mid: [null, null, null], root: null, win: -1, lit: new Set(), cut: new Set() };
    drawTree(svg, leaves, K, st); say.textContent = "Press ▶ and watch for ✂️"; count();
  };
  const count = () => { const seen = st.lit.size; $(".counter", el).textContent = `👀 leaves checked: ${seen} · ✂️ skipped: ${st.cut.size}`; };
  const doStep = () => {
    if (at >= steps.length) return false;
    const s = steps[at++], B = "ABC"[s.i];
    if (s.t === "look") { st.lit.add(s.idx); say.textContent = `Move ${B}: 😈 can reach ${leaves[s.idx]}`; }
    if (s.t === "cut") { s.cut.forEach((c) => st.cut.add(c)); st.mid[s.i] = "≤" + s.m; say.textContent = `✂️ Move ${B} is already ≤ ${s.m}, worse than the ${s.best} we have. Snip!`; }
    if (s.t === "done") { if (st.mid[s.i] == null) st.mid[s.i] = s.m; say.textContent = `Move ${B} is worth ${st.mid[s.i]}. Best so far: ${s.best}`; }
    if (at >= steps.length) {
      const best = steps[at - 1].best; st.root = best;
      st.win = [0, 1, 2].find((i) => st.mid[i] === best);
      const saved = Math.round((st.cut.size / leaves.length) * 100);
      say.textContent = `🏁 Same answer (${best}) and we skipped ${saved}% of the work!`;
      const r = svg.getBoundingClientRect(); confetti(r.x + r.width / 2, r.y + 30);
    }
    drawTree(svg, leaves, K, st); count(); return true;
  };
  $(".step", el).onclick = () => { playing = false; doStep(); };
  $(".auto", el).onclick = async () => { if (playing) return; playing = true; while (playing && doStep()) await sleep(800); playing = false; };
  $(".new", el).onclick = fresh; fresh();
}

// ---------- Level 7: power-ups ----------
const POWER = [
  ["⚡", "Captures first", 1, "moves = sorted(\n  board.legal_moves,\n  key=board.is_capture,\n  reverse=True)\n# more ✂️ snips!"],
  ["🏁", "Faster mates", 1, "# in evaluate():\nreturn MATE_SCORE + depth\n# mate sooner = better"],
  ["🎯", "Love the centre", 2, "CENTER = [chess.D4, chess.E4,\n          chess.D5, chess.E5]\n# +0.2 for a piece there"],
  ["🦵", "Mobility", 2, "# more moves = more freedom\nscore += 0.1 * len(\n  list(board.legal_moves))"],
  ["🏰", "Castle early", 2, "if board.has_castling_rights(\n    chess.WHITE): score += 0.3"],
  ["⏱️", "Use the clock", 3, "depth = 1\nwhile time_used < time_left/3:\n    best = search(depth)\n    depth += 1"],
  ["🌊", "Calm search", 3, "# at depth 0, keep searching\n# captures only, so you don't\n# stop in the middle of a trade"],
];
function toyPowerups(el) {
  el.innerHTML = `<div class="cards">${POWER.map(([e, n, d, c]) => `<div class="card"><div class="inner"><div class="front"><div class="e">${e}</div><div class="n">${n}</div><div class="st">${"★".repeat(d)}${"☆".repeat(3 - d)}</div></div><div class="back">${c.replace(/</g, "&lt;")}</div></div></div>`).join("")}</div>
  <p class="tiny">★ = easy · ★★★ = boss level</p>`;
  el.querySelectorAll(".card").forEach((c) => (c.onclick = () => c.classList.toggle("flip")));
  el.style.minWidth = "min(340px,88vw)";
}

// ---------- bosses ----------
const BOSSES = [["🎲", "Random", "b:random"], ["👹", "Greedy", "b:greedy"], ["🧠", "Minimax", "b:minimax"], ["🤖", "PyBot", "b:pybot"]];
function buildBosses() {
  const L = $("#ladder");
  L.innerHTML = BOSSES.map(([e, n, k], i) => `${i ? '<span class="ladder-arrow">➜</span>' : ""}<div class="boss ${prog["boss_" + k] ? "beat" : ""}" data-k="${k}"><div class="e">${e}</div><div>${n}</div><a class="tiny" href="index.html?white=${k}&black=me">fight ⚔️</a></div>`).join("");
  L.querySelectorAll(".boss").forEach((b) => (b.onclick = (e) => {
    if (e.target.tagName === "A") return;
    const k = "boss_" + b.dataset.k; prog[k] = !prog[k]; saveProg(); b.classList.toggle("beat", !!prog[k]);
    if (prog[k]) { const r = b.getBoundingClientRect(); confetti(r.x + r.width / 2, r.y); }
  }));
}

buildLevels();
buildBosses();
