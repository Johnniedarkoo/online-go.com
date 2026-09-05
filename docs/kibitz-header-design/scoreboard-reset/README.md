# Kibitz scoreboard reset prototype

This is the real-beta visual capture for the scoreboard-based two-board header
reset. The screenshots use the production Kibitz page and Goban path. The
clean review captures use a temporary browser-only asset shim described below;
the shim was not committed.

## Capture environment

- Branch: `codex/kibitz-header-design`
- Prototype head before clean captures: `b78ea465d1ab0c02b1448018e489e63d7b7c5f4f`
- Frontend: local Vite at `http://127.0.0.1:8084`
- Backend: beta API and websocket services (`OGS_BACKEND=BETA`)
- Browser: authenticated Playwright Chromium
- Route: `http://127.0.0.1:8084/kibitz/user-dfb2471b`
- Viewport: `1920x1080`
- State: created through the authenticated Kibitz e2e helpers with real player
  pages kept open so the current game clocks remained live during capture
- Streamer mode: enabled through the real room-settings checkbox

## Games and variation

- Current game: `21248`, `Kibitz review current game`
- Current-game players: `e2ekibReviewBlk_xqjpv50` vs `e2ekibReviewWht_tk7jdk0`
- Previous source game: `21247`, `E2E Kibitz live source game`
- Previous-game players: `e2ekibBlk_6n9gtk0` vs `e2ekibWht_4jyj1k0`
- Variation title: `Historical source review`
- Variation source: game `21247`, starting at move 4, with a real posted move
  at `C3`

The current game and source game were separate live games with different
players. The current game was left running while the screenshots were taken;
the historical source card intentionally has no clock, capture, or active-turn
state.

## Screenshots

| File                                                  | State                                                                               |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `01-previous-variation-normal-1920x1080.jpg`          | Original reset capture before the review-only asset shim.                           |
| `02-previous-variation-streamer-1920x1080.jpg`        | Original streamer capture before the review-only asset shim.                        |
| `03-previous-variation-normal-review-1920x1080.jpg`   | Clean review capture; previous-game variation in normal mode.                       |
| `04-previous-variation-streamer-review-1920x1080.jpg` | Clean review capture; the same variation with streamer mode and equal board tracks. |
| `contact-sheet-scoreboard-reset.jpg`                  | Compressed contact sheet using the two clean review captures.                       |

All screenshots contain `KibitzInner`, `KibitzRoomStage`, `KibitzBoard`,
`KibitzDesktopCompareHeader`, the live compact scoreboard, the static source
scoreboard, and painted Goban SVGs. No visual fixture or fake board state was
used.

## Capture-only asset shim

The beta test users had real names, ranks, countries, and icon URLs. The
restricted Playwright environment could not load the external avatar host
(`secure.gravatar.com`) or flag sprite host (`cdn.online-go.com`). The clean
review capture therefore ran a temporary browser-side shim after the real page
had rendered:

- failed avatar `<img>` elements only were replaced with deterministic local
  SVG initials, preserving their existing dimensions and radius;
- the four existing `un` country flag slots were given deterministic local SVG
  graphics for visual review only: JP, DE, US, and KR;
- successful images were not replaced, and no backend data, DOM structure,
  player data, board state, clocks, card widths, or spacing were changed.

The temporary Playwright shim and its config were deleted before the commit.
There is no avatar, flag, country, or fallback shim in production code.

## Deliberate prototype compromises

- The static historical player card is a sibling presentation component rather
  than a live scoreboard instance, so it cannot accidentally display clocks or
  controller-driven state.
- Compare cards are bounded at `28rem`; the live card uses `1.75rem` avatars
  and the static source card uses `1.5rem` avatars.
- Beta test accounts use generated usernames and the beta avatar service may
  display its normal image-loading fallback in a restricted capture
  environment.
