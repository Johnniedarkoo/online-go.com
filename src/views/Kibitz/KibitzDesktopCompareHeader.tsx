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
    secondaryBoardController: GobanController | null;
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

function renderCurrentGameContext(
    room: KibitzRoomSummary,
    mainGame: KibitzWatchedGame | undefined,
    isLive: boolean,
    onOpenRoomSettings: React.MouseEventHandler<HTMLButtonElement>,
    roomTitleRef: React.RefCallback<HTMLDivElement> | undefined,
    roomSettingsRef: React.RefCallback<HTMLButtonElement> | undefined,
): React.ReactElement {
    return (
        <div className="KibitzDesktopCompareHeader-context KibitzDesktopCompareHeader-currentContext">
            <div className="KibitzDesktopCompareHeader-contextStart">
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
            </div>
            <div className="KibitzDesktopCompareHeader-contextEnd">
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
                            : pgettext("Kibitz current game status badge", "CURRENT")}
                    </span>
                </div>
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
                    <span className="KibitzDesktopCompareHeader-mainGameLink">
                        {pgettext(
                            "Placeholder for a missing Kibitz current game",
                            "No current game",
                        )}
                    </span>
                )}
            </div>
        </div>
    );
}

function renderVariationContext(
    mainGame: KibitzWatchedGame | undefined,
    variation: KibitzVariationSummary | undefined,
    sourceGame: KibitzWatchedGame,
): React.ReactElement {
    const isCurrentGame = mainGame?.game_id === variation?.game_id;
    const sourceHref = `/game/${sourceGame.game_id}`;

    return (
        <div
            className="KibitzDesktopCompareHeader-context KibitzDesktopCompareHeader-variationContext"
            title={getVariationTitle(variation)}
        >
            <span className="KibitzDesktopCompareHeader-variationName">
                {getVariationTitle(variation)}
            </span>
            <span className="KibitzDesktopCompareHeader-contextSeparator" aria-hidden="true">
                ·
            </span>
            {isCurrentGame ? (
                <a
                    className="KibitzDesktopCompareHeader-sourceLabel"
                    href={sourceHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={pgettext(
                        "Aria label for opening the current Kibitz variation source game",
                        "Open current game",
                    )}
                >
                    {pgettext("Kibitz variation source label", "CURRENT")}
                </a>
            ) : (
                <span className="KibitzDesktopCompareHeader-sourceLabel">
                    {pgettext("Kibitz variation source label", "PREVIOUS")}
                </span>
            )}
            {isCurrentGame ? (
                typeof variation?.analysis_from === "number" ? (
                    <span className="KibitzDesktopCompareHeader-sourceDetail">
                        <span aria-hidden="true">·</span>
                        {interpolate(
                            pgettext("Kibitz variation source move label", "move {{move}}"),
                            { move: variation.analysis_from },
                        )}
                    </span>
                ) : null
            ) : (
                <a
                    className="KibitzDesktopCompareHeader-sourceTitle"
                    href={sourceHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={pgettext(
                        "Aria label for opening the previous Kibitz variation source game",
                        "Open previous game",
                    )}
                >
                    <span aria-hidden="true">·</span> {sourceGame.title}
                </a>
            )}
        </div>
    );
}

function renderVariationSource(
    mainGame: KibitzWatchedGame | undefined,
    secondaryBoardController: GobanController | null,
    variation: KibitzVariationSummary | undefined,
    sourceGame: KibitzWatchedGame | undefined,
): React.ReactElement {
    const resolvedSourceGame =
        sourceGame ?? (mainGame?.game_id === variation?.game_id ? mainGame : undefined);

    if (!resolvedSourceGame) {
        return (
            <div className="KibitzDesktopCompareHeader-sourcePlaceholder">
                {pgettext(
                    "Placeholder source line while a Kibitz variation is being created",
                    "Analysis in progress",
                )}
            </div>
        );
    }

    return (
        <KibitzDesktopSourceGameScoreboard
            game={resolvedSourceGame}
            secondaryBoardController={secondaryBoardController}
            context={renderVariationContext(mainGame, variation, resolvedSourceGame)}
        />
    );
}

export function KibitzDesktopCompareHeader({
    room,
    mainGame,
    mainBoardController,
    secondaryBoardController,
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
                <KibitzDesktopMainGameScoreboard
                    controller={mainBoardController}
                    game={mainGame}
                    context={renderCurrentGameContext(
                        room,
                        mainGame,
                        isLive,
                        onOpenRoomSettings,
                        roomTitleRef,
                        roomSettingsRef,
                    )}
                    compact
                />
            </section>
            <section
                className="KibitzDesktopCompareHeader-variation"
                aria-label={pgettext(
                    "Aria label for the Kibitz variation header context",
                    "Variation context",
                )}
            >
                {renderVariationSource(
                    mainGame,
                    secondaryBoardController,
                    selectedVariation,
                    selectedVariationSourceGame,
                )}
            </section>
        </div>
    );
}
