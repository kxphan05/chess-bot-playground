# 🚀 LEVEL 7 · Power-ups
# A working alpha-beta bot. Add ONE power-up ➜ Run match ➜ did it win more? 📈
#   ⚡ captures first      🏁 faster mates       🎯 love the centre
#   🦵 mobility            🏰 castle early       ⏱️ use time_left
# 🏆 Rule for the tournament: you must be able to explain every line!
import chess

VALUES = {chess.PAWN: 1, chess.KNIGHT: 3, chess.BISHOP: 3,
          chess.ROOK: 5, chess.QUEEN: 9, chess.KING: 0}
MATE = 1000
DEPTH = 3

def evaluate(board):
    if board.is_checkmate():
        return -MATE if board.turn == chess.WHITE else MATE
    if board.is_game_over():
        return 0
    score = 0
    for piece in board.piece_map().values():
        value = VALUES[piece.piece_type]
        score += value if piece.color == chess.WHITE else -value
    # 🎯 power-up spot: add bonuses here
    return score

def alphabeta(board, depth, alpha, beta):
    if depth == 0 or board.is_game_over():
        return evaluate(board)
    white = board.turn == chess.WHITE
    best = -10_000 if white else 10_000
    moves = board.legal_moves      # ⚡ power-up spot: sort captures first
    for move in moves:
        board.push(move)
        score = alphabeta(board, depth - 1, alpha, beta)
        board.pop()
        if white:
            best = max(best, score); alpha = max(alpha, best)
        else:
            best = min(best, score); beta = min(beta, best)
        if alpha >= beta:
            break
    return best

def choose_move(board, time_left):
    best_move, best_score = None, None
    white = board.turn == chess.WHITE
    for move in board.legal_moves:
        board.push(move)
        score = alphabeta(board, DEPTH - 1, -10_000, 10_000)
        board.pop()
        if best_score is None or (score > best_score if white else score < best_score):
            best_move, best_score = move, score
    return best_move
