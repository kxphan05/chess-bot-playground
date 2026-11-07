# LESSON 5 - Minimax.   Check yourself:  python tools/check.py lessons/lesson5_minimax.py
#
# minimax(board, depth) returns the SCORE of the position assuming both sides play best.
#   depth == 0 or game over -> just evaluate
#   White to move -> the best (max) score among all children
#   Black to move -> the best (min) score among all children
# A "child" is the position after one legal move: push, recurse with depth - 1, pop.
import chess
import random

PIECE_VALUES = {chess.PAWN: 1, chess.KNIGHT: 3, chess.BISHOP: 3,
                chess.ROOK: 5, chess.QUEEN: 9, chess.KING: 0}
MATE_SCORE = 1000
DEPTH = 2   # try 3 once it works (slower!)

def evaluate(board):
    # Game-over cases first
    if board.is_checkmate():
        # side to move is mated. If it's White's turn, White lost -> very bad for White.
        return -MATE_SCORE if board.turn == chess.WHITE else MATE_SCORE
    if board.is_stalemate() or board.is_insufficient_material():
        return 0
    score = 0
    # TODO: paste your material counting from lesson 3 here
    return score

def minimax(board, depth):
    if depth == 0 or board.is_game_over():
        return evaluate(board)

    if board.turn == chess.WHITE:           # White = maximiser
        best = -10_000
        for move in board.legal_moves:
            board.push(move)
            # TODO: score = minimax(board, depth - 1)
            score = 0
            board.pop()
            # TODO: best = the larger of best and score
        return best
    else:                                   # Black = minimiser
        best = 10_000
        for move in board.legal_moves:
            board.push(move)
            # TODO: score = minimax(board, depth - 1)
            score = 0
            board.pop()
            # TODO: best = the smaller of best and score
        return best

def choose_move(board, time_left):
    best_move = None
    best_score = None
    for move in board.legal_moves:
        board.push(move)
        score = minimax(board, DEPTH - 1)   # we already used one ply by pushing
        board.pop()
        # TODO: same "keep the best for the side to move" logic as lesson 4
        pass
    return best_move
