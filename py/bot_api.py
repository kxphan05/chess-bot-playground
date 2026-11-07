"""Harness running inside each Pyodide worker. Not user-editable."""
import io
import sys
import traceback

import chess
import chess.pgn

_ns = None
_out = io.StringIO()


def _hint(exc_text):
    """Plain-words advice for the most common beginner mistakes."""
    h = []
    def has(s): return s in exc_text
    if has("IndentationError"): h.append("Python is picky about indentation: lines inside a def/for/if must be indented by the same amount (4 spaces).")
    if has("SyntaxError"): h.append("Python could not read this line. Look for a missing ':' at the end of if/for/def, an unclosed bracket, or a single '=' where '==' is needed.")
    if has("NameError"): h.append("You used a name Python doesn't know. Typo? Or forgot `import chess` / `import random` at the top, or to define the variable first?")
    if has("'NoneType'"): h.append("Something is None. A common cause: best_move was never set, so it is still None. Make sure your `if score > best_score:` really runs.")
    if has("'generator'") or has("LegalMoveGenerator"): h.append("board.legal_moves is not a list. Use `for move in board.legal_moves:` or `list(board.legal_moves)`.")
    if has("'Move' object") or has("Move object"): h.append("A chess.Move is not a string or number. To print it use board.san(move) BEFORE pushing it.")
    if has("pop from empty stack"): h.append("You called board.pop() more times than board.push(). Every push needs exactly one pop.")
    if has("RecursionError"): h.append("Your function keeps calling itself forever. Does minimax stop when depth == 0?")
    if has("illegal") or has("InvalidMoveError"): h.append("The move text wasn't valid. Return a chess.Move from board.legal_moves, or a UCI string such as 'e2e4'.")
    return ("\nHINT: " + " ".join(h)) if h else ""


def _tb():
    """Traceback limited to the user's own code (no harness noise)."""
    s = traceback.format_exc()
    # drop the harness's source line that follows a bot_api.py frame
    out, skip = [], False
    for l in s.splitlines():
        if "bot_api.py" in l: skip = True; continue
        if skip and l.startswith("    "): skip = False; continue
        skip = False
        if l.strip() and set(l.strip()) <= set("~^"): continue
        out.append(l)
    return "\n".join(out) + _hint(s)


def load_bot(src, name="bot"):
    """Compile and exec user code. Returns None on success or a message string."""
    global _ns
    _ns = {"__name__": "__bot__"}
    try:
        exec(compile(src, name + ".py", "exec"), _ns)
        if not callable(_ns.get("choose_move")):
            return ("Your code must define a function called  choose_move(board, time_left)  "
                    "(spelled exactly like that, with `def` and a colon at the end).")
    except BaseException:
        _ns = None
        return _tb()
    return None


def get_move(fen, time_left):
    """Returns (uci_or_None, error_or_None, stdout_text)."""
    _out.seek(0); _out.truncate()
    old = sys.stdout
    sys.stdout = _out
    try:
        board = chess.Board(fen)
        mv = _ns["choose_move"](board.copy(), float(time_left))
        legal = list(board.legal_moves)
        sample = ", ".join(board.san(m) for m in legal[:6]) + (", ..." if len(legal) > 6 else "")
        if mv is None:
            return None, ("choose_move returned None (nothing).\n"
                          "HINT: Did you forget `return best_move` at the end? Or is best_move still None because the "
                          "# TODO lines that set it are not filled in yet? Legal moves right now: " + sample), _out.getvalue()
        if isinstance(mv, str):
            try:
                mv = chess.Move.from_uci(mv)
            except ValueError:
                return None, ("choose_move returned the text %r, which is not a move.\n"
                              "HINT: Return a chess.Move object (e.g. one from board.legal_moves) or UCI text like 'e2e4' "
                              "- not SAN text like 'Nf3'. Legal moves right now: %s" % (mv, sample)), _out.getvalue()
        if not isinstance(mv, chess.Move):
            return None, ("choose_move returned %s, but it must return a chess.Move.\n"
                          "HINT: A score is not a move! In minimax, the score goes in a variable and the MOVE is what you return. "
                          "Legal moves right now: %s" % (type(mv).__name__, sample)), _out.getvalue()
        if mv not in board.legal_moves:
            return None, ("Illegal move returned: %s (%s to move).\n"
                          "HINT: Pick from board.legal_moves. Also check that you popped every move you pushed inside "
                          "your search, and that you aren't returning a move found for the other side. Legal moves right now: %s"
                          % (mv.uci(), "White" if board.turn else "Black", sample)), _out.getvalue()
        return mv.uci(), None, _out.getvalue()
    except BaseException:
        return None, _tb(), _out.getvalue()
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
