# LESSON 7 - Make it yours. Ideas, easiest first. Change ONE thing, then play a match to see if it helped!
#
# 1. Move ordering: in alphabeta, try captures first -> more pruning.
#       moves = sorted(board.legal_moves, key=lambda m: board.is_capture(m), reverse=True)
# 2. Prefer faster mates: return MATE_SCORE + depth instead of MATE_SCORE.
# 3. Position bonus: reward knights/pawns near the centre (squares d4 e4 d5 e5).
# 4. Reward castling, penalise moving the king early in the opening.
# 5. Mobility: score += 0.1 * (number of legal moves for White - for Black).
# 6. Use time_left: search depth 2, then 3, then 4 until time runs low (iterative deepening).
# 7. Quiescence search: at depth 0 keep searching captures so you don't stop mid-trade.
#
# Competition rule suggestion: everyone must be able to explain every line of their bot.

# ---- Starting point: a working alpha-beta bot (your Lesson 6, finished). Change ONE thing at a time. ----
import chess
PIECE_VALUES = {chess.PAWN: 1, chess.KNIGHT: 3, chess.BISHOP: 3, chess.ROOK: 5, chess.QUEEN: 9, chess.KING: 0}
MATE_SCORE = 1000
DEPTH = 3

def evaluate(board):
    if board.is_checkmate():
        return -MATE_SCORE if board.turn == chess.WHITE else MATE_SCORE
    if board.is_stalemate() or board.is_insufficient_material():
        return 0
    score = 0
    for piece in board.piece_map().values():
        value = PIECE_VALUES[piece.piece_type]
        score += value if piece.color == chess.WHITE else -value
    return score

def alphabeta(board, depth, alpha, beta):
    if depth == 0 or board.is_game_over():
        return evaluate(board)
    if board.turn == chess.WHITE:
        best = -10_000
        for move in board.legal_moves:
            board.push(move)
            score = alphabeta(board, depth - 1, alpha, beta)
            board.pop()
            best = max(best, score)
            alpha = max(alpha, best)
            if alpha >= beta:
                break
        return best
    else:
        best = 10_000
        for move in board.legal_moves:
            board.push(move)
            score = alphabeta(board, depth - 1, alpha, beta)
            board.pop()
            best = min(best, score)
            beta = min(beta, best)
            if alpha >= beta:
                break
        return best

def choose_move(board, time_left):
    best_move = None
    best_score = None
    for move in board.legal_moves:
        board.push(move)
        score = alphabeta(board, DEPTH - 1, -10_000, 10_000)
        board.pop()
        if best_score is None:
            better = True
        elif board.turn == chess.WHITE:
            better = score > best_score
        else:
            better = score < best_score
        if better:
            best_move, best_score = move, score
    return best_move
