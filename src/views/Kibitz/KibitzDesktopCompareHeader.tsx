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
import { KibitzDesktopSourceGameScoreboard } from "./KibitzDesktopSourceGameScoreboard";
import "./KibitzDesktopCompareHeader.css";

interface KibitzDesktopCompareHeaderProps {
    room: KibitzRoomSummary;
    mainGame: KibitzWatchedGame | undefined;
    mainBoardController: GobanController | null;
    selectedVariation: KibitzVariationSummary | undefined;
    selectedVariationSourceGame: KibitzWatchedGame | undefined;
    onOpenRoomSettings: React.MouseEventHandler<HTMLButtonElement>;
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

function renderVariationSource(
    mainGame: KibitzWatchedGame | undefined,
    variation: KibitzVariationSummary | undefined,
    sourceGame: KibitzWatchedGame | undefined,
): React.ReactElement {
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

    if (isCurrentGame) {
        return (
            <div className="KibitzDesktopCompareHeader-sourceContext">
                {sourceHref ? (
                    <a
                        className="KibitzDesktopCompareHeader-sourceLabel"
                        href={sourceHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={sourceLinkLabel}
                    >
                        {pgettext("Kibitz variation source label", "FROM CURRENT GAME")}
                    </a>
                ) : (
                    <span className="KibitzDesktopCompareHeader-sourceLabel">
                        {pgettext("Kibitz variation source label", "FROM CURRENT GAME")}
                    </span>
                )}
                {typeof variation.analysis_from === "number" ? (
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
                ) : null}
            </div>
        );
    }

    if (!sourceGame) {
        return (
            <div className="KibitzDesktopCompareHeader-sourceContext">
                <span className="KibitzDesktopCompareHeader-sourceLabel">{sourceLabel}</span>
                <span className="KibitzDesktopCompareHeader-sourceDetail">
                    {interpolate(
                        pgettext("Kibitz variation source fallback label", "game #{{gameId}}"),
                        { gameId: variation.game_id },
                    )}
                </span>
            </div>
        );
    }

    return (
        <>
            <KibitzDesktopSourceGameScoreboard game={sourceGame} />
            <div className="KibitzDesktopCompareHeader-sourceContext">
                <span className="KibitzDesktopCompareHeader-sourceLabel">
                    {pgettext("Kibitz variation source label", "PREVIOUS GAME")}
                </span>
                <a
                    className="KibitzDesktopCompareHeader-sourceTitle"
                    href={sourceHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={sourceLinkLabel}
                >
                    {sourceGame.title}
                </a>
            </div>
        </>
    );
}

export function KibitzDesktopCompareHeader({
    room,
    mainGame,
    mainBoardController,
    selectedVariation,
    selectedVariationSourceGame,
    onOpenRoomSettings,
    roomTitleRef,
    roomSettingsRef,
}: KibitzDesktopCompareHeaderProps): React.ReactElement {
    const isLive = mainGame?.live === true;

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
                <KibitzDesktopMainGameScoreboard
                    controller={mainBoardController}
                    game={mainGame}
                    compact
                />
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
