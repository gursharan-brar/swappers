# Prepay Only (working title)

A gas-bar comedy for [GitHub Game Off 2026](https://itch.io/jam/game-off-2026) (theme: **SHIFT**).

One shift at a Calgary gas bar, squeezed into 90 seconds of 5-second microgames. Do what the
screen says, fast. When the clock hits zero your coworker walks in for SHIFT CHANGE and grades
the state of the store: ANGEL, ACCEPTABLE or MONSTER. Mess up three times and you're sent home early.

This is a grey-box prototype: coloured shapes and synthesized beeps, built to answer one
question. Is it fun?

## Play

Mouse only (number keys also work for AUTHORIZE). **M** mutes.

| Microgame | What you do |
| --- | --- |
| AUTHORIZE! | A customer says "Forty on six!". Click pump 6. |
| BOOST! | It's -30. Drag the red clamp onto the + terminal (not the -). |
| RE-LETTER! | The price changed. Drag the missing digit onto the sign. |
| MOP! | Rub the mouse over the spills until the floor is clean. |

Microgames get faster every 3 wins. There are 3 lives, shown as coffee cups.

## Run it locally

Needs Node 22+ and Git.

```bash
npm ci
```

```bash
npm run dev
```

Then open http://localhost:5173 and click to clock in. Before pushing, run:

```bash
npm run check
```

## Adding a microgame

Each microgame is one file in `src/game/microgames/`. To add one:

1. Copy a similar one (`authorize.ts` for clicking, `boost.ts` or `reletter.ts` for dragging,
   `mop.ts` for rubbing).
2. Give it a new `id`, a one-word `instruction` ending in `!`, and a short `hint`.
3. Add it to the list in `src/game/microgames/index.ts`.
4. Play only yours on repeat: http://localhost:5173/?only=yourid

Rules of thumb: a player must understand it within one second of the word appearing, it must
be winnable in about 2.5 seconds once things speed up, and it should be about doing, not
thinking. Real details from the job make the best ones.

Tunables (shift length, lives, speed-up, grade thresholds, coworker's name) live in `src/config.ts`.

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
