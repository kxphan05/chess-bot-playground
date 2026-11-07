# LESSON 6 - Alpha-beta pruning.   Check:  python tools/check.py lessons/lesson6_alphabeta.py
# Same answers as minimax, but faster, so you can search deeper.
#
# alpha = best score White is already guaranteed   (starts very low)
# beta  = best score Black is already guaranteed   (starts very high)
# If alpha >= beta, the opponent would never let us reach this position -> `break`.
import chess

PIECE_VALUES = {chess.PAWN: 1, chess.KNIGHT: 3, chess.BISHOP: 3,
                chess.ROOK: 5, chess.QUEEN: 9, chess.KING: 0}
MATE_SCORE = 1000
DEPTH = 3

def evaluate(board):
    # TODO: paste your lesson 5 evaluate here
    return 0

def alphabeta(board, depth, alpha, beta):
    if depth == 0 or board.is_game_over():
        return evaluate(board)

    if board.turn == chess.WHITE:
        best = -10_000
        for move in board.legal_moves:
            board.push(move)
            score = alphabeta(board, depth - 1, alpha, beta)
            board.pop()
            best = max(best, score)
            alpha = max(alpha, best)
            # TODO: if alpha >= beta: break
        return best
    else:
        best = 10_000
        for move in board.legal_moves:
            board.push(move)
            score = alphabeta(board, depth - 1, alpha, beta)
            board.pop()
            best = min(best, score)
            beta = min(beta, best)
            # TODO: if alpha >= beta: break
        return best

def choose_move(board, time_left):
    # TODO: paste choose_move from lesson 5, but call
    #       alphabeta(board, DEPTH - 1, -10_000, 10_000) instead of minimax.
    return next(iter(board.legal_moves))
