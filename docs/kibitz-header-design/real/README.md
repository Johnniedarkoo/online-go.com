# Real Kibitz header validation

## Revision

- Branch: `codex/kibitz-header-design`
- Starting SHA: `d4b7ecdb4cad352cbcfb01f024da4f247e633e5d`
- Resulting SHA for the capture artifacts: to be filled after the artifact commit

## Environment

- URL: `http://127.0.0.1:8084/kibitz/user-d9ed5c8c`
- Frontend: local Vite development server on port 8084
- Backend: beta (`OGS_BACKEND=BETA`), with live beta API and websocket services
- Browser: Playwright Chromium
- Viewport: `1920x1080` for every screenshot
- State: created through the existing authenticated Kibitz e2e flow using five fresh beta test users; no fake boards, CSS board illustrations, or fixture route were used
- Streamer mode: enabled through the real room-settings checkbox while the historical variation was selected

## Games and variations

- Current game ID: `21210`
- Current-game players: `e2ekibCurBlk_1hs0pd0` vs `e2ekibCurWht_22zk0p0`
- Current-game title: `Current live broadcast game`
- Previous source game ID: `21209`
- Previous source-game players: `e2ekibBlk_8vh5kd0` vs `e2ekibWht_2n8j2z0`
- Previous source-game title: `E2E Kibitz live source game`
- Historical variation ID: `2lA.VUHptAO` (source game `21209`, starting at move 4)
- Additional current-game variation used for switching validation: `2lA.VUHq1ld` (source game `21210`, starting at move 2)

## Screenshots

| File | State |
| --- | --- |
| `01-current-variation-real-1920x1080.jpg` | Current-game variation, normal mode; the live game remains on the small left board and the current source line reads `From current game · move 4`. |
| `02-previous-variation-real-1920x1080.jpg` | Historical variation, normal mode; the left header names the new live game while the right header names the previous source players and title. |
| `03-previous-variation-streamer-real-1920x1080.jpg` | The same historical variation in streamer mode; the boards and header tracks expand to approximately equal widths. |
| `contact-sheet-real.jpg` | Compressed contact sheet of the three real captures. |

All three screenshots contain the real `KibitzInner`, `KibitzRoomStage`, `KibitzBoard`, `KibitzDesktopCompareHeader`, and painted Goban SVGs. The query-gated `KibitzHeaderDesignFixture` was not loaded.

## Interaction checks

The real browser flow verified that:

- posting a variation from the current game renders `From current game · move 4` and links to game `21209`;
- after changing the room to game `21210`, recalling the posted variation renders `Previous game · e2ekibBlk_8vh5kd0 vs e2ekibWht_2n8j2z0 · E2E Kibitz live source game` and links to game `21209`;
- the live side continues to show the current players, clocks, `LIVE`, and the current-game link to game `21210`;
- closing the compare view restores the original single-game header, and opening a second current-game variation changes the source label to the current game before switching back to the historical variation;
- the selected historical variation remains correct when streamer mode is enabled through room settings;
- both real Gobans painted and accepted moves throughout the flow, including the live game advancing before the source game was ended.

## Reproduction notes

Start the frontend with `OGS_BACKEND=BETA`, on an available local port, and run the existing authenticated Kibitz e2e helpers against that port. The capture flow used the temporary browser test created for this validation and then removed it after the screenshots were generated. The only browser-side instrumentation enabled was Kibitz's existing variation debug log, used to record the posted IDs; it did not inject room, game, player, clock, or variation state.

No narrower viewport was added because `1920x1080` exposed the relevant normal and streamer layouts without a separate desktop-only failure.
