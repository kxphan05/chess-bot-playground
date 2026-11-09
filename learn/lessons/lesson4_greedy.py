# 👹 LEVEL 4 · The greedy goblin
# Try every move:  push ➜ evaluate ➜ pop.  Keep the best.
# ⚪ White wants BIG scores · ⚫ Black wants SMALL scores
import chess

VALUES = {chess.PAWN: 1, chess.KNIGHT: 3, chess.BISHOP: 3,
          chess.ROOK: 5, chess.QUEEN: 9, chess.KING: 0}

def evaluate(board):
    score = 0
    # 👉 paste your Level 3 loop here
    return score

def choose_move(board, time_left):
    best_move, best_score = None, None
    for move in board.legal_moves:
        board.push(move)              # try it
        score = evaluate(board)       # score it
        board.pop()                   # undo it!

        # 👉 YOUR TURN: keep this move if it's the first one, or better.
        #    White to move?  board.turn == chess.WHITE  ➜ bigger is better
        pass
    return best_move

# 💥 Watch it take a defended pawn with its queen... Level 5 fixes that.
