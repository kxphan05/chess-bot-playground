# 👀 LEVEL 1 · Meet the board
# ▶ Press Play, then read the Log →
import chess, random

def choose_move(board, time_left):
    print("🎯 legal moves:", board.legal_moves.count())
    for move in board.legal_moves:
        print("  ", board.san(move))          # e4, Nf3, ...

    # 👉 YOUR TURN: print every piece. Try:
    # for square, piece in board.piece_map().items():
    #     print(chess.square_name(square), piece.symbol())

    return random.choice(list(board.legal_moves))
