# Kibitz scoreboard reset prototype

This is the real-beta visual capture for the scoreboard-based two-board header
reset. The screenshots use the production Kibitz page and Goban path; the
temporary capture test was not committed.

## Capture environment

- Branch: `codex/kibitz-header-design`
- Starting SHA for this reset: `83d97838de726289494d75d608b99e1cda4b01b7`
- Frontend: local Vite at `http://127.0.0.1:8084`
- Backend: beta API and websocket services (`OGS_BACKEND=BETA`)
- Browser: authenticated Playwright Chromium
- Route: `http://127.0.0.1:8084/kibitz/user-c5c778e2`
- Viewport: `1920x1080`
- State: created through the authenticated Kibitz e2e helpers with real player
  pages kept open so the current game clocks remained live during capture
- Streamer mode: enabled through the real room-settings checkbox

## Games and variation

- Current game: `21244`, `Kibitz reset current game`
- Current-game players: `e2ekibResetBlk_0cgp9p0` vs `e2ekibResetWht_zt0vn80`
- Previous source game: `21243`, `E2E Kibitz live source game`
- Previous-game players: `e2ekibBlk_m1q96n0` vs `e2ekibWht_d18ph80`
- Variation title: `Historical source reset`
- Variation source: game `21243`, starting at move 4, with a real posted move
  at `C3`

The current game and source game were separate live games with different
players. The current game was left running while the screenshots were taken;
the historical source card intentionally has no clock, capture, or active-turn
state.

## Screenshots

| File                                           | State                                                                                                                |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `01-previous-variation-normal-1920x1080.jpg`   | Previous-game variation, normal mode; compact live scoreboard on the left and static source scoreboard on the right. |
| `02-previous-variation-streamer-1920x1080.jpg` | The same previous-game variation with streamer mode enabled and equal board tracks.                                  |
| `contact-sheet-scoreboard-reset.jpg`           | Compressed contact sheet of the two reset screenshots.                                                               |

The screenshots contain `KibitzInner`, `KibitzRoomStage`, `KibitzBoard`,
`KibitzDesktopCompareHeader`, the live compact scoreboard, the static source
scoreboard, and painted Goban SVGs. No visual fixture or fake board state was
used.

## Deliberate prototype compromises

- The static historical player card is a sibling presentation component rather
  than a live scoreboard instance, so it cannot accidentally display clocks or
  controller-driven state.
- Compare cards are bounded at `28rem`; the live card uses `1.75rem` avatars
  and the static source card uses `1.5rem` avatars.
- Beta test accounts use generated usernames and the beta avatar service may
  display its normal image-loading fallback in a restricted capture
  environment.
