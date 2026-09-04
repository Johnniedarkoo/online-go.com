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
import type { GobanController } from "@/lib/GobanController";
import { interpolate, pgettext } from "@/lib/translate";
import type { KibitzRoomSummary, KibitzVariationSummary, KibitzWatchedGame } from "@/models/kibitz";
import { KibitzDesktopMainGameScoreboard } from "./KibitzDesktopMainGameScoreboard";
import "./KibitzDesktopCompareHeader.css";

interface KibitzDesktopCompareHeaderProps {
    room: KibitzRoomSummary;
    mainGame: KibitzWatchedGame | undefined;
    mainBoardController: GobanController | null;
    selectedVariation: KibitzVariationSummary | undefined;
    selectedVariationSourceGame: KibitzWatchedGame | undefined;
    onOpenRoomSettings: React.MouseEventHandler<HTMLButtonElement>;
    designClockLabels?: {
        black: string;
        white: string;
    };
    roomTitleRef?: React.RefCallback<HTMLDivElement>;
    roomSettingsRef?: React.RefCallback<HTMLButtonElement>;
}

function getVariationTitle(variation: KibitzVariationSummary | undefined): string {
    const title = variation?.title?.trim();

    return (
        title ||
        pgettext("Placeholder title for a Kibitz variation without a title", "Untitled variation")
    );
}

function renderSourcePlayers(sourceGame: KibitzWatchedGame): React.ReactElement {
    return (
        <>
            <span className="KibitzDesktopCompareHeader-sourcePlayer KibitzDesktopCompareHeader-sourcePlayer--black">
                {sourceGame.black.username}
            </span>
            <span className="KibitzDesktopCompareHeader-sourceVs">
                {pgettext("Kibitz variation source game player separator", "vs")}
            </span>
            <span className="KibitzDesktopCompareHeader-sourcePlayer KibitzDesktopCompareHeader-sourcePlayer--white">
                {sourceGame.white.username}
            </span>
        </>
    );
}

