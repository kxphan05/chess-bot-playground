"""Round-robin tournament for chess bots (one .py file per scholar).

usage: python learn/tools/tournament.py bots/ [--rounds 1] [--time 1.0]
                                              [--out leaderboard.md] [--json bots/arena.json]

Each .py file must define choose_move(board, time_left). Optional first-lines
comments `# name: Cool Bot` and `# author: Alice` set the display name/author.
Every pair plays `rounds` games as White and `rounds` as Black.
Win 1, draw 0.5, loss 0. Crash / illegal move / over the time limit = loss.
Games are capped at 200 plies and then scored as a draw.
Uses signal timers, so Linux/macOS only. Bots are ordinary Python with full
access to the machine: only run them somewhere you don't mind (e.g. CI runner).
"""
import argparse, contextlib, datetime, glob, importlib.util, itertools, json, os, random, re, signal, sys
import chess

MAX_PLIES = 200
QUIET = open(os.devnull, "w")
class Timeout(Exception): pass
def _alarm(*_): raise Timeout()
signal.signal(signal.SIGALRM, _alarm)


def meta(path):
    """Reads optional '# name:' / '# author:' comments from the top of the file."""
    stem = os.path.basename(path)[:-3]
    m = {"id": stem, "file": os.path.basename(path), "name": stem, "author": ""}
    with open(path, encoding="utf-8", errors="replace") as f:
        for line in f.readlines()[:15]:
            g = re.match(r"\s*#\s*(name|author)\s*:\s*(.+)", line, re.I)
            if g: m[g.group(1).lower()] = g.group(2).strip()[:40]
    return m


def load(path):
    spec = importlib.util.spec_from_file_location("bot_" + os.path.basename(path)[:-3], path)
    mod = importlib.util.module_from_spec(spec)
    signal.setitimer(signal.ITIMER_REAL, 5)        # top-level code gets 5 s
    try: spec.loader.exec_module(mod)
    finally: signal.setitimer(signal.ITIMER_REAL, 0)
    if not callable(getattr(mod, "choose_move", None)):
        raise ValueError("no choose_move(board, time_left) function")
    return mod.choose_move


def play(white, black, limit):
    """Returns (score_for_white, reason, uci_list)."""
    board = chess.Board()
    ucis = []
    while not board.is_game_over(claim_draw=True) and board.ply() < MAX_PLIES:
        white_turn = board.turn == chess.WHITE
        f = white if white_turn else black
        lose = 0.0 if white_turn else 1.0
        side = "White" if white_turn else "Black"
        signal.setitimer(signal.ITIMER_REAL, limit + 1.5)  # same grace as the website
        try:
            with contextlib.redirect_stdout(QUIET):   # bots' print() would flood the log
                mv = f(board.copy(), limit)
        except Timeout:
            return lose, f"{side} lost on time", ucis
        except Exception as e:
            return lose, f"{side} crashed: {type(e).__name__}: {e}"[:100], ucis
        finally:
            signal.setitimer(signal.ITIMER_REAL, 0)
        if isinstance(mv, str):
            try: mv = chess.Move.from_uci(mv)
            except ValueError: pass
        if not isinstance(mv, chess.Move) or mv not in board.legal_moves:
            return lose, f"{side} played an illegal move ({mv!r})"[:100], ucis
        board.push(mv); ucis.append(mv.uci())
    if board.is_game_over(claim_draw=True):
        r = board.result(claim_draw=True)
        why = ("checkmate" if board.is_checkmate() else "stalemate" if board.is_stalemate()
               else "insufficient material" if board.is_insufficient_material()
               else "repetition" if board.can_claim_threefold_repetition() else "50-move rule")
        return {"1-0": 1.0, "0-1": 0.0}.get(r, 0.5), why, ucis
    return 0.5, f"draw: {MAX_PLIES // 2}-move cap", ucis


