/*
 * Copyright (C)  Online-Go.com
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import * as React from "react";
import { pgettext } from "@/lib/translate";
import type { KibitzRoomSummary, KibitzVariationSummary, KibitzWatchedGame } from "@/models/kibitz";
import { KibitzDesktopCompareHeader } from "./KibitzDesktopCompareHeader";
import "./KibitzHeaderDesignFixture.css";

export type KibitzHeaderDesignFixtureVariant =
    | "baseline"
    | "current"
    | "previous"
    | "previous-streamer"
    | "current-streamer";

interface KibitzHeaderDesignFixtureProps {
    variant: KibitzHeaderDesignFixtureVariant;
}

const room: KibitzRoomSummary = {
    id: "header-design-room",
    channel: "kibitz-header-design-room",
    title: "Friday night go · commentary room",
    kind: "user",
    viewer_count: 24,
};

function makeUser(id: number, username: string, ranking: number, uiClass: string) {
    return {
        id,
        username,
        ranking,
        professional: false,
        ui_class: uiClass,
    };
}

const currentGame: KibitzWatchedGame = {
    game_id: 90408001,
    board_size: "19x19",
    title: "Friday night game · live board",
    black: makeUser(101, "riverstone", 4, "supporter"),
    white: makeUser(102, "lunarfox", 3, ""),
    move_number: 42,
    live: true,
};

const previousGame: KibitzWatchedGame = {
    game_id: 90374122,
    board_size: "19x19",
    title: "European Team League · Round 5",
    black: makeUser(201, "AkiKuma", 5, "supporter"),
    white: makeUser(202, "MilaZen", 4, ""),
    move_number: 176,
    live: false,
};

function makeVariation(
    game: KibitzWatchedGame,
    id: string,
    title: string,
    from: number,
): KibitzVariationSummary {
    return {
        id,
        room_id: room.id,
        source: "room",
        game_id: game.game_id,
        creator: makeUser(301, "SoraKite", 2, ""),
        created_at: 1770000000000,
        viewer_count: 7,
        current_viewers: [],
        title,
        analysis_from: from,
        move_count: from + 12,
    };
}

const currentVariation = makeVariation(
    currentGame,
    "header-current-variation",
    "Corner tesuji alternative",
    42,
);
const previousVariation = makeVariation(
    previousGame,
    "header-previous-variation",
    "Endgame ko fight",
    118,
);

const stonePlacements: Array<{ left: string; top: string; color: "black" | "white" }> = [
    { left: "18%", top: "18%", color: "black" },
    { left: "34%", top: "24%", color: "white" },
    { left: "64%", top: "22%", color: "black" },
    { left: "76%", top: "35%", color: "white" },
    { left: "26%", top: "55%", color: "white" },
    { left: "48%", top: "48%", color: "black" },
    { left: "71%", top: "63%", color: "black" },
    { left: "58%", top: "78%", color: "white" },
];

function renderBoard(label: string, variation: boolean): React.ReactElement {
    return (
        <div className="KibitzHeaderDesignFixture-boardWrap">
            <div className="KibitzHeaderDesignFixture-board" role="img" aria-label={label}>
                <div className="KibitzHeaderDesignFixture-boardGrid" />
                {stonePlacements.map((stone, index) => (
                    <span
                        className={
                            "KibitzHeaderDesignFixture-stone KibitzHeaderDesignFixture-stone--" +
                            stone.color
                        }
                        key={`${variation ? "variation" : "main"}-${index}`}
                        style={{ left: stone.left, top: stone.top }}
                    />
                ))}
                {variation ? (
                    <span
                        className="KibitzHeaderDesignFixture-mark"
                        style={{ left: "48%", top: "48%" }}
                        aria-hidden="true"
                    />
                ) : null}
            </div>
            <div className="KibitzHeaderDesignFixture-boardCaption">
                {variation
                    ? pgettext(
                          "Kibitz header design fixture variation board caption",
                          "Variation board",
                      )
                    : pgettext(
                          "Kibitz header design fixture current board caption",
                          "Live current board",
                      )}
            </div>
        </div>
    );
}

function renderLegacyScoreboard(game: KibitzWatchedGame): React.ReactElement {
    return (
        <div className="KibitzHeaderDesignFixture-legacyScoreboard">
            <div className="KibitzHeaderDesignFixture-legacyPlayer KibitzHeaderDesignFixture-legacyPlayer--black">
                <span className="KibitzHeaderDesignFixture-legacyStone KibitzHeaderDesignFixture-legacyStone--black" />
                <span>{game.black.username}</span>
                <strong>12:48</strong>
            </div>
            <div className="KibitzHeaderDesignFixture-legacyPlayer KibitzHeaderDesignFixture-legacyPlayer--white">
                <span className="KibitzHeaderDesignFixture-legacyStone KibitzHeaderDesignFixture-legacyStone--white" />
                <span>{game.white.username}</span>
                <strong>08:31</strong>
            </div>
        </div>
    );
}

function renderBaselineHeader(): React.ReactElement {
    return (
        <header className="KibitzHeaderDesignFixture-legacyHeader">
            <div className="KibitzHeaderDesignFixture-legacyRoom">
                <button
                    type="button"
                    aria-label={pgettext("Kibitz header design fixture settings", "Room settings")}
                >
                    <i className="fa fa-gear" aria-hidden="true" />
                </button>
                <strong>{room.title}</strong>
            </div>
            {renderLegacyScoreboard(currentGame)}
            <div className="KibitzHeaderDesignFixture-legacyGame">
                <a href={`/game/${currentGame.game_id}`}>{currentGame.title}</a>
                <span>
                    {pgettext(
                        "Kibitz header design fixture baseline metadata",
                        "Live · 19x19 · move 42",
                    )}
                </span>
            </div>
        </header>
    );
}

export function KibitzHeaderDesignFixture({
    variant,
}: KibitzHeaderDesignFixtureProps): React.ReactElement {
    const isBaseline = variant === "baseline";
    const isStreamer = variant.endsWith("streamer");
    const isPrevious = variant.startsWith("previous");
    const variation = isPrevious ? previousVariation : currentVariation;
    const sourceGame = isPrevious ? previousGame : currentGame;

    return (
        <div
            className={
                "KibitzHeaderDesignFixture" +
                (isStreamer ? " is-streamer" : "") +
                (isBaseline ? " is-baseline" : " is-compare")
            }
        >
            <div className="KibitzHeaderDesignFixture-topbar">
                <span className="KibitzHeaderDesignFixture-brand">OGS</span>
                <span>{pgettext("Kibitz header design fixture navigation", "Kibitz")}</span>
                <span className="KibitzHeaderDesignFixture-topbarHint">
                    {pgettext(
                        "Kibitz header design fixture navigation hint",
                        "Desktop visual exploration",
                    )}
                </span>
            </div>
            <div className="KibitzHeaderDesignFixture-app">
                <aside className="KibitzHeaderDesignFixture-rail">
                    <div className="KibitzHeaderDesignFixture-railLabel">
                        {pgettext("Kibitz header design fixture room list label", "ROOMS")}
                    </div>
                    <div className="KibitzHeaderDesignFixture-roomItem is-active">
                        <span>{room.title}</span>
                        <small>
                            {pgettext(
                                "Kibitz header design fixture room viewer count",
                                "24 watching",
                            )}
                        </small>
                    </div>
                    <div className="KibitzHeaderDesignFixture-roomItem">
                        <span>
                            {pgettext(
                                "Kibitz header design fixture secondary room",
                                "Weekend league",
                            )}
                        </span>
                        <small>
                            {pgettext(
                                "Kibitz header design fixture room viewer count",
                                "11 watching",
                            )}
                        </small>
                    </div>
                    <div className="KibitzHeaderDesignFixture-railLabel is-people">
                        {pgettext("Kibitz header design fixture presence label", "PRESENT")}
                    </div>
                    <div className="KibitzHeaderDesignFixture-presence">
                        {pgettext(
                            "Kibitz header design fixture presence summary",
                            "MilaZen · SoraKite · 22 others",
                        )}
                    </div>
                </aside>
                <main className="KibitzHeaderDesignFixture-main">
                    <div className="KibitzHeaderDesignFixture-workspace">
                        <section className="KibitzHeaderDesignFixture-stage">
                            {isBaseline ? (
                                renderBaselineHeader()
                            ) : (
                                <header className="KibitzHeaderDesignFixture-compareHeader">
                                    <KibitzDesktopCompareHeader
                                        room={room}
                                        mainGame={currentGame}
                                        mainBoardController={null}
                                        selectedVariation={variation}
                                        selectedVariationSourceGame={sourceGame}
                                        designClockLabels={{ black: "12:48", white: "08:31" }}
                                        onOpenRoomSettings={() => undefined}
                                    />
                                </header>
                            )}
                            <div className="KibitzHeaderDesignFixture-boards">
                                <section className="KibitzHeaderDesignFixture-boardPanel KibitzHeaderDesignFixture-boardPanel--main">
                                    {renderBoard(
                                        pgettext(
                                            "Kibitz header design fixture current board aria label",
                                            "Live current game board",
                                        ),
                                        false,
                                    )}
                                    <div className="KibitzHeaderDesignFixture-boardTools">
                                        {pgettext(
                                            "Kibitz header design fixture current board tools",
                                            "Back to live · 42 moves",
                                        )}
                                    </div>
                                </section>
                                {isBaseline ? null : (
                                    <>
                                        <div
                                            className="KibitzHeaderDesignFixture-divider"
                                            aria-hidden="true"
                                        />
                                        <section className="KibitzHeaderDesignFixture-boardPanel KibitzHeaderDesignFixture-boardPanel--variation">
                                            {renderBoard(
                                                pgettext(
                                                    "Kibitz header design fixture variation board aria label",
                                                    "Variation game board",
                                                ),
                                                true,
                                            )}
                                            <div className="KibitzHeaderDesignFixture-boardTools">
                                                {pgettext(
                                                    "Kibitz header design fixture variation board tools",
                                                    "Variation controls · move tree",
                                                )}
                                            </div>
                                        </section>
                                    </>
                                )}
                            </div>
                        </section>
                        <aside className="KibitzHeaderDesignFixture-stream">
                            <div className="KibitzHeaderDesignFixture-streamHeader">
                                {pgettext(
                                    "Kibitz header design fixture stream label",
                                    "ROOM STREAM",
                                )}
                            </div>
                            <div className="KibitzHeaderDesignFixture-streamItem">
                                <strong>SoraKite</strong>{" "}
                                {pgettext(
                                    "Kibitz header design fixture stream variation action",
                                    "shared",
                                )}{" "}
                                “{variation.title}”
                            </div>
                            <div className="KibitzHeaderDesignFixture-streamItem">
                                <strong>MilaZen</strong>{" "}
                                {pgettext(
                                    "Kibitz header design fixture stream comment",
                                    "This joseki is worth a closer look.",
                                )}
                            </div>
                            <div className="KibitzHeaderDesignFixture-streamItem">
                                <strong>riverstone</strong>{" "}
                                {pgettext(
                                    "Kibitz header design fixture stream comment",
                                    "The live board is still moving.",
                                )}
                            </div>
                        </aside>
                    </div>
                </main>
            </div>
        </div>
    );
}
