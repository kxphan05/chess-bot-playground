# name: House PyBot
# author: Arena (the boss)
"""Small alpha-beta chess engine on top of python-chess."""
import time

import chess

PIECE_VALUES = {
    chess.PAWN: 100, chess.KNIGHT: 320, chess.BISHOP: 330,
    chess.ROOK: 500, chess.QUEEN: 900, chess.KING: 0,
}

# Piece-square tables from White's point of view, a8..h1 order (index 0 = a8).
PST = {
    chess.PAWN: [
        0, 0, 0, 0, 0, 0, 0, 0,
        50, 50, 50, 50, 50, 50, 50, 50,
        10, 10, 20, 30, 30, 20, 10, 10,
        5, 5, 10, 25, 25, 10, 5, 5,
        0, 0, 0, 20, 20, 0, 0, 0,
        5, -5, -10, 0, 0, -10, -5, 5,
        5, 10, 10, -20, -20, 10, 10, 5,
        0, 0, 0, 0, 0, 0, 0, 0],
    chess.KNIGHT: [
        -50, -40, -30, -30, -30, -30, -40, -50,
        -40, -20, 0, 0, 0, 0, -20, -40,
        -30, 0, 10, 15, 15, 10, 0, -30,
        -30, 5, 15, 20, 20, 15, 5, -30,
        -30, 0, 15, 20, 20, 15, 0, -30,
        -30, 5, 10, 15, 15, 10, 5, -30,
        -40, -20, 0, 5, 5, 0, -20, -40,
        -50, -40, -30, -30, -30, -30, -40, -50],
    chess.BISHOP: [
        -20, -10, -10, -10, -10, -10, -10, -20,
        -10, 0, 0, 0, 0, 0, 0, -10,
        -10, 0, 5, 10, 10, 5, 0, -10,
        -10, 5, 5, 10, 10, 5, 5, -10,
        -10, 0, 10, 10, 10, 10, 0, -10,
        -10, 10, 10, 10, 10, 10, 10, -10,
        -10, 5, 0, 0, 0, 0, 5, -10,
        -20, -10, -10, -10, -10, -10, -10, -20],
    chess.ROOK: [
        0, 0, 0, 0, 0, 0, 0, 0,
        5, 10, 10, 10, 10, 10, 10, 5,
        -5, 0, 0, 0, 0, 0, 0, -5,
        -5, 0, 0, 0, 0, 0, 0, -5,
        -5, 0, 0, 0, 0, 0, 0, -5,
        -5, 0, 0, 0, 0, 0, 0, -5,
        -5, 0, 0, 0, 0, 0, 0, -5,
        0, 0, 0, 5, 5, 0, 0, 0],
    chess.QUEEN: [
        -20, -10, -10, -5, -5, -10, -10, -20,
        -10, 0, 0, 0, 0, 0, 0, -10,
        -10, 0, 5, 5, 5, 5, 0, -10,
        -5, 0, 5, 5, 5, 5, 0, -5,
        0, 0, 5, 5, 5, 5, 0, -5,
        -10, 5, 5, 5, 5, 5, 0, -10,
        -10, 0, 5, 0, 0, 0, 0, -10,
        -20, -10, -10, -5, -5, -10, -10, -20],
    chess.KING: [
        -30, -40, -40, -50, -50, -40, -40, -30,
        -30, -40, -40, -50, -50, -40, -40, -30,
        -30, -40, -40, -50, -50, -40, -40, -30,
        -30, -40, -40, -50, -50, -40, -40, -30,
        -20, -30, -30, -40, -40, -30, -30, -20,
        -10, -20, -20, -20, -20, -20, -20, -10,
        20, 20, 0, 0, 0, 0, 20, 20,
        20, 30, 10, 0, 0, 10, 30, 20],
}

MATE = 100000
INF = 10**9
EXACT, LOWER, UPPER = 0, 1, 2


class TimeUp(Exception):
    pass


