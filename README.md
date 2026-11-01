# Swappers

A puzzle-platformer made of text, for [GitHub Game Off 2026](https://itch.io/jam/game-off-2026) (theme: **SHIFT**).

The level is made of letters, and their pixels are solid. Hold **Shift** and `NO` becomes `no`,
low enough to hop over. `6` becomes `^`, a door you can walk under. Caps Lock flips letters but not
numbers, just like your keyboard.

## Play

| Action | Keys |
| --- | --- |
| Move | ← → or A D |
| Jump | ↑, W or Space |
| Shift (hold) | Shift, or X |
| Caps Lock (toggle) | Caps Lock, or C |
| Restart | R |

## Run it locally

Needs Node 22+.

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:5173. Before pushing, run:

```bash
npm run check
```

## Levels

There are 10 levels. Each one adds one new idea on top of the previous ones:

| # | Name | New idea |
| --- | --- | --- |
| 01 | NO means no | Shift shrinks capitals into lowercase you can hop |
| 02 | Both ways | Lowercase grows when shifted, so you switch mid-climb |
| 03 | Going up | A letter growing under you carries you up |
| 04 | Shift 6 | The number row: `6` becomes a `^` door (Caps Lock can't open it) |
| 05 | Jammed | Let go inside a door and it waits for you |
| 06 | Low bar | Floating `-` / `_` bars that move when shifted |
| 07 | CAPS LOCK | Caps Lock flips letters but leaves symbols alone |
| 08 | Read the shapes | Ascenders (`l`, `h`) stay tall even in lowercase |
| 09 | Stepping stones | Letters floating over a pit |
| 10 | Final shift | Everything, on two floors |

Finish a level and press **Enter** for the next one. To jump straight to a level while testing,
add `?level=7` to the URL, e.g. http://localhost:5173/?level=7.

### Making a level

Levels are text files in `src/levels/`. Copy one, edit the 20x9 map, register it in
`src/levels/index.ts`, and run `npm run dev` to play it. The legend and rules are in the comment
at the top of `src/core/level.ts`.

`npm test` runs a solver (`src/core/solver.ts`) on every level. It plays the real physics with
every combination of moves, jumps and Shift, and fails the test if a level can't be beaten.
`tests/level-design.test.ts` also checks that no level can be beaten without Shift, so a font or
physics change can't quietly add a shortcut. Still play every level yourself: the solver finds
pixel-perfect routes a human won't.

## Deploying to itch.io (one-time setup)

Every push to `main` builds the game and uploads it to itch automatically, once these exist:

1. **Create the itch project** at https://itch.io/game/new (it can stay a draft):
   - Kind of project: **HTML**
   - Embed options: viewport **960 x 540**, tick **Fullscreen button**, leave **SharedArrayBuffer support** off (not needed)
   - Leave **Automatically start on page load** off. "Click to play" gives the game keyboard focus.
   - Note the URL slug, e.g. `https://yourname.itch.io/swappers` -> `yourname/swappers`.
2. **Get a butler API key**: https://itch.io/user/settings/api-keys -> Generate new API key.
3. In this GitHub repo, **Settings -> Secrets and variables -> Actions**:
   - Secrets tab: add `BUTLER_API_KEY` = the key.
   - Variables tab: add `ITCH_TARGET` = `yourname/swappers`.
4. Push to `main` (or run the workflow manually from the Actions tab). The first upload creates the
   `html5` channel; on the itch edit page, tick **This file will be played in the browser** for it.

Until the secret and variable exist, the itch step is skipped with a warning and the build still runs.
Every run also attaches the built game as a `web-build` artifact you can download from the Actions tab.

After the jam deadline (Dec 1 2026, 13:37 PST) the workflow refuses to upload, so the submitted build
can't be overwritten by accident.
