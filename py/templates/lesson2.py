# LESSON 2 - Your first bot: pick a random legal move.
# This is the bot to beat. Everything later should beat it easily.
import random

def choose_move(board, time_left):
    moves = list(board.legal_moves)   # turn the legal moves into a list
    return random.choice(moves)

# TRY IT: make it prefer captures.
#   board.is_capture(move) is True when the move captures something.
#   Build a list `captures` and pick from it if it is not empty.
