# Kibitz current-variation header A/B comparison

These screenshots compare the original current-game header with the retained
split/card header. They were captured from the real beta-backed Kibitz page,
not from a visual fixture.

## Capture details

- Branch: `codex/kibitz-header-design`
- Frontend: local Vite at `http://127.0.0.1:8084`
- Backend: beta API and websocket services (`OGS_BACKEND=BETA`)
- Browser: authenticated Playwright Chromium
- Route: `http://127.0.0.1:8084/kibitz/user-cf89908c`
- Viewport: `1920x1080`
- Variation: `Current game source review`, starting at move 4 with a real
  posted `C3` move
- Source game: `21293`, `e2ekibBlk_tbxbhb0` vs `e2ekibWht_k9pnk50`
- Replacement current game: `21294`, `e2ekibRevBlk_j2bl080` vs
  `e2ekibRevWht_6s7mr70`

The default current-game captures omit the query parameter. The forced-split
captures use:

`?kibitz_current_variation_header=split`

The previous-game captures were made after changing the room to game `21294`;
previous-game variations always use the split header, regardless of the query
parameter.

## Screenshots

| File | State |
| --- | --- |
| `01-current-variation-default-normal-1920x1080.jpg` | Current-game variation, original single header, normal mode. |
| `02-current-variation-default-streamer-1920x1080.jpg` | Current-game variation, original single header, streamer mode. |
| `03-current-variation-forced-split-normal-1920x1080.jpg` | Current-game variation, split/card header, normal mode. |
| `04-current-variation-forced-split-streamer-1920x1080.jpg` | Current-game variation, split/card header, streamer mode. |
| `05-previous-variation-normal-1920x1080.jpg` | Previous-game variation, split/card header, normal mode. |
| `06-previous-variation-streamer-1920x1080.jpg` | Previous-game variation, split/card header, streamer mode. |
| `ab-comparison-contact-sheet.jpg` | Compressed six-image contact sheet. |

All images contain the real `KibitzInner`, `KibitzRoomStage`, `KibitzBoard`,
and painted Goban SVGs. Current-game default uses the original header path;
the other two-board states use `KibitzDesktopCompareHeader`.

The temporary browser capture used a post-render shim only for missing avatar
and country-flag visuals. Names, ranks, clocks, player order, game state,
variation state, and Gobans remained real. The shim was removed before commit
and is not present in production code.
