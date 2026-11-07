"""Self-check a lesson file.  usage: python tools/check.py lessons/lessonN_xxx.py"""
import sys, importlib.util, os, random, chess

path = sys.argv[1]
spec = importlib.util.spec_from_file_location("bot", path)
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
name = os.path.basename(path)
fails = 0
def check(ok, msg, hint=""):
    global fails
    print(("  PASS  " if ok else "  FAIL  ") + msg + ("" if ok else ("\n        hint: " + hint if hint else "")))
    fails += (not ok)

def legal(board):
    mv = m.choose_move(board.copy(), 5.0)
    return mv, (mv in board.legal_moves)

if "evaluate" in name:
    check(m.evaluate(chess.Board()) == 0, "start position scores 0", "both sides have equal material")
    b = chess.Board(); b.remove_piece_at(chess.D8)
    check(m.evaluate(b) == 9, "Black missing queen -> +9", "add white values, subtract black values")
    b = chess.Board(); b.remove_piece_at(chess.A2); b.remove_piece_at(chess.B1)
    check(m.evaluate(b) == -4, "White missing pawn+knight -> -4")
else:
    mv, ok = legal(chess.Board()); check(ok, "returns a legal move from the start position", "return a chess.Move, not None/score")
    b = chess.Board("4k3/8/8/3q4/8/8/3Q4/4K3 w - - 0 1")  # white queen can take black queen
    mv, ok = legal(b)
    if "greedy" in name:
        check(ok and b.is_capture(mv), "White grabs the free queen")
        b = chess.Board("4k3/8/8/8/8/8/3q4/3QK3 b - - 0 1")
        mv, ok = legal(b); check(ok and mv.to_square == chess.D1 , "Black (minimising) also captures")
    else:
        check(ok and b.is_capture(mv) and mv.to_square == chess.D5, "takes undefended queen")
        # greedy trap: Qxd5 is defended by pawn -> a deeper bot must NOT take with the queen
        b = chess.Board("4k3/8/2p5/3p4/8/8/3Q4/4K3 w - - 0 1")
        mv, ok = legal(b)
        check(ok and mv != chess.Move.from_uci("d2d5"), "does not lose queen for a defended pawn", "minimax depth must be >= 2")
        b = chess.Board("6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1")  # Ra8#
        mv, ok = legal(b); check(ok and mv == chess.Move.from_uci("a1a8"), "finds mate in 1")
        b = chess.Board("6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1"); b.turn = chess.BLACK
        mv, ok = legal(b); check(ok, "plays as Black too")
        if "alphabeta" in name:
            import time; t = time.time(); m.choose_move(chess.Board(), 5.0)
            check(time.time() - t < 30, f"depth {m.DEPTH} from start finishes in <30s ({time.time()-t:.1f}s)")
    b = chess.Board(); n = 0
    while not b.is_game_over() and n < 6:
        mv, ok = legal(b)
        if not ok: break
        b.push(mv); n += 1
    check(n == 6 or b.is_game_over(), "survives 6 plies without crashing/illegal moves", "did you forget board.pop()?")
print("\nALL GOOD!" if not fails else f"\n{fails} check(s) failed - keep going!")
sys.exit(bool(fails))
