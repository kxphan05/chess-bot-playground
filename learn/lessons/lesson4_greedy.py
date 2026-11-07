# LESSON 4 - Greedy bot: look ONE move ahead.
# Check yourself:  python tools/check.py lessons/lesson4_greedy.py
# (Copy your evaluate() from lesson 3 here.)
#
# Recipe for each legal move:  push  ->  evaluate  ->  pop
# Then keep the move with the best score.
# White wants the biggest score; Black wants the smallest.
import chess
import random

PIECE_VALUES = {chess.PAWN: 1, chess.KNIGHT: 3, chess.BISHOP: 3,
                chess.ROOK: 5, chess.QUEEN: 9, chess.KING: 0}

def evaluate(board):
    score = 0
    # TODO: paste your lesson 3 code here
    return score

def choose_move(board, time_left):
    best_move = None
    best_score = None

    for move in board.legal_moves:
        board.push(move)            # try the move
        score = evaluate(board)     # how good is the result?
        board.pop()                 # ALWAYS undo it

        # TODO: if this is the first move, or better than best_score for the side
        # to move, remember it. Remember: board.turn == chess.WHITE means we want a HIGH score.
        pass

    return best_move

# Problem to notice: greedy takes a defended pawn with its queen and loses the queen,
# because it never asks "what will my opponent do next?". That is what lesson 5 fixes.