def elo(names, results, k=24, passes=30):
    """results: list of (a, b, score_a). Simple iterated Elo, order-shuffled."""
    r = {n: 1000.0 for n in names}
    rng = random.Random(1)
    results = list(results)
    for _ in range(passes):
        rng.shuffle(results)
        for a, b, s in results:
            ea = 1 / (1 + 10 ** ((r[b] - r[a]) / 400))
            r[a] += k * (s - ea); r[b] -= k * (s - ea)
    return r


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("folder"); ap.add_argument("--rounds", type=int, default=1)
    ap.add_argument("--time", type=float, default=1.0)
    ap.add_argument("--out", default="leaderboard.md"); ap.add_argument("--json", default="")
    a = ap.parse_args()
    sys.path.insert(0, os.path.abspath(a.folder))
    bots, info, broken = {}, {}, []
    for p in sorted(glob.glob(os.path.join(a.folder, "*.py"))):
        m = meta(p)
        try:
            bots[m["id"]] = load(p); info[m["id"]] = m
        except BaseException as e:
            print(f"! could not load {m['file']}: {e}"); broken.append({**m, "error": f"{type(e).__name__}: {e}"[:200]})
    names = list(bots)
    S = {n: {"points": 0.0, "played": 0, "w": 0, "d": 0, "l": 0, "problems": []} for n in names}
    results, games = [], []
    for x, y in itertools.combinations(names, 2):
        for i in range(a.rounds * 2):
            w, b = (x, y) if i % 2 == 0 else (y, x)
            s, why, ucis = play(bots[w], bots[b], a.time)
            for n, sc in ((w, s), (b, 1 - s)):
                st = S[n]; st["points"] += sc; st["played"] += 1
                st["w" if sc == 1 else "d" if sc == 0.5 else "l"] += 1
            if any(k in why for k in ("crashed", "on time", "illegal")):
                S[w if s == 0 else b]["problems"].append(why)
            results.append((w, b, s))
            res = {1.0: "1-0", 0.0: "0-1"}.get(s, "1/2-1/2")
            games.append({"white": w, "black": b, "result": res, "reason": why, "moves": ucis})
            print(f"{w} vs {b}: {res} ({why}, {len(ucis)} plies)", flush=True)
    rating = elo(names, results)
    order = sorted(names, key=lambda n: (-S[n]["points"], -rating[n]))
    lines = ["# Leaderboard", "", "| # | Bot | Author | Points | W | D | L | Elo* | Problems |", "|---|---|---|---|---|---|---|---|---|"]
    standings = []
    for i, n in enumerate(order, 1):
        st = S[n]; probs = st["problems"]
        lines.append(f"| {i} | {info[n]['name']} | {info[n]['author']} | {st['points']:g}/{st['played']} | {st['w']} | {st['d']} | {st['l']} "
                     f"| {rating[n]:.0f} | {f'{len(probs)} ({probs[0]})' if probs else ''} |")
        standings.append({"id": n, **{k: st[k] for k in ("points", "played", "w", "d", "l")},
                          "elo": round(rating[n]), "problems": probs[:3], "problem_count": len(probs)})
    for b in broken:
        lines.append(f"| – | {b['name']} | {b['author']} | could not load: {b['error'][:60]} | | | | | |")
    lines += ["", "*Elo is a rough estimate from few games; points decide the ranking.",
              f"Settings: {a.rounds * 2} games per pair, {a.time}s per move, {MAX_PLIES // 2}-move cap."]
    open(a.out, "w").write("\n".join(lines) + "\n"); print("\n".join(lines))
    if a.json:
        json.dump({"updated": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
                   "settings": {"games_per_pair": a.rounds * 2, "time": a.time, "max_moves": MAX_PLIES // 2},
                   "bots": [info[n] for n in names] + broken, "standings": standings, "games": games},
                  open(a.json, "w"), separators=(",", ":"))
        print("wrote", a.json)


if __name__ == "__main__":
    main()
