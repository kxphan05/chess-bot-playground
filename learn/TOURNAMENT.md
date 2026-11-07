# Taisp Scholars Chess Bot Tournament (proposal)

## Flow
1. Scholars finish lessons 1–6 in the playground, then improve their bot (lesson 7 ideas).
2. Each scholar saves their bot as `firstname.py` (must define `choose_move(board, time_left)`) and submits it (shared folder / repo PR).
3. The organiser runs: `python tools/tournament.py submissions/ --rounds 2 --time 2`
   -> prints and writes `leaderboard.md` (round-robin, both colours, crash/illegal/timeout = loss).
4. Optional live finale: top 4 replay in the playground's N-game match view, projected on screen.

## Rules (suggested)
- Python + `chess` only, no engines (e.g. Stockfish), no opening-book downloads, no network.
- Per-move limit 2 s. Bots must be handwritten by the scholar; be ready to explain your evaluation and search.
- Prizes could include "best explanation" and "most improved", not only strongest bot, to keep it friendly.

## Notes / caveats
- Round-robin cost: N bots × (N-1)/2 pairs × 4 games. 12 bots ≈ 264 games; each game can take minutes with deeper bots, so run it unattended.
- Submitted bots are arbitrary code and run with full access: run on a throwaway machine/container, and skim files first.
- Early test with the reference bots: many games draw (200-ply cap), so ranking separates weak bots from strong but ties are common among decent ones. Consider more rounds, or random opening positions, for the real event.
- Uses `signal.alarm`: Linux/macOS only.
