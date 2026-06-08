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
import { Flag } from "@/components/Flag/Flag";
import { PlayerDetails } from "@/components/Player/PlayerDetails";
import { generateGobanHook } from "@/components/GobanView/hooks";
import { GobanController } from "@/lib/GobanController";
import { interpolate, ngettext, pgettext } from "@/lib/translate";
import type { KibitzRoomUser, KibitzWatchedGame } from "@/models/kibitz";
import type { Goban, JGOFClockWithTransmitting, JGOFPlayerClock } from "goban";
import { KibitzUserAvatar } from "./KibitzUserAvatar";
import { popover } from "@/lib/popover";
import "./KibitzMobileMainGameScoreboard.css";

interface KibitzMobileMainGameScoreboardProps {
    controller: GobanController | null;
    game: KibitzWatchedGame | undefined;
    isMainBoardVisible: boolean;
}

interface GameScore {
    black: { prisoners: number };
    white: { prisoners: number };
}

interface ScoreboardState {
    phase: string | null;
    outcome: string | null;
    winner: number | "black" | "white" | undefined;
    pausedSince: number | null;
    clock: JGOFClockWithTransmitting | null;
}

type KibitzGoban = Goban & {
    paused_since?: number;
    last_emitted_clock?: JGOFClockWithTransmitting | null;
};

