# Chess Bot Playground

Write a chess bot in Python in your browser and play it — nothing to install.
Python runs client-side via [Pyodide](https://pyodide.org) (WebAssembly) with
[python-chess](https://python-chess.readthedocs.io). It's a static site: no backend.

## Run locally
    cd web && python3 -m http.server 8000     # open http://localhost:8000
Deploy by uploading the `web/` folder to GitHub Pages / Netlify / any static host.
(First load downloads ~10 MB of Pyodide + python-chess from a CDN; the browser caches it.)

## Learn
`learn.html` = **Chess Bot Quest**: 7 visual, interactive levels (pure JS, loads instantly), each with a
**Try it ▶** link that opens the matching lesson in the playground (`index.html?lesson=N`).
`index.html?white=b:random&black=me` preselects players.

## Bot API
```python
import chess

def choose_move(board: chess.Board, time_left: float) -> chess.Move:
    ...   # return a legal chess.Move (or UCI string); print() goes to the log
```
- `board` is a copy; push/pop freely. `time_left` = seconds allowed for this move.
- Illegal move, exception, or exceeding the time limit (+1.5 s grace) loses the game;
  a runaway bot's worker is killed. Top-level code must also finish within 5 s.

## Features
Template bots, save/load in localStorage, `.py` import/export, Human vs bot,
bot vs bot, N-game matches with alternating colors, PGN download.
Built-in opponents: PyBot (`py/engines/pybot.py`, alpha-beta), Random, Greedy, Minimax.

## Layout
`js/bot-worker.js` Pyodide worker · `js/worker-client.js` promise wrapper + kill/restart ·
`py/bot_api.py` harness + referee helpers · `js/main.js` game loop & UI · `js/board.js` board.
