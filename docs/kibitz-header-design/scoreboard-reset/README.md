# Kibitz scoreboard reset prototype

This is the real-beta visual capture for the scoreboard-based two-board header
reset. The screenshots use the production Kibitz page and Goban path. The
clean review captures use a temporary browser-only asset shim described below;
the shim was not committed.

## Capture environment

- Branch: `codex/kibitz-header-design`
- Prototype head before clean captures: `b78ea465d1ab0c02b1448018e489e63d7b7c5f4f`
- Refinement starting SHA: `c19d9cc0b22c553921555e6266bc221f6df3a141`
- Current variation-card and positioning pass starting SHA: `2a080af57097103c1aa99961cc09b67315c09c4d`
- Frontend: local Vite at `http://127.0.0.1:8084`
- Backend: beta API and websocket services (`OGS_BACKEND=BETA`)
- Browser: authenticated Playwright Chromium
- Route: `http://127.0.0.1:8084/kibitz/user-32b84b41`
- Viewport: `1920x1080`
- State: created through the authenticated Kibitz e2e helpers with real player
  pages kept open so the current game clocks remained live during capture
- Streamer mode: enabled through the real room-settings checkbox

## Games and variation

- Current game: `21291`, `Kibitz review current game`
- Current-game players: `e2ekibRevBlk_pzp2jf0` vs `e2ekibRevWht_3h7t3f0`
- Previous source game: `21290`, `E2E Kibitz live source game`
- Previous-game players: `e2ekibBlk_cd963l0` vs `e2ekibWht_184h7x0`
- Variation title: `Current game source review`
- Variation source: game `21290`, starting at move 4, with a real posted move
  at `C3`

The current-game screenshots were taken before switching the room to game
`21291`, so the static source card intentionally repeats the source players
from the live game. The previous-game screenshots were taken after that room
switch, so the live/current players and historical source players are
different. The current game was left running while the screenshots were
taken; the historical source card intentionally has no clock, capture, or
active-turn state.

## Screenshots

| File                                                   | State                                                                               |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `01-previous-variation-normal-1920x1080.jpg`           | Original reset capture before the review-only asset shim.                           |
| `02-previous-variation-streamer-1920x1080.jpg`         | Original streamer capture before the review-only asset shim.                        |
| `03-previous-variation-normal-review-1920x1080.jpg`    | Clean review capture; previous-game variation in normal mode.                       |
| `04-previous-variation-streamer-review-1920x1080.jpg`  | Clean review capture; the same variation with streamer mode and equal board tracks. |
| `05-previous-variation-normal-refined-1920x1080.jpg`   | Refined capture; bounded live header and tighter compact player spacing.            |
| `06-previous-variation-streamer-refined-1920x1080.jpg` | Refined streamer capture; the live cluster remains bounded at 28rem.                |
| `07-current-variation-normal-refined-1920x1080.jpg`    | Current-game variation; normal two-board mode with a static source card.            |
| `08-current-variation-streamer-refined-1920x1080.jpg`  | Current-game variation; streamer mode with equal board tracks.                      |
| `09-previous-variation-normal-refined-1920x1080.jpg`   | Previous-game variation with distinct current and source players.                   |
| `10-previous-variation-streamer-refined-1920x1080.jpg` | Previous-game variation; streamer mode with equal board tracks.                     |
| `contact-sheet-scoreboard-reset.jpg`                   | Compressed contact sheet using the four current refined captures.                   |

All screenshots contain `KibitzInner`, `KibitzRoomStage`, `KibitzBoard`,
`KibitzDesktopCompareHeader`, the live compact scoreboard, the static source
scoreboard, and painted Goban SVGs. No visual fixture or fake board state was
used.

## Capture-only asset shim

The beta test users supplied real names, ranks, game state, clocks, and icon
URLs. In this capture, the generated users did not have country values in the
room data. The restricted Playwright environment also could not load the
external avatar host (`secure.gravatar.com`) or flag sprite host
(`cdn.online-go.com`). The clean review capture therefore ran a temporary
browser-side shim after the real page had rendered:

- failed avatar images and empty avatar fallback slots only were populated with
  deterministic local initials, preserving their existing dimensions and
  radius;
- missing flag slots were populated with deterministic local flag graphics for
  visual review only;
- successful images were not replaced, and no backend data, DOM structure,
  player data, board state, clocks, card widths, or spacing were changed.

The temporary Playwright shim and its config were deleted before the commit.
There is no avatar, flag, country, or fallback shim in production code.

## Deliberate prototype compromises

- The static historical player card is a sibling presentation component rather
  than a live scoreboard instance, so it cannot accidentally display clocks or
  controller-driven state.
- Compare cards are bounded at `28rem`; the live card uses `1.625rem` avatars
  and the static source card uses `1.5rem` avatars.
- Beta test accounts use generated usernames and the beta avatar service may
  display its normal image-loading fallback in a restricted capture
  environment.