function renderVariationSource(
    mainGame: KibitzWatchedGame | undefined,
    variation: KibitzVariationSummary | undefined,
    sourceGame: KibitzWatchedGame | undefined,
): React.ReactElement | null {
    if (!variation) {
        return (
            <span className="KibitzDesktopCompareHeader-sourcePlaceholder">
                {pgettext(
                    "Placeholder source line while a Kibitz variation is being created",
                    "Analysis in progress",
                )}
            </span>
        );
    }

    const isCurrentGame = mainGame?.game_id === variation.game_id;
    const sourceLabel = isCurrentGame
        ? pgettext("Kibitz variation source label", "From current game")
        : pgettext("Kibitz variation source label", "Previous game");
    const sourceLinkLabel = isCurrentGame
        ? pgettext(
              "Aria label for opening the current Kibitz variation source game",
              "Open current game",
          )
        : pgettext(
              "Aria label for opening the previous Kibitz variation source game",
              "Open previous game",
          );
    const sourceHref = sourceGame ? `/game/${sourceGame.game_id}` : undefined;

    return (
        <div className="KibitzDesktopCompareHeader-sourceLine">
            {sourceHref ? (
                <a
                    className="KibitzDesktopCompareHeader-sourceLabel"
                    href={sourceHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={sourceLinkLabel}
                >
                    {sourceLabel}
                </a>
            ) : (
                <span className="KibitzDesktopCompareHeader-sourceLabel">{sourceLabel}</span>
            )}
            {isCurrentGame ? (
                typeof variation.analysis_from === "number" ? (
                    <span className="KibitzDesktopCompareHeader-sourceDetail">
                        <span
                            className="KibitzDesktopCompareHeader-sourceDivider"
                            aria-hidden="true"
                        >
                            ·
                        </span>
                        {interpolate(
                            pgettext("Kibitz variation source move label", "move {{move}}"),
                            { move: variation.analysis_from },
                        )}
                    </span>
                ) : null
            ) : sourceGame ? (
                <>
                    <span className="KibitzDesktopCompareHeader-sourceDivider" aria-hidden="true">
                        ·
                    </span>
                    <a
                        className="KibitzDesktopCompareHeader-sourceMatchup"
                        href={sourceHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={sourceLinkLabel}
                    >
                        {renderSourcePlayers(sourceGame)}
                    </a>
                    <span className="KibitzDesktopCompareHeader-sourceDivider" aria-hidden="true">
                        ·
                    </span>
                    <a
                        className="KibitzDesktopCompareHeader-sourceTitle"
                        href={sourceHref}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        {sourceGame.title}
                    </a>
                </>
            ) : (
                <span className="KibitzDesktopCompareHeader-sourceDetail">
                    {interpolate(
                        pgettext("Kibitz variation source fallback label", "game #{{gameId}}"),
                        { gameId: variation.game_id },
                    )}
                </span>
            )}
        </div>
    );
}

function renderDesignScoreboard(
    game: KibitzWatchedGame | undefined,
    clockLabels: { black: string; white: string },
): React.ReactElement | null {
    if (!game) {
        return null;
    }

    return (
        <div
            className="KibitzDesktopCompareHeader-designScoreboard"
            aria-label={pgettext(
                "Aria label for the Kibitz current game fixture scoreboard",
                "Current game players and clocks",
            )}
        >
            <div className="KibitzDesktopCompareHeader-designPlayerRow">
                <span className="KibitzDesktopCompareHeader-designPlayerName KibitzDesktopCompareHeader-designPlayerName--black">
                    {game.black.username}
                </span>
                <span className="KibitzDesktopCompareHeader-designClock">{clockLabels.black}</span>
            </div>
            <div className="KibitzDesktopCompareHeader-designPlayerRow">
                <span className="KibitzDesktopCompareHeader-designPlayerName KibitzDesktopCompareHeader-designPlayerName--white">
                    {game.white.username}
                </span>
                <span className="KibitzDesktopCompareHeader-designClock">{clockLabels.white}</span>
            </div>
        </div>
    );
}

export function KibitzDesktopCompareHeader({
    room,
    mainGame,
    mainBoardController,
    selectedVariation,
    selectedVariationSourceGame,
    onOpenRoomSettings,
    designClockLabels,
    roomTitleRef,
    roomSettingsRef,
}: KibitzDesktopCompareHeaderProps): React.ReactElement {
    const isLive = mainGame?.live !== false;

    return (
        <div className="KibitzDesktopCompareHeader">
            <section
                className="KibitzDesktopCompareHeader-main"
                aria-label={pgettext(
                    "Aria label for the current game header context",
                    "Current game context",
                )}
            >
                <div className="KibitzDesktopCompareHeader-topline">
                    <button
                        type="button"
                        className="KibitzDesktopCompareHeader-settingsButton"
                        onClick={onOpenRoomSettings}
                        ref={roomSettingsRef}
                        aria-label={pgettext(
                            "Aria label for opening room settings in Kibitz",
                            "Room settings",
                        )}
                    >
                        <i className="fa fa-gear" aria-hidden="true" />
                    </button>
                    <div className="KibitzDesktopCompareHeader-roomTitle" ref={roomTitleRef}>
                        {room.title}
                    </div>
                    <div className="KibitzDesktopCompareHeader-currentMarker">
                        <span
                            className={
                                "KibitzDesktopCompareHeader-currentDot" + (isLive ? " is-live" : "")
                            }
                            aria-hidden="true"
                        />
                        <span>
                            {isLive
                                ? pgettext("Kibitz current game status badge", "LIVE")
                                : pgettext("Kibitz current game status badge", "CURRENT GAME")}
                        </span>
                    </div>
                </div>
                {designClockLabels ? (
                    renderDesignScoreboard(mainGame, designClockLabels)
                ) : (
                    <KibitzDesktopMainGameScoreboard
                        controller={mainBoardController}
                        game={mainGame}
                    />
                )}
                <div className="KibitzDesktopCompareHeader-mainGameLinkRow">
                    {mainGame ? (
                        <a
                            className="KibitzDesktopCompareHeader-mainGameLink"
                            href={`/game/${mainGame.game_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={pgettext(
                                "Aria label for opening the current Kibitz game",
                                "Open current game",
                            )}
                        >
                            {mainGame.title}
                        </a>
                    ) : (
                        <span>
                            {pgettext(
                                "Placeholder for a missing Kibitz current game",
                                "No current game",
                            )}
                        </span>
                    )}
                </div>
            </section>
            <section
                className="KibitzDesktopCompareHeader-variation"
                aria-label={pgettext(
                    "Aria label for the Kibitz variation header context",
                    "Variation context",
                )}
            >
                <div className="KibitzDesktopCompareHeader-eyebrow">
                    {pgettext("Kibitz variation header eyebrow", "VARIATION BOARD")}
                </div>
                <div
                    className="KibitzDesktopCompareHeader-variationTitle"
                    title={getVariationTitle(selectedVariation)}
                >
                    <span className="KibitzDesktopCompareHeader-variationName">
                        {getVariationTitle(selectedVariation)}
                    </span>
                    {selectedVariation?.creator.username ? (
                        <span className="KibitzDesktopCompareHeader-variationAuthor">
                            {interpolate(
                                pgettext("Kibitz variation header author", "· by {{author}}"),
                                { author: selectedVariation.creator.username },
                            )}
                        </span>
                    ) : null}
                </div>
                {renderVariationSource(mainGame, selectedVariation, selectedVariationSourceGame)}
            </section>
        </div>
    );
}
