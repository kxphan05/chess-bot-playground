const GLYPH = { K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙", k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" };

export class Board {
  constructor(el, onMove) {
    this.el = el; this.onMove = onMove;
    this.flipped = false; this.sel = null; this.legal = []; this.canMove = false;
    this.pieces = {}; this.last = null; this.checkSq = null;
    el.classList.add("board");
    el.addEventListener("click", (e) => {
      const sq = e.target.closest("[data-sq]")?.dataset.sq;
      if (sq) this.click(sq);
    });
  }
  set(fen, legal = [], last = null) {
    this.pieces = {};
    const [place, turn] = fen.split(" ");
    place.split("/").forEach((row, r) => {
      let f = 0;
      for (const ch of row) {
        if (/\d/.test(ch)) f += +ch;
        else this.pieces["abcdefgh"[f++] + (8 - r)] = ch;
      }
    });
    this.turn = turn; this.legal = legal; this.last = last; this.sel = null;
    this.checkSq = null;
    this.render();
  }
  setCheck(inCheck) {
    if (!inCheck) return;
    const k = this.turn === "w" ? "K" : "k";
    this.checkSq = Object.keys(this.pieces).find((s) => this.pieces[s] === k);
    this.render();
  }
  setInteractive(on) { this.canMove = on; this.sel = null; this.render(); }
  flip() { this.flipped = !this.flipped; this.render(); }
  targets() { return this.sel ? this.legal.filter((m) => m.startsWith(this.sel)).map((m) => m.slice(2, 4)) : []; }
  click(sq) {
    if (!this.canMove) return;
    const mine = this.pieces[sq] && (this.pieces[sq] === this.pieces[sq].toUpperCase()) === (this.turn === "w");
    if (this.sel && this.targets().includes(sq)) {
      const from = this.sel, base = from + sq;
      const promos = this.legal.filter((m) => m.startsWith(base) && m.length === 5);
      this.sel = null;
      if (promos.length) this.askPromo((p) => this.onMove(base + p));
      else this.onMove(base);
      this.render();
      return;
    }
    this.sel = mine && this.legal.some((m) => m.startsWith(sq)) ? sq : null;
    this.render();
  }
  askPromo(cb) {
    const box = document.createElement("div");
    box.className = "promo";
    for (const p of "qrbn") {
      const b = document.createElement("button");
      b.textContent = GLYPH[this.turn === "w" ? p.toUpperCase() : p];
      b.onclick = () => { box.remove(); cb(p); };
      box.appendChild(b);
    }
    this.el.appendChild(box);
  }
  render() {
    const t = this.targets();
    let html = "";
    for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
      const file = this.flipped ? 7 - f : f, rank = this.flipped ? r + 1 : 8 - r;
      const sq = "abcdefgh"[file] + rank;
      const cls = ["sq", (file + rank) % 2 ? "light" : "dark"];
      if (sq === this.sel) cls.push("sel");
      if (t.includes(sq)) cls.push(this.pieces[sq] ? "cap" : "tgt");
      if (this.last && (sq === this.last.slice(0, 2) || sq === this.last.slice(2, 4))) cls.push("last");
      if (sq === this.checkSq) cls.push("check");
      const p = this.pieces[sq];
      html += `<div class="${cls.join(" ")}" data-sq="${sq}">${p ? `<span class="pc ${p === p.toUpperCase() ? "w" : "b"}">${GLYPH[p]}</span>` : ""}</div>`;
    }
    this.el.innerHTML = html;
  }
}
