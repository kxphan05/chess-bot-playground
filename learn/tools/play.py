"""Bot vs bot.  usage: python tools/play.py white_bot.py black_bot.py [games]"""
import sys, importlib.util, chess, time

def load(path):
    spec = importlib.util.spec_from_file_location("bot", path)
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    return m.choose_move

def game(w, b, max_plies=300):
    board = chess.Board()
    while not board.is_game_over() and board.ply() < max_plies:
        f = w if board.turn == chess.WHITE else b
        mv = f(board.copy(), 5.0)
        if mv not in board.legal_moves:
            return "illegal move by " + ("White" if board.turn else "Black"), board
        board.push(mv)
    return board.result(claim_draw=True), board

if __name__ == "__main__":
    w, b = load(sys.argv[1]), load(sys.argv[2])
    n = int(sys.argv[3]) if len(sys.argv) > 3 else 1
    for i in range(n):
        t = time.time(); r, bd = game(w, b)
        print(f"game {i+1}: {r} ({bd.ply()} plies, {time.time()-t:.1f}s)")
