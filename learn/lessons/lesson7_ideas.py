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
