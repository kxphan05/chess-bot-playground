# Build Your Own Chess Bot (no AI needed!)

Goal: by the end you will have written a **minimax chess bot by hand**, understanding every line.
Works in the Chess Bot Playground (https://kxphan05.github.io/chess-bot-playground/) — paste your file in the editor —
or locally with `tools/play.py`.

## The only API you need

Your bot is ONE function:

```python
def choose_move(board, time_left):
    return some_move        # a chess.Move
```

| Thing | What it is |
|---|---|
| `board` | the current position (a `chess.Board` from python-chess) |
| `time_left` | seconds you have for this move (a number; you can ignore it at first) |
| return value | one move from `board.legal_moves` |

Cheat sheet of `board` (try them in Lesson 1):

| Code | Meaning |
|---|---|
| `board.legal_moves` | all legal moves (loop over it with `for move in board.legal_moves`) |
| `board.push(move)` | play `move` on the board (**changes** the board) |
| `board.pop()` | undo the last pushed move |
| `board.turn` | `chess.WHITE` (True) or `chess.BLACK` (False) — whose turn |
| `board.piece_at(square)` | the piece on a square, or `None` |
| `board.piece_map()` | dict `{square: piece}` for every piece on the board |
| `piece.piece_type` | `chess.PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING` |
| `piece.color` | `chess.WHITE` or `chess.BLACK` |
| `board.is_checkmate()` | True if the side to move is checkmated |
| `board.is_game_over()` | checkmate, stalemate, draw... |
| `print(x)` | shows up in the Log panel — your best debugging friend |

## The learning path

Each lesson is a file in `lessons/`. Do them **in order**. Lessons 3, 5, 6 have blanks (`# TODO`) for you to fill in.
After each, run the self-check: `python tools/check.py lessons/lesson3_evaluate.py`.
Stuck? A hint is at the top of each file; full solutions are in `solutions/` — peek only as last resort.

| # | File | You learn |
|---|---|---|
| 1 | `lesson1_explore.py` | Poke at the board, print moves and pieces |
| 2 | `lesson2_random.py` | Your first bot (plays a random legal move) |
| 3 | `lesson3_evaluate.py` | **Evaluation**: turn a position into a score |
| 4 | `lesson4_greedy.py` | Look 1 move ahead: push, score, pop |
| 5 | `lesson5_minimax.py` | **Minimax**: assume your opponent also plays well |
| 6 | `lesson6_alphabeta.py` | Skip hopeless branches so you can think deeper |
| 7 | `lesson7_ideas.py` | Make it your own: ideas for the competition |

## The big ideas, in plain words

**Evaluation** – a function `evaluate(board)` returning a number. Positive = good for White, negative = good for Black.
Simplest version: add up piece values (pawn 1, knight 3, bishop 3, rook 5, queen 9).

**Looking ahead** – to test a move: `board.push(move)`, evaluate, then `board.pop()` to take it back. Always pop!

**Minimax** – White wants the score high (MAX), Black wants it low (MIN). To judge a move you imagine the opponent's
best reply, then your best reply to that, down to a fixed `depth`. At depth 0 you just call `evaluate`.
Picture a tree:

```
            you pick the MAX
           /        |        \
        (3)        (1)        (5)      <- opponent picks the MIN of these children
       /   \      /   \      /   \
      3     8    1     6    5     9    <- evaluate() at the leaves
```
Left branch gives min(3,8)=3, middle 1, right 5. You pick the max → right branch (5).

**Alpha-beta** – if you already found a move worth 5, and while checking another move the opponent has a reply worth 1,
you can stop checking that move immediately. Same answer, much faster.

## Common beginner bugs
- Forgot `board.pop()` → board gets corrupted, weird illegal-move errors.
- Returning a score instead of a move (or vice-versa).
- Mixing up who maximises: White maximises, Black minimises (or use the negamax trick later).
- Depth too high → bot times out. Start with depth 2.
- Game over positions: checkmate should be hugely good/bad (±1000), not "material only".

## Local tools
```
pip install chess
python tools/check.py lessons/lesson3_evaluate.py     # self-check an exercise
python tools/play.py lessons/lesson5_minimax.py solutions/lesson4_greedy.py   # bot vs bot (white black)
```
