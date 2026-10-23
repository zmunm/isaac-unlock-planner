# Isaac Unlock Planner

**https://isaac-unlock-planner.zmunm.com** — a fan-made planner for **The Binding of Isaac: Repentance+**. It reads your Steam achievements and
tells you which run to play next — which character, which route, Normal or Hard — and what that run
unlocks.

- **Runs** — your missing achievements grouped into single runs, ranked by how many marks a run
  earns, the quality of the items it unlocks, and whether it opens a challenge.
- **Grid** — the in-game completion-marks screen, 34 characters × 13 marks, each cell showing what
  that mark unlocks.
- **Characters** — everything left for one character, grouped by route.
- **Challenges** — remaining challenges with their character, goal, starting items and reward.

English and Korean UI. Paste a public Steam profile URL — no login.

## How it works

```
browser ──► Cloudflare Worker ──► Steam Web API   (your achievements, global unlock rates)
   ├──────────────────────────────► Isaac wiki      (item sprites, loaded directly)
   └── unlock conditions, item quality, challenges: built once from the wiki into src/data/isaac.json
```

- **The worker** exists only because the Steam Web API needs a secret key and sends no CORS headers.
  It has two routes: `/api/resolve` (profile URL → SteamID) and `/api/isaac` (achievements).
- **Any public profile** can be viewed at `/?id=<SteamID64 or custom URL name>`. Steam only exposes
  achievements for profiles whose *Game details* are public.
- **Planning** happens in the browser (`src/planner.ts`, `src/completion.ts`) from the bundled wiki
  data and your unlocked achievement ids.

## Privacy

- Steam responses are cached at the edge: your achievements, profile name and avatar for 5 minutes;
  global unlock rates, the achievement list and custom-URL lookups for a day. Nothing is written to
  a database.
- There is no login and no cookie. The last profile you looked up is remembered in your browser's
  local storage only.
- Looking up a profile by URL only reads data that profile already makes public.
- Item sprites load straight from the wiki, so the wiki sees your IP like any visit.

## Development

Requires Node 22+ and pnpm.

```bash
pnpm install
cp .dev.vars.example .dev.vars   # add a Steam Web API key: https://steamcommunity.com/dev/apikey
pnpm preview                     # worker + built site on http://localhost:8787
pnpm dev                         # UI with hot reload; proxies /api to pnpm preview
pnpm test
pnpm check                       # lint + build + tests + knip — what CI runs
```

Pushes to `main` deploy through Cloudflare's Git integration. `STEAM_API_KEY` is a secret on the
worker, set in the Cloudflare dashboard.

### Fonts

The page first loads small Galmuri files (~10 KB each) holding ASCII and only the Hangul the UI
uses; the full files are fetched only if other Hangul appears (e.g. a Korean Steam nickname).
After changing Korean UI text, run `scripts/subset-fonts.sh` (needs [uv](https://docs.astral.sh/uv/)).

### Refreshing the wiki data

```bash
node scripts/fetch-wiki.mjs   # rewrites src/data/isaac.json from the wiki's Cargo tables
```

Image URLs come out of the same run, so nothing else needs refreshing.

## Credits and licenses

- **Code** — MIT, see [LICENSE](LICENSE).
- **Unlock conditions, item quality, challenge data** (`src/data/isaac.json`) — from
  [The Binding of Isaac Wiki](https://bindingofisaacrebirth.wiki.gg), licensed
  [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Changes: reduced to the current
  (Repentance+) wording and reshaped into JSON.
- **Font** — [Galmuri](https://github.com/quiple/galmuri) by Lee Minseo, SIL Open Font License 1.1
  ([src/fonts/OFL.md](src/fonts/OFL.md)).
- **Game art and names** belong to Edmund McMillen and Nicalis. This repository contains no game
  assets; sprites are fetched from the wiki at runtime. This is a non-commercial fan project, not
  affiliated with Nicalis or Valve.