const useGameScore = generateGobanHook<GameScore | null, KibitzGoban | null>(
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

const useScoreboardState = generateGobanHook<ScoreboardState, KibitzGoban | null>(
    (goban) => ({
        phase: goban?.engine.phase ?? null,
        outcome: goban?.engine.outcome ?? null,
        winner: goban?.engine.winner,
        pausedSince: goban?.paused_since ?? null,
        clock: goban?.last_emitted_clock ?? null,
    }),
    ["phase", "outcome", "winner", "paused", "clock"],
);

const usePlayerToMove = generateGobanHook<number, KibitzGoban | null>(
    (goban) => goban?.engine.playerToMove() ?? 0,
    ["cur_move", "last_official_move"],
);

function getRankText(user: KibitzRoomUser): string {
    const ranking = Math.round(user.ranking || 0);

    if (user.professional) {
        return `${ranking}p`;
    }

    if (ranking > 0) {
        return `${ranking}k`;
    }

    return "?";
}

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

function getWinnerColor(
    game: KibitzWatchedGame,
    winner: ScoreboardState["winner"],
): "black" | "white" | null {
    if (winner === "black" || winner === "white") {
        return winner;
    }

    if (winner === game.black.id) {
        return "black";
    }

    if (winner === game.white.id) {
        return "white";
    }

    return null;
}

function getCompactResultToken(game: KibitzWatchedGame, state: ScoreboardState): string | null {
    const winnerColor = getWinnerColor(game, state.winner);

    if (!winnerColor) {
        return null;
    }

    const outcome = state.outcome ?? "";
    const prefix = winnerColor === "black" ? "B" : "W";

    if (/[0-9.]+/.test(outcome)) {
        const match = outcome.match(/([0-9.]+)/);
        return `${prefix}+${match ? match[1] : outcome}`;
    }

    if (outcome === "Resignation" || outcome === "resign" || outcome === "r") {
        return `${prefix}+R`;
    }

    return null;
}

function getStateToken(
    game: KibitzWatchedGame,
    state: ScoreboardState,
): {
    text: string;
    className: string;
    ariaLabel: string;
} | null {
    if (state.phase === "stone removal") {
        return {
            text: pgettext("Kibitz mobile scoreboard state token", "Score"),
            className: "is-state",
            ariaLabel: pgettext("Kibitz mobile scoreboard state token", "Score"),
        };
    }

    if (state.phase === "finished") {
        const token = getCompactResultToken(game, state);
        if (token) {
            return {
                text: token,
                className: "is-state",
                ariaLabel: token,
            };
        }

        return {
            text: pgettext("Kibitz mobile scoreboard state token", "Done"),
            className: "is-state",
            ariaLabel: pgettext("Kibitz mobile scoreboard state token", "Game finished"),
        };
    }

    if (state.phase === "play" && state.pausedSince) {
        return {
            text: pgettext("Kibitz mobile scoreboard state token", "Pause"),
            className: "is-state",
            ariaLabel: pgettext("Kibitz mobile scoreboard state token", "Game paused"),
        };
    }

    return null;
}

function prettyClockTime(ms: number): string {
    if (ms <= 0 || Number.isNaN(ms)) {
        return "0:00";
    }

    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
}

function renderClockLabel(
    clock: JGOFClockWithTransmitting | null,
    color: "black" | "white",
): string | null {
    if (!clock) {
        return null;
    }

    const timeControl = clock;
    const playerClock: JGOFPlayerClock =
        color === "black" ? timeControl.black_clock : timeControl.white_clock;
    const colorLabel =
        color === "black" ? pgettext("Game color", "Black") : pgettext("Game color", "White");

    if (timeControl.start_mode && timeControl.current_player === color) {
        return interpolate(
            pgettext(
                "Kibitz mobile scoreboard clock aria label",
                "{{color}} time remaining {{time}}",
            ),
            {
                color: colorLabel,
                time: prettyClockTime(timeControl.start_time_left || 0),
            },
        );
    }

    if (playerClock.main_time > 0) {
        return interpolate(
            pgettext(
                "Kibitz mobile scoreboard clock aria label",
                "{{color}} time remaining {{time}}",
            ),
            {
                color: colorLabel,
                time: prettyClockTime(playerClock.main_time),
            },
        );
    }

    if ((playerClock.period_time_left || playerClock.block_time_left || 0) > 0) {
        return interpolate(
            pgettext(
                "Kibitz mobile scoreboard clock aria label",
                "{{color}} time remaining {{time}}",
            ),
            {
                color: colorLabel,
                time: prettyClockTime(
                    playerClock.period_time_left || playerClock.block_time_left || 0,
                ),
            },
        );
    }

    return interpolate(
        pgettext("Kibitz mobile scoreboard clock aria label", "{{color}} time remaining"),
        {
            color: colorLabel,
        },
    );
}

function renderClock(
    controller: GobanController | null,
    state: ScoreboardState,
    color: "black" | "white",
): React.ReactElement | null {
    const goban = controller?.goban;

    if (!goban?.engine?.time_control) {
        return null;
    }

    const ariaLabel = renderClockLabel(state.clock, color);

    return (
        <span className="KibitzMobileMainGameScoreboard-clock" aria-label={ariaLabel || undefined}>
            <span aria-hidden="true">
                <Clock goban={goban} color={color} compact lineSummary={true} />
            </span>
        </span>
    );
}

function renderCaptures(
    value: number | undefined | null,
    color: "black" | "white",
): React.ReactElement | null {
    if (value == null) {
        return null;
    }

    return (
        <span
            className="KibitzMobileMainGameScoreboard-captures"
            aria-label={interpolate(
                pgettext(
                    "Kibitz mobile scoreboard capture aria label",
                    "{{color}} has captured {{count}} {{stoneCount}}",
                ),
                {
                    color:
                        color === "black"
                            ? pgettext("Game color", "Black")
                            : pgettext("Game color", "White"),
                    count: value,
                    stoneCount: ngettext("stone", "stones", value),
                },
            )}
        >
            <span className="KibitzMobileMainGameScoreboard-captureDot" aria-hidden="true">
                ·
            </span>
            <span className="KibitzMobileMainGameScoreboard-captureCount">{value}</span>
        </span>
    );
}

function renderAvatar(user: KibitzRoomUser): React.ReactElement {
    return (
        <button
            type="button"
            className="KibitzMobileMainGameScoreboard-avatarButton"
            onClick={(event) => openPlayerPopover(event, user)}
            aria-label={user.username}
            title={user.username}
        >
            <KibitzUserAvatar
                user={user}
                size={32}
                className="KibitzMobileMainGameScoreboard-avatar"
                iconClassName="KibitzMobileMainGameScoreboard-avatarImage"
            />
        </button>
    );
}

function renderRow(
    user: KibitzRoomUser,
    color: "black" | "white",
    active: boolean,
    captures: number | undefined | null,
    controller: GobanController | null,
    state: ScoreboardState,
): React.ReactElement {
    const rowClassName =
        "KibitzMobileMainGameScoreboard-row KibitzMobileMainGameScoreboard-row--" +
        color +
        (active ? " is-active" : "");

    return (
        <div
            className={rowClassName}
            aria-label={
                color === "black"
                    ? pgettext("Kibitz mobile scoreboard row aria label", "Black player")
                    : pgettext("Kibitz mobile scoreboard row aria label", "White player")
            }
        >
            <span className="KibitzMobileMainGameScoreboard-avatarSlot">{renderAvatar(user)}</span>
            {user.country ? (
                <span className="KibitzMobileMainGameScoreboard-flag" aria-hidden="true">
                    <Flag country={user.country} />
                </span>
            ) : null}
            <span className="KibitzMobileMainGameScoreboard-player">
                <span className="KibitzMobileMainGameScoreboard-playerName">{user.username}</span>
                <span className="KibitzMobileMainGameScoreboard-playerRank">
                    [{getRankText(user)}]
                </span>
            </span>
            {renderClock(controller, state, color)}
            {renderCaptures(captures, color)}
        </div>
    );
}

export function KibitzMobileMainGameScoreboard({
    controller,
    game,
    isMainBoardVisible,
}: KibitzMobileMainGameScoreboardProps): React.ReactElement | null {
    const goban = controller?.goban ?? null;
    const score = useGameScore(goban);
    const state = useScoreboardState(goban);
    const playerToMove = usePlayerToMove(goban);

    if (!game || !isMainBoardVisible) {
        return null;
    }

    const blackCaptures = controller ? score?.black?.prisoners : null;
    const whiteCaptures = controller ? score?.white?.prisoners : null;
    const blackActive = controller
        ? state.phase !== "finished" && playerToMove === game.black.id
        : false;
    const whiteActive = controller
        ? state.phase !== "finished" && playerToMove === game.white.id
        : false;
    const stateToken = controller ? getStateToken(game, state) : null;

    return (
        <div className="KibitzMobileMainGameScoreboard">
            <div className="KibitzMobileMainGameScoreboard-inner">
                {stateToken ? (
                    <span
                        className={"KibitzMobileMainGameScoreboard-state " + stateToken.className}
                        aria-label={stateToken.ariaLabel}
                    >
                        {stateToken.text}
                    </span>
                ) : null}
                {renderRow(game.black, "black", blackActive, blackCaptures, controller, state)}
                {renderRow(game.white, "white", whiteActive, whiteCaptures, controller, state)}
            </div>
        </div>
    );
}
