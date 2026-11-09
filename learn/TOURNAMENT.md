# ⚔️ TAISP Bot Tournament

Live page: **arena.html** (🏆 Leaderboard · ⚔️ Battle now · 📝 Enter a bot)

## 🧑‍🎓 Scholars
1. Build a bot in the Playground → **⬇ .py**
2. Top of the file:
   ```python
   # name: My Cool Bot
   # author: Your Name
   ```
3. Test it: Arena → **⚔️ Battle now** → **➕ Add .py files** → fight the house bots
4. Submit: pull request adding `bots/yourname.py` (or send the file to the organiser)

## 🧑‍🏫 Organiser
| When | What happens (`.github/workflows/arena.yml`) |
|---|---|
| PR adds a bot | ✅ check: plays 2 games vs House Random, table in the PR's Checks tab |
| PR merged to `main` | 🏆 full round-robin → commits `bots/arena.json` + `bots/leaderboard.md` → site updates |
| Actions → Bot Arena → **Run workflow** | rerun with custom rounds / seconds per move |

Offline: `python learn/tools/tournament.py bots --rounds 1 --time 1 --json bots/arena.json`

## 📜 Rules
- Python + `chess` only. No engines, no internet.
- Crash / illegal move / too slow (time + 1.5 s) = lose that game. Over 5 s to start = can't enter.
- Win 1 · draw ½ · loss 0 · 100-move cap = draw.
- Prizes idea: 🥇 strongest · 🧠 best explanation · 📈 most improved.

## ⚠️ Notes
- Cost grows fast: N bots → N×(N−1) games per round. 12 bots ≈ 132 games ≈ 30–90 min on GitHub (free for public repos, 5 h limit set).
- Bot code runs only in a read-only CI job; the commit job never runs bot code. Still skim PRs before merging.
