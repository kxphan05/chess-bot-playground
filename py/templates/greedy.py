import random
import chess

VALUES = {chess.PAWN: 1, chess.KNIGHT: 3, chess.BISHOP: 3,
          chess.ROOK: 5, chess.QUEEN: 9, chess.KING: 0}


def choose_move(board: chess.Board, time_left: float) -> chess.Move:
    """Prefer checkmate, then the most valuable capture, otherwise random."""
    best, best_score = [], -1
    for move in board.legal_moves:
        score = 0
        if board.is_capture(move):
            victim = board.piece_at(move.to_square)
            score = VALUES[victim.piece_type] if victim else 1  # en passant
        board.push(move)
        if board.is_checkmate():
            score = 1000
        board.pop()
        if score > best_score:
            best, best_score = [move], score
        elif score == best_score:
            best.append(move)
    return random.choice(best)
