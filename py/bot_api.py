"""Harness running inside each Pyodide worker. Not user-editable."""
import io
import sys
import traceback

import chess
import chess.pgn

_ns = None
_out = io.StringIO()


def load_bot(src, name="bot"):
    """Compile and exec user code. Returns None on success or a traceback string."""
    global _ns
    _ns = {"__name__": "__bot__"}
    try:
        exec(compile(src, name + ".py", "exec"), _ns)
        if not callable(_ns.get("choose_move")):
            return "Your code must define  choose_move(board, time_left)."
    except BaseException:
        _ns = None
        return traceback.format_exc()
    return None


def get_move(fen, time_left):
    """Returns (uci_or_None, error_or_None, stdout_text)."""
    _out.seek(0); _out.truncate()
    old = sys.stdout
    sys.stdout = _out
    try:
        board = chess.Board(fen)
        mv = _ns["choose_move"](board.copy(), float(time_left))
        if isinstance(mv, str):
            mv = chess.Move.from_uci(mv)
        if mv not in board.legal_moves:
            return None, "Illegal move returned: %s" % mv, _out.getvalue()
        return mv.uci(), None, _out.getvalue()
    except BaseException:
        return None, traceback.format_exc(), _out.getvalue()
    finally:
        sys.stdout = old


# ---- referee helpers (used by the referee worker) ----

def status(fen):
    """Returns dict: legal moves, game-over info."""
    b = chess.Board(fen)
    over = b.is_game_over(claim_draw=True)
    reason = None
    if over:
        if b.is_checkmate(): reason = "checkmate"
        elif b.is_stalemate(): reason = "stalemate"
        elif b.is_insufficient_material(): reason = "insufficient material"
        elif b.can_claim_threefold_repetition(): reason = "threefold repetition"
        else: reason = "50-move rule"
    return {
        "over": over, "result": b.result(claim_draw=True) if over else None,
        "reason": reason, "check": b.is_check(), "turn": b.turn,
        "legal": [m.uci() for m in b.legal_moves],
    }


def push(fen, uci_moves_from_start, start_fen, uci):
    """Apply move on a board rebuilt from history (keeps repetition info). Returns (san, new_fen)."""
    b = chess.Board(start_fen)
    for u in uci_moves_from_start:
        b.push_uci(u)
    m = chess.Move.from_uci(uci)
    san = b.san(m)
    b.push(m)
    return san, b.fen()


def history_status(start_fen, ucis):
    """Status computed from full history so repetition claims work."""
    b = chess.Board(start_fen)
    for u in ucis:
        b.push_uci(u)
    s = status(b.fen())
    s["fen"] = b.fen()
    # status() rebuilt from FEN loses history; recompute claim-draw flags with stack
    if b.is_game_over(claim_draw=True) and not s["over"]:
        s["over"] = True
        s["result"] = b.result(claim_draw=True)
        s["reason"] = "threefold repetition" if b.can_claim_threefold_repetition() else "50-move rule"
    return s


def make_pgn(start_fen, ucis, white, black, result):
    b = chess.Board(start_fen)
    g = chess.pgn.Game()
    g.headers["White"], g.headers["Black"], g.headers["Result"] = white, black, result
    if start_fen != chess.STARTING_FEN:
        g.setup(b)
    node = g
    for u in ucis:
        node = node.add_variation(chess.Move.from_uci(u))
    return str(g)
