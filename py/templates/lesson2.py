# 🎲 LEVEL 2 · Roll the dice
# The simplest bot ever. Everything after this should beat it!
import random

def choose_move(board, time_left):
    moves = list(board.legal_moves)
    return random.choice(moves)

# 👉 YOUR TURN: grab captures when you can 🍖
#    captures = [m for m in moves if board.is_capture(m)]
#    if captures: return random.choice(captures)
