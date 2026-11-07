import chess, random
PIECE_VALUES = {chess.PAWN: 1, chess.KNIGHT: 3, chess.BISHOP: 3, chess.ROOK: 5, chess.QUEEN: 9, chess.KING: 0}

def evaluate(board):
    score = 0
    for piece in board.piece_map().values():
        value = PIECE_VALUES[piece.piece_type]
        score += value if piece.color == chess.WHITE else -value
    return score

def choose_move(board, time_left):
    best_move = None
    best_score = None
    for move in board.legal_moves:
        board.push(move)
        score = evaluate(board)
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
