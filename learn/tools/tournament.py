"""Round-robin tournament for chess bots (one .py file per scholar).

usage: python tools/tournament.py bots_folder [--rounds 2] [--time 2.0] [--out leaderboard.md]

Each .py file in the folder must define choose_move(board, time_left).
Every pair plays `rounds` games as White and `rounds` as Black.
Scoring: win 1, draw 0.5, loss 0.  A bot that crashes, returns an illegal move
or goes over the time limit loses that game (reason is recorded).
Games are capped at 200 plies and then scored as a draw.
Uses signal.alarm, so Linux/macOS only.  Only run bots you trust: they are
ordinary Python programs with full access to this machine.
"""
import sys, os, glob, signal, argparse, importlib.util, itertools, random
import chess

class Timeout(Exception): pass
def _alarm(*_): raise Timeout()
signal.signal(signal.SIGALRM, _alarm)

def load(path):
    spec = importlib.util.spec_from_file_location(os.path.basename(path)[:-3], path)
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    return m.choose_move

def play(white, black, limit, max_plies=200):
    """returns (score_for_white, reason)"""
    board = chess.Board()
    while not board.is_game_over(claim_draw=True) and board.ply() < max_plies:
        white_turn = board.turn == chess.WHITE
        f = white if white_turn else black
        loser_score = 0.0 if white_turn else 1.0
        signal.setitimer(signal.ITIMER_REAL, limit * 1.5)  # small grace
        try:
            mv = f(board.copy(), limit)
        except Timeout:
            return loser_score, "timeout"
        except Exception as e:
            return loser_score, f"crash: {type(e).__name__}: {e}"[:80]
        finally:
            signal.setitimer(signal.ITIMER_REAL, 0)
        if mv not in board.legal_moves:
            return loser_score, "illegal move"
        board.push(mv)
    if board.is_game_over(claim_draw=True):
        r = board.result(claim_draw=True)
        return {"1-0": 1.0, "0-1": 0.0}.get(r, 0.5), "game over"
    return 0.5, "move cap"

def elo(names, results, k=24, passes=30):
    """results: list of (a, b, score_a). Simple iterated Elo, order-shuffled."""
    r = {n: 1000.0 for n in names}
    rng = random.Random(1)
    for _ in range(passes):
        rng.shuffle(results)
        for a, b, s in results:
            ea = 1 / (1 + 10 ** ((r[b] - r[a]) / 400))
            r[a] += k * (s - ea); r[b] -= k * (s - ea)
    return r

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("folder"); ap.add_argument("--rounds", type=int, default=2)
    ap.add_argument("--time", type=float, default=2.0); ap.add_argument("--out", default="leaderboard.md")
    a = ap.parse_args()
    bots = {}
    for p in sorted(glob.glob(os.path.join(a.folder, "*.py"))):
        name = os.path.basename(p)[:-3]
        try: bots[name] = load(p)
        except Exception as e: print(f"! could not load {name}: {e}")
    names = list(bots)
    pts = {n: 0.0 for n in names}; played = {n: 0 for n in names}
    wins = {n: 0 for n in names}; draws = {n: 0 for n in names}; fails = {n: [] for n in names}
    results = []; table = {}
    for x, y in itertools.combinations(names, 2):
        for i in range(a.rounds * 2):
            w, b = (x, y) if i % 2 == 0 else (y, x)
            s, why = play(bots[w], bots[b], a.time)
            for n, sc in ((w, s), (b, 1 - s)):
                pts[n] += sc; played[n] += 1
                wins[n] += sc == 1; draws[n] += sc == 0.5
            if why.startswith(("crash", "timeout", "illegal")):
                fails[w if s == 0 else b].append(why)
            results.append((w, b, s))
            table.setdefault((x, y), 0.0); table[(x, y)] += s if w == x else 1 - s
            print(f"{w} vs {b}: {s} ({why})", flush=True)
    rating = elo(names, list(results))
    order = sorted(names, key=lambda n: (-pts[n], -rating[n]))
    lines = ["# Leaderboard", "", "| # | Bot | Points | W | D | L | Elo* | Problems |", "|---|---|---|---|---|---|---|---|"]
    for i, n in enumerate(order, 1):
        l = played[n] - wins[n] - draws[n]
        prob = f"{len(fails[n])} ({fails[n][0]})" if fails[n] else ""
        lines.append(f"| {i} | {n} | {pts[n]:g}/{played[n]} | {wins[n]:g} | {draws[n]:g} | {l:g} | {rating[n]:.0f} | {prob} |")
    lines += ["", "*Elo is a rough estimate from few games; points decide the ranking.", f"Settings: {a.rounds*2} games per pair, {a.time}s per move."]
    open(a.out, "w").write("\n".join(lines) + "\n"); print("\n".join(lines))

if __name__ == "__main__":
    main()
