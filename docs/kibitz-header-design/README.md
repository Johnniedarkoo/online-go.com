# Kibitz desktop header design exploration

This is a visual prototype for the Kibitz desktop header when the room shows a
live/main board beside a variation board. It is intentionally query-gated and
does not change the normal Kibitz screen unless the design-fixture query is
present.

## Revision

- Branch: `codex/kibitz-header-design`
- Starting SHA: `567469131e9b271f67cadbfabc19b0750c71ad08` (`origin/main` on 2026-09-04)
- Resulting SHA (prototype implementation and screenshots): `50aaeadf8`

## Screenshots

All screenshots are desktop captures at CSS viewport `1920x1080`, except the
last narrower check at `1366x768`. JPEG quality is 90 for individual captures;
the contact sheet is JPEG quality 88.

| File | State | Fixture data |
| --- | --- | --- |
| `01-baseline-1920x1080.jpg` | Baseline, main game only, normal mode | Current game `90408001`: riverstone vs lunarfox, “Friday night game · live board” |
| `02-current-variation-1920x1080.jpg` | Current-game variation, normal mode; small main board and large variation board | Variation “Corner tesuji alternative” by SoraKite, from current game at move 42 |
| `03-previous-variation-1920x1080.jpg` | Previous-game variation, normal mode; small live board and large historical variation board | Source game `90374122`: AkiKuma vs MilaZen, “European Team League · Round 5”; variation “Endgame ko fight” by SoraKite |
| `04-previous-variation-streamer-1920x1080.jpg` | Previous-game variation, streamer mode; equal board columns | Same previous-game source and variation as above |
| `05-current-variation-streamer-1920x1080.jpg` | Current-game variation, streamer mode; equal board columns | Same current-game source and variation as `02` |
| `06-previous-variation-1366x768.jpg` | Narrower desktop check of the previous-game variation | Same previous-game source and variation as `03` |
| `contact-sheet.jpg` | Contact sheet of the five requested 1920×1080 states | Key screenshots at readable review size |

The deterministic fixture can be opened locally with:

```text
/kibitz/design?kibitz-header-design=baseline
/kibitz/design?kibitz-header-design=current
/kibitz/design?kibitz-header-design=previous
/kibitz/design?kibitz-header-design=previous-streamer
/kibitz/design?kibitz-header-design=current-streamer
```

## Design notes

- The main-game-only branch retains the existing full-width header structure.
- With two boards, the header becomes two context regions using the same
  horizontal tracks as the board grid below: a compact live/current-game
  context on the left and a variation/source-game context on the right.
- The left context keeps the room settings affordance and room title, a clear
  live marker, both current-game players, clocks, and the current game link.
- The right context identifies the variation author and makes the source game
  explicit. The previous-game fixture deliberately uses different players so
  the historical source cannot be mistaken for the live board.
- Streamer mode reuses the same component and information architecture; only
  the board/header track proportions change to equal columns.
- The production-facing header component receives the existing
  `selectedVariationSourceGame` value from `KibitzRoomStage`. It does not add a
  second source-game lookup path.

## Prototype compromises

- The fixture is a query-gated deterministic visual harness because the local
  beta backend was unavailable during capture. Its boards are CSS-rendered
  illustrations and its clocks are fixed labels; this keeps the screenshots
  stable and avoids committing test data or browser caches.
- In the real Kibitz path, the split header uses the existing game/controller
  objects and the existing live scoreboard component. The fixture-only static
  scoreboard is used to make the requested states render without a connected
  game.
- Captures, ranks, flags, and avatars are intentionally reduced in the narrow
  live context so the primary identity, clock, title, and source distinctions
  remain legible.
