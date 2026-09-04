# Real Kibitz header validation

## Revision

- Branch: `codex/kibitz-header-design`
- Starting SHA: `8d9fefa61fe8d63117c0b5798baaf53d699c1a72`
- Resulting SHA for the capture artifacts: `74e80c4f945394f64e26632c74e4b41f4a9fa026`

## Environment

- URL: `http://127.0.0.1:8084/kibitz/user-b192070d`
- Frontend: local Vite development server on port 8084
- Backend: beta (`OGS_BACKEND=BETA`), with live beta API and websocket services
- Browser: authenticated Playwright Chromium
- Viewports: `1920x1080` for the first three screenshots; `1366x768` for the responsive screenshot
- State: created through the existing authenticated Kibitz e2e flow using five fresh beta test users; no fake boards, CSS board illustrations, or fixture route were used
- Streamer mode: enabled through the real room-settings checkbox while the historical variation was selected

## Games and variations

- Current game ID: `21224`
- Current-game players: `e2ekibCurBlk_0xnw640` vs `e2ekibCurWht_kq8l4y0`
- Current-game title: `Current live broadcast game`
- Previous source game ID: `21223`
- Previous source-game players: `e2ekibBlk_47wn530` vs `e2ekibWht_0krtkl0`
- Previous source-game title: `E2E Kibitz live source game`
- Historical variation ID: `2ll.VUI5vYB` (source game `21223`, starting at move 4)
- Additional current-game variation used for switching validation: `2ll.VUI63hY` (source game `21224`, starting at move 2)
- Responsive capture run: previous source game `21226` (`e2ekibBlk_6g1rlw0` vs `e2ekibWht_bt742b0`), current game `21227` (`e2ekibCurBlk_7vg7bx0` vs `e2ekibCurWht_mrv0pd0`), variation title `Responsive previous-game branch`

## Screenshots

| File                                                | State                                                                                                                                               |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `01-current-variation-real-1920x1080.jpg`           | Current-game variation, normal mode; the live game remains on the small left board and the current source line reads `From current game · move 4`.  |
| `02-previous-variation-real-1920x1080.jpg`          | Historical variation, normal mode; the left header names the new live game while the right header names the previous source players and title.      |
| `03-previous-variation-streamer-real-1920x1080.jpg` | The same historical variation in streamer mode; the boards and header tracks expand to approximately equal widths.                                  |
| `04-previous-variation-real-1366x768.jpg`           | Historical variation, normal mode at the narrower desktop viewport; the live and historical contexts remain readable with the full variation inset. |
| `contact-sheet-real.jpg`                            | Compressed contact sheet of the four real captures.                                                                                                 |

All four screenshots contain the real `KibitzInner`, `KibitzRoomStage`,
`KibitzBoard`, `KibitzDesktopCompareHeader`, and painted Goban SVGs. The
query-gated `KibitzHeaderDesignFixture` was not loaded.

## Interaction checks

The real browser flow verified that:

- posting a variation from the current game renders `From current game · move 4` and links to game `21223`;
- after changing the room to game `21224`, recalling the posted variation renders `Previous game · e2ekibBlk_47wn530 vs e2ekibWht_0krtkl0 · E2E Kibitz live source game` and links to game `21223`;
- the live side continues to show the current players, clocks, `LIVE`, and the current-game link to game `21224`;
- closing the compare view restores the original single-game header, and opening a second current-game variation changes the source label to the current game before switching back to the historical variation;
- the selected historical variation remains correct when streamer mode is enabled through room settings;
- both real Gobans painted and accepted moves throughout the flow, including the live game advancing before the source game was ended.

## Reproduction notes

Start the frontend with `OGS_BACKEND=BETA` on an available local port, and run
the existing authenticated Kibitz e2e helpers against that port. The capture
flow used a temporary browser test created for this validation and then
removed it after the screenshots were generated. The only browser-side
instrumentation enabled was Kibitz's existing variation debug log, used to
record the posted IDs; it did not inject room, game, player, clock, or
variation state.

The `1366x768` capture was added to exercise the desktop layout below the former
`1700px` breakpoint and verify that the variation context keeps its full optical
inset without introducing truncation or overlap.
