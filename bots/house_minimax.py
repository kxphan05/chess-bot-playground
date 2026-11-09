# name: House Minimax
# author: Arena
import time
import chess

VALUES = {chess.PAWN: 100, chess.KNIGHT: 320, chess.BISHOP: 330,
          chess.ROOK: 500, chess.QUEEN: 900, chess.KING: 0}


def evaluate(board: chess.Board) -> int:
    """Material score from the side-to-move's point of view."""
    score = 0
    for piece_type, value in VALUES.items():
        score += value * len(board.pieces(piece_type, board.turn))
        score -= value * len(board.pieces(piece_type, not board.turn))
    return score


def negamax(board, depth, alpha, beta):
    if board.is_checkmate():
        return -100000 - depth
    if board.is_game_over():
        return 0
    if depth == 0:
        return evaluate(board)
    best = -10**9
    for move in board.legal_moves:
        board.push(move)
        best = max(best, -negamax(board, depth - 1, -beta, -alpha))
        board.pop()
        alpha = max(alpha, best)
        if alpha >= beta:
            break
    return best


def choose_move(board: chess.Board, time_left: float) -> chess.Move:
    """Depth-3 alpha-beta on material. Improve the evaluation!"""
    best_move, best = None, -10**9
    for move in board.legal_moves:
        board.push(move)
        score = -negamax(board, 2, -10**9, 10**9)
        board.pop()
        if score > best:
            best, best_move = score, move
    print("eval", best)
    return best_move
