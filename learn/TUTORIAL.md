# ♞ Chess Bot Quest

> 🎮 **Play it in the browser:** https://kxphan05.github.io/chess-bot-playground/learn.html
> Interactive toys for every level, then press **Try it ▶**.

```
  ♟ board  ──▶  choose_move(board, time_left)  ──▶  🎯 chess.Move
```

## 🗺️ The 7 levels

| | Level | One idea | File |
|---|---|---|---|
| 👀 | Meet the board | `board.legal_moves` | `lessons/lesson1_explore.py` |
| 🎲 | Roll the dice | `random.choice(...)` | `lessons/lesson2_random.py` |
| ⚖️ | Count the treasure | ⚪ adds, ⚫ subtracts | `lessons/lesson3_evaluate.py` |
| 👹 | Greedy goblin | push ➜ evaluate ➜ pop | `lessons/lesson4_greedy.py` |
| 🧠 | Think like your opponent | 😀 MAX · 😈 MIN | `lessons/lesson5_minimax.py` |
| ✂️ | Snip snip! | `alpha >= beta` ➜ break | `lessons/lesson6_alphabeta.py` |
| 🚀 | Power-ups | change ONE thing, test | `lessons/lesson7_ideas.py` |

## 🧰 Cheat sheet

| Code | 💡 |
|---|---|
| `board.legal_moves` | every move you can make |
| `board.push(m)` / `board.pop()` | try a move / undo it |
| `board.turn == chess.WHITE` | is it White's turn? |
| `board.piece_map()` | `{square: piece}` |
| `board.is_capture(m)` | does `m` take something? |
| `board.is_checkmate()` | 💀 |
| `print(x)` | shows in the Log |

## 🧠 Minimax in one picture

```
            😀 MAX ➜ 5
          /     |     \
        😈3    😈1    😈5      ← opponent takes the smallest
        / \    / \    / \
       3   8  1   6  5   9     ← evaluate()
```

## 🐛 Top 3 bugs
1. 🔁 Forgot `board.pop()`
2. 🔢 Returned a score instead of a move
3. 🐢 `DEPTH` too big ➜ timeout (start with 2)

## 💻 Offline
```
pip install chess
python tools/check.py lessons/lesson3_evaluate.py     # ✅/❌ with hints
python tools/play.py my_bot.py solutions/lesson4_greedy.py
```
