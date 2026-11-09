# 🧠 LEVEL 5 · Think like your opponent (minimax)
#   😀 my turn ➜ pick the MAX      😈 their turn ➜ pick the MIN
#   depth 0 ➜ just evaluate
import chess

VALUES = {chess.PAWN: 1, chess.KNIGHT: 3, chess.BISHOP: 3,
          chess.ROOK: 5, chess.QUEEN: 9, chess.KING: 0}
MATE = 1000
DEPTH = 2          # 🐢 3 is smarter but slower

def evaluate(board):
    if board.is_checkmate():                       # side to move lost 💀
        return -MATE if board.turn == chess.WHITE else MATE
    if board.is_game_over():
        return 0                                   # draw 🤝
    score = 0
    # 👉 paste your Level 3 loop here
    return score

def minimax(board, depth):
    if depth == 0 or board.is_game_over():
        return evaluate(board)
    scores = []
    for move in board.legal_moves:
        board.push(move)
        scores.append(0)    # 👉 YOUR TURN: replace 0 with minimax(board, depth - 1)
        board.pop()
    # 👉 YOUR TURN: return max(scores) for White, min(scores) for Black
    return 0

def choose_move(board, time_left):
    best_move, best_score = None, None
    for move in board.legal_moves:
        board.push(move)
        score = minimax(board, DEPTH - 1)
        board.pop()
        # 👉 same "keep the best" code as Level 4
        pass
    return best_move
