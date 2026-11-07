import chess, random
PIECE_VALUES = {chess.PAWN: 1, chess.KNIGHT: 3, chess.BISHOP: 3, chess.ROOK: 5, chess.QUEEN: 9, chess.KING: 0}
MATE_SCORE = 1000
DEPTH = 2

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

def minimax(board, depth):
    if depth == 0 or board.is_game_over():
        return evaluate(board)
    if board.turn == chess.WHITE:
        best = -10_000
        for move in board.legal_moves:
            board.push(move)
            score = minimax(board, depth - 1)
            board.pop()
            best = max(best, score)
        return best
    else:
        best = 10_000
        for move in board.legal_moves:
            board.push(move)
            score = minimax(board, depth - 1)
            board.pop()
            best = min(best, score)
        return best

def choose_move(board, time_left):
    best_move = None
    best_score = None
    for move in board.legal_moves:
        board.push(move)
        score = minimax(board, DEPTH - 1)
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
