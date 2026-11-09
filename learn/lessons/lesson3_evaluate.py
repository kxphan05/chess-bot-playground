# ⚖️ LEVEL 3 · Count the treasure
# ⚪ White pieces add, ⚫ Black pieces subtract.   ♟1 ♞3 ♝3 ♜5 ♛9
import chess, random

VALUES = {chess.PAWN: 1, chess.KNIGHT: 3, chess.BISHOP: 3,
          chess.ROOK: 5, chess.QUEEN: 9, chess.KING: 0}

def evaluate(board):
    score = 0
    for piece in board.piece_map().values():
        value = VALUES[piece.piece_type]
        # 👉 YOUR TURN: add value if piece.color == chess.WHITE, else subtract
    return score

def choose_move(board, time_left):
    print("⚖️ score:", evaluate(board))      # watch it change in the Log
    return random.choice(list(board.legal_moves))
