# LESSON 1 - Explore the board.  No winning here, just look around.
# Paste into the playground and press Play; read the Log panel.
import chess
import random

def choose_move(board, time_left):
    print("It is", "White" if board.turn == chess.WHITE else "Black", "to move")
    print("Number of legal moves:", board.legal_moves.count())

    # Loop over every legal move
    for move in board.legal_moves:
        print("  can play", board.san(move))   # san = human style, e.g. Nf3

    # Look at every piece on the board
    for square, piece in board.piece_map().items():
        print(chess.square_name(square), piece.symbol(), "color:", piece.color)

    # TRY IT: print how many white pawns there are.
    # Hint: piece.piece_type == chess.PAWN and piece.color == chess.WHITE

    return random.choice(list(board.legal_moves))
