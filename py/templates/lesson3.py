# LESSON 3 - Evaluation: how good is this position?
#
# Hint: loop over board.piece_map().values(). For each piece look up its value in
# PIECE_VALUES[piece.piece_type]. Add it if piece.color == chess.WHITE, subtract if BLACK.
import chess
import random

PIECE_VALUES = {
    chess.PAWN: 1,
    chess.KNIGHT: 3,
    chess.BISHOP: 3,
    chess.ROOK: 5,
    chess.QUEEN: 9,
    chess.KING: 0,     # kings are never captured, so they don't count
}

def evaluate(board):
    """Return a number: positive = White is ahead, negative = Black is ahead."""
    score = 0
    # TODO: loop over the pieces and update score
    return score

def choose_move(board, time_left):
    # Not a real bot yet - we just print the score so you can see evaluate working.
    print("evaluation:", evaluate(board))
    return random.choice(list(board.legal_moves))
