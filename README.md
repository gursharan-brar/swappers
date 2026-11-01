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

## Making levels

Levels are text files in `src/levels/`. Copy `level01.ts`, edit the 20x9 map, register it in
`src/levels/index.ts`, and run `npm run dev` to play it. See the comments in `level01.ts` and
`src/core/level.ts` for the legend and rules.

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
