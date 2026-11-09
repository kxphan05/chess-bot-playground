# name: House Random
# author: Arena
import random
import chess


def choose_move(board: chess.Board, time_left: float) -> chess.Move:
    """Play a random legal move."""
    return random.choice(list(board.legal_moves))
