# ✂️ LEVEL 6 · Snip snip! (alpha-beta)
# Same answer as minimax, way less work ➜ search deeper 🚀
#   alpha = best White is sure of   beta = best Black is sure of
#   alpha >= beta ➜ ✂️ break
import chess

VALUES = {chess.PAWN: 1, chess.KNIGHT: 3, chess.BISHOP: 3,
          chess.ROOK: 5, chess.QUEEN: 9, chess.KING: 0}
MATE = 1000
DEPTH = 3

def evaluate(board):
    # 👉 paste your Level 5 evaluate here
    return 0

def alphabeta(board, depth, alpha, beta):
    if depth == 0 or board.is_game_over():
        return evaluate(board)
    white = board.turn == chess.WHITE
    best = -10_000 if white else 10_000
    for move in board.legal_moves:
        board.push(move)
        score = alphabeta(board, depth - 1, alpha, beta)
        board.pop()
        if white:
            best = max(best, score); alpha = max(alpha, best)
        else:
            best = min(best, score); beta = min(beta, best)
        # 👉 YOUR TURN: if alpha >= beta: break   ✂️
    return best

def choose_move(board, time_left):
    # 👉 paste choose_move from Level 5, but call
    #    alphabeta(board, DEPTH - 1, -10_000, 10_000)
    return next(iter(board.legal_moves))
