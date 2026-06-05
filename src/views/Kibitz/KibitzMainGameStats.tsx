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
import { Clock } from "@/components/Clock/Clock";
import { Player } from "@/components/Player";
import { PlayerDetails } from "@/components/Player/PlayerDetails";
import { generateGobanHook } from "@/components/GobanView/hooks";
import { GobanController } from "@/lib/GobanController";
import { popover } from "@/lib/popover";
import { pgettext } from "@/lib/translate";
import type { KibitzRoomUser, KibitzWatchedGame } from "@/models/kibitz";
import { KibitzUserAvatar } from "./KibitzUserAvatar";
import type { Goban } from "goban";
import "./KibitzMainGameStats.css";

interface KibitzMainGameStatsProps {
    controller: GobanController | null;
    game: KibitzWatchedGame | undefined;
    variant: "desktop" | "mobile";
}

interface GameScore {
    black: { prisoners: number };
    white: { prisoners: number };
}

const useGameScore = generateGobanHook<GameScore | null, Goban | null>(
    (goban) => {
        if (!goban) {
            return null;
        }

        const engine = goban.engine;
        if (
            (engine.phase === "stone removal" || engine.phase === "finished") &&
            engine.outcome !== "Timeout" &&
            engine.outcome !== "Disconnection" &&
            engine.outcome !== "Resignation" &&
            engine.outcome !== "Abandonment" &&
            engine.outcome !== "Cancellation" &&
            goban.mode === "play"
        ) {
            return engine.computeScore(false);
        }

        return engine.computeScore(true);
    },
    ["phase", "mode", "outcome", "stone-removal.accepted", "stone-removal.updated", "cur_move"],
);

const usePlayerToMove = generateGobanHook<number, Goban | null>(
    (goban) => goban?.engine.playerToMove() ?? 0,
    ["cur_move", "last_official_move"],
);

const useGameState = generateGobanHook<
    { phase: string | null; outcome: string | null },
    Goban | null
>(
    (goban) => ({
        phase: goban?.engine.phase ?? null,
        outcome: goban?.engine.outcome ?? null,
    }),
    ["phase", "outcome"],
);

function openPlayerPopover(event: React.MouseEvent<HTMLButtonElement>, user: KibitzRoomUser): void {
    event.preventDefault();
    event.stopPropagation();

    popover({
        elt: <PlayerDetails playerId={user.id} />,
        below: event.currentTarget,
        minWidth: 240,
        minHeight: 250,
    });
}

function renderDesktopIdentity(user: KibitzRoomUser) {
    return (
        <div className="player-badge KibitzMainGameStats-playerBadge">
            <KibitzUserAvatar
                user={user}
                size={16}
                className="stage-avatar"
                iconClassName="stage-avatar-image"
            />
            <Player user={user} flag rank noextracontrols />
        </div>
    );
}

function renderMobileIdentity(user: KibitzRoomUser) {
    return (
        <button
            type="button"
            className="mobile-room-header-matchup-avatar-button"
            onClick={(event) => openPlayerPopover(event, user)}
            aria-label={user.username}
        >
            <KibitzUserAvatar
                user={user}
                size={64}
                className="mobile-room-header-matchup-avatar"
                iconClassName="mobile-room-header-matchup-avatar-image"
            />
        </button>
    );
}

function renderClock(
    controller: GobanController | null,
    color: "black" | "white",
): React.ReactElement | null {
    const goban = controller?.goban;

    if (!goban?.engine?.time_control) {
        return null;
    }

    return (
        <Clock
            goban={goban}
            color={color}
            compact
            lineSummary={true}
            className="KibitzMainGameStats-clock"
        />
    );
}

function renderCaptures(value: number | undefined | null): React.ReactElement | null {
    if (value == null) {
        return null;
    }

    return (
        <span
            className="KibitzMainGameStats-captures"
            aria-label={pgettext("Kibitz main game capture count", "Captured stones")}
        >
            {value}
        </span>
    );
}