class Engine:
    def __init__(self):
        self.tt = {}
        self.nodes = 0
        self.deadline = 0.0

    # --- evaluation -------------------------------------------------------
    @staticmethod
    def evaluate(board):
        """Score in centipawns from the side to move's point of view."""
        score = 0
        for sq, piece in board.piece_map().items():
            idx = sq ^ 56 if piece.color == chess.WHITE else sq  # mirror for black
            val = PIECE_VALUES[piece.piece_type] + PST[piece.piece_type][idx]
            score += val if piece.color == chess.WHITE else -val
        return score if board.turn == chess.WHITE else -score

    # --- move ordering ----------------------------------------------------
    @staticmethod
    def order(board, moves, tt_move=None):
        def key(m):
            if m == tt_move:
                return 10**6
            s = 0
            if board.is_capture(m):
                victim = board.piece_type_at(m.to_square) or chess.PAWN  # en passant
                s += 10 * PIECE_VALUES[victim] - PIECE_VALUES[board.piece_type_at(m.from_square)] + 1000
            if m.promotion:
                s += PIECE_VALUES[m.promotion]
            return s
        return sorted(moves, key=key, reverse=True)

    # --- search -----------------------------------------------------------
    def _check_time(self):
        if self.nodes & 1023 == 0 and time.time() >= self.deadline:
            raise TimeUp

    def quiesce(self, board, alpha, beta):
        self.nodes += 1
        self._check_time()
        stand = self.evaluate(board)
        if stand >= beta:
            return beta
        alpha = max(alpha, stand)
        for m in self.order(board, board.generate_legal_captures()):
            board.push(m)
            score = -self.quiesce(board, -beta, -alpha)
            board.pop()
            if score >= beta:
                return beta
            alpha = max(alpha, score)
        return alpha

    def negamax(self, board, depth, alpha, beta, ply):
        self.nodes += 1
        self._check_time()
        if ply > 0 and (board.is_repetition(2) or board.halfmove_clock >= 100
                        or board.is_insufficient_material()):
            return 0

        key = board._transposition_key()
        entry = self.tt.get(key)
        tt_move = None
        if entry:
            e_depth, e_flag, e_score, tt_move = entry
            if e_depth >= depth and ply > 0:
                if e_flag == EXACT:
                    return e_score
                if e_flag == LOWER:
                    alpha = max(alpha, e_score)
                elif e_flag == UPPER:
                    beta = min(beta, e_score)
                if alpha >= beta:
                    return e_score

        in_check = board.is_check()
        if in_check:
            depth += 1  # check extension
        if depth <= 0:
            return self.quiesce(board, alpha, beta)

        moves = list(board.legal_moves)
        if not moves:
            return -MATE + ply if in_check else 0

        orig_alpha = alpha
        best, best_move = -INF, None
        for m in self.order(board, moves, tt_move):
            board.push(m)
            score = -self.negamax(board, depth - 1, -beta, -alpha, ply + 1)
            board.pop()
            if score > best:
                best, best_move = score, m
            alpha = max(alpha, score)
            if alpha >= beta:
                break

        flag = UPPER if best <= orig_alpha else LOWER if best >= beta else EXACT
        self.tt[key] = (depth, flag, best, best_move)
        return best

    def search(self, board, time_limit=1.0, max_depth=64, info=None):
        """Iterative deepening. Returns the best move found within time_limit seconds."""
        self.deadline = time.time() + time_limit
        self.nodes = 0
        if len(self.tt) > 500_000:
            self.tt.clear()
        board = board.copy(stack=True)
        best_move = next(iter(board.legal_moves), None)
        for depth in range(1, max_depth + 1):
            try:
                score = self.negamax(board, depth, -INF, INF, 0)
            except TimeUp:
                break
            entry = self.tt.get(board._transposition_key())
            if entry and entry[3]:
                best_move = entry[3]
            if info:
                info(depth, score, self.nodes, best_move)
            if abs(score) > MATE - 100:
                break
        return best_move


_engine = Engine()


def choose_move(board, time_left):
    return _engine.search(board, time_limit=min(1.0, max(0.1, time_left / 30)))