function renderStateLabel(phase: string | null, outcome: string | null): React.ReactElement | null {
    if (phase === "stone removal") {
        return (
            <span className="KibitzMainGameStats-state">
                {pgettext("Kibitz main game state", "Stone removal")}
            </span>
        );
    }

    if (phase === "finished" || Boolean(outcome)) {
        return (
            <span className="KibitzMainGameStats-state">
                {pgettext("Kibitz main game state", "Game finished")}
            </span>
        );
    }

    return null;
}

function renderMobilePlayerLine(
    user: KibitzRoomUser,
    stoneColor: "black" | "white",
    captures: number | undefined | null,
    clock: React.ReactElement | null,
    isTheirTurn: boolean,
): React.ReactElement {
    return (
        <span
            className={
                "mobile-room-header-player mobile-room-header-player-" +
                stoneColor +
                (isTheirTurn ? " their-turn" : "")
            }
        >
            {stoneColor === "black" ? (
                <span
                    className={`mobile-room-header-player-stone mobile-room-header-player-stone-${stoneColor}`}
                    aria-hidden="true"
                />
            ) : null}
            <Player user={user} flag rank noextracontrols />
            {renderCaptures(captures)}
            {clock}
            {stoneColor === "white" ? (
                <span
                    className={`mobile-room-header-player-stone mobile-room-header-player-stone-${stoneColor}`}
                    aria-hidden="true"
                />
            ) : null}
        </span>
    );
}

export function KibitzMainGameStats({
    controller,
    game,
    variant,
}: KibitzMainGameStatsProps): React.ReactElement | null {
    const goban = controller?.goban ?? null;
    const score = useGameScore(goban);
    const playerToMove = usePlayerToMove(goban);
    const gameState = useGameState(goban);

    if (!game) {
        return null;
    }

    const black = game.black;
    const white = game.white;
    const blackTheirTurn = playerToMove === black.id;
    const whiteTheirTurn = playerToMove === white.id;
    const blackCaptures = score?.black?.prisoners;
    const whiteCaptures = score?.white?.prisoners;

    if (variant === "mobile") {
        return (
            <div className="mobile-room-header-matchup KibitzMainGameStats KibitzMainGameStats-mobile">
                <span className="mobile-room-header-matchup-avatar mobile-room-header-matchup-avatar-black">
                    {renderMobileIdentity(black)}
                </span>
                <span className="mobile-room-header-matchup-content">
                    <span className="mobile-room-header-matchup-first">
                        {renderMobilePlayerLine(
                            black,
                            "black",
                            blackCaptures,
                            renderClock(controller, "black"),
                            blackTheirTurn,
                        )}
                    </span>
                    <span className="mobile-room-header-matchup-second">
                        <span className="mobile-room-header-matchup-second-name">
                            {renderMobilePlayerLine(
                                white,
                                "white",
                                whiteCaptures,
                                renderClock(controller, "white"),
                                whiteTheirTurn,
                            )}
                        </span>
                    </span>
                </span>
                <span className="mobile-room-header-matchup-avatar mobile-room-header-matchup-avatar-white">
                    {renderMobileIdentity(white)}
                </span>
            </div>
        );
    }

    return (
        <div className="players player-pair KibitzMainGameStats KibitzMainGameStats-desktop">
            <span
                className={
                    "KibitzMainGameStats-side KibitzMainGameStats-side-black" +
                    (blackTheirTurn ? " their-turn" : "")
                }
            >
                {renderClock(controller, "black")}
                {renderCaptures(blackCaptures)}
                {renderDesktopIdentity(black)}
            </span>
            <span className="player-vs">
                {pgettext("Versus label shown between players in kibitz", "vs")}
            </span>
            <span
                className={
                    "KibitzMainGameStats-side KibitzMainGameStats-side-white" +
                    (whiteTheirTurn ? " their-turn" : "")
                }
            >
                {renderDesktopIdentity(white)}
                {renderCaptures(whiteCaptures)}
                {renderClock(controller, "white")}
            </span>
            {renderStateLabel(gameState.phase, gameState.outcome)}
        </div>
    );
}
