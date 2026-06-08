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
import { shortShortTimeControl } from "@/components/TimeControl/util";
import { generateGobanHook } from "@/components/GobanView/hooks";
import { GobanController } from "@/lib/GobanController";
import { interpolate, ngettext, pgettext } from "@/lib/translate";
import type { KibitzRoomUser, KibitzWatchedGame } from "@/models/kibitz";
import type { Goban, JGOFClockWithTransmitting, JGOFPlayerClock, JGOFTimeControl } from "goban";
import { KibitzScoreboardPlayerDisplay } from "./kibitzScoreboardPlayerDisplay";
import "./KibitzDesktopMainGameScoreboard.css";

interface KibitzDesktopMainGameScoreboardProps {
    controller: GobanController | null;
    game: KibitzWatchedGame | undefined;
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

interface KibitzEngineMetadata {
    handicap?: number | null;
}

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
} {
    if (state.phase === "stone removal") {
        return {
            text: pgettext("Kibitz desktop scoreboard center token", "Score"),
            className: "is-state",
            ariaLabel: pgettext("Kibitz desktop scoreboard center token", "Score"),
        };
    }

    if (state.phase === "finished") {
        const token = getCompactResultToken(game, state);
        if (token) {
            const winnerColor = getWinnerColor(game, state.winner);
            const colorLabel =
                winnerColor === "black"
                    ? pgettext("Game winner color", "Black")
                    : pgettext("Game winner color", "White");
            const outcomeLabel =
                state.outcome === "Resignation" ||
                state.outcome === "resign" ||
                state.outcome === "r"
                    ? pgettext("Game outcome", "Resignation")
                    : token.slice(2);

            return {
                text: token,
                className: "is-state",
                ariaLabel: interpolate(
                    pgettext(
                        "Kibitz desktop scoreboard result aria label",
                        "{{color}} wins by {{outcome}}",
                    ),
                    {
                        color: colorLabel,
                        outcome:
                            outcomeLabel === token.slice(2)
                                ? `${token.slice(2)} ${pgettext("Kibitz desktop scoreboard result suffix", "points")}`
                                : outcomeLabel,
                    },
                ),
            };
        }

        return {
            text: pgettext("Kibitz desktop scoreboard center token", "Done"),
            className: "is-state",
            ariaLabel: pgettext("Kibitz desktop scoreboard center token", "Game finished"),
        };
    }

    if (state.phase === "play" && state.pausedSince) {
        return {
            text: pgettext("Kibitz desktop scoreboard center token", "Pause"),
            className: "is-state",
            ariaLabel: pgettext("Kibitz desktop scoreboard center token", "Game paused"),
        };
    }

    return {
        text: pgettext("Kibitz desktop scoreboard center token", "VS"),
        className: "",
        ariaLabel: pgettext("Kibitz desktop scoreboard center token", "Versus"),
    };
}

function formatHandicap(handicap: number | null | undefined): string {
    if (handicap == null || !Number.isFinite(handicap) || handicap < 0) {
        return "?";
    }

    return `H${Math.round(handicap)}`;
}

export function getDesktopMainGameMetadataRowText(
    timeControl: JGOFTimeControl | null | undefined,
    config: KibitzEngineMetadata | null | undefined,
): { handicapText: string; timeText: string } {
    const timeText =
        shortShortTimeControl(timeControl) ||
        pgettext("Kibitz desktop scoreboard metadata row value", "None");

    return {
        timeText: interpolate(pgettext("Kibitz desktop scoreboard metadata row", "Time {{time}}"), {
            time: timeText,
        }),
        handicapText: interpolate(
            pgettext("Kibitz desktop scoreboard metadata row", "Handicap {{handicap}}"),
            {
                handicap: formatHandicap(config?.handicap),
            },
        ),
    };
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
                "Kibitz desktop scoreboard clock aria label",
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
                "Kibitz desktop scoreboard clock aria label",
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
                "Kibitz desktop scoreboard clock aria label",
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
        pgettext("Kibitz desktop scoreboard clock aria label", "{{color}} time remaining"),
        {
            color: colorLabel,
        },
    );
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
        <span className="KibitzDesktopMainGameScoreboard-clock" aria-label={ariaLabel || undefined}>
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
            className="KibitzDesktopMainGameScoreboard-captures"
            aria-label={interpolate(
                pgettext(
                    "Kibitz desktop scoreboard capture aria label",
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
            <span className="KibitzDesktopMainGameScoreboard-captureIcon" aria-hidden="true">
                ●
            </span>
            <span className="KibitzDesktopMainGameScoreboard-captureCount">{value}</span>
        </span>
    );
}

function renderPlayerLane(user: KibitzRoomUser, side: "black" | "white"): React.ReactElement {
    return (
        <span className="KibitzDesktopMainGameScoreboard-player">
            <KibitzScoreboardPlayerDisplay user={user} side={side} />
        </span>
    );
}

function getSideAriaLabel(side: "black" | "white"): string {
    return side === "black"
        ? pgettext("Kibitz desktop scoreboard side aria label", "Black player")
        : pgettext("Kibitz desktop scoreboard side aria label", "White player");
}

export function KibitzDesktopMainGameScoreboard({
    controller,
    game,
}: KibitzDesktopMainGameScoreboardProps): React.ReactElement | null {
    const goban = controller?.goban ?? null;
    const score = useGameScore(goban);
    const state = useScoreboardState(goban);
    const playerToMove = usePlayerToMove(goban);

    if (!game) {
        return null;
    }

    const blackCaptures = score?.black?.prisoners;
    const whiteCaptures = score?.white?.prisoners;
    const blackActive = state.phase !== "finished" && playerToMove === game.black.id;
    const whiteActive = state.phase !== "finished" && playerToMove === game.white.id;
    const centerToken = getStateToken(game, state);

    return (
        <div className="KibitzDesktopMainGameScoreboard">
            <div className="KibitzDesktopMainGameScoreboard-inner">
                <div
                    className={
                        "KibitzDesktopMainGameScoreboard-side KibitzDesktopMainGameScoreboard-side--black" +
                        (blackActive ? " is-active" : "")
                    }
                    role={blackActive ? "group" : undefined}
                    aria-label={getSideAriaLabel("black")}
                >
                    {blackActive ? (
                        <span
                            className="KibitzDesktopMainGameScoreboard-activeBackdrop"
                            aria-hidden="true"
                        />
                    ) : null}
                    {renderClock(controller, state, "black")}
                    {renderCaptures(blackCaptures, "black")}
                    {renderPlayerLane(game.black, "black")}
                </div>

                <div
                    className={"KibitzDesktopMainGameScoreboard-center " + centerToken.className}
                    aria-label={centerToken.ariaLabel}
                >
                    {centerToken.text}
                </div>

                <div
                    className={
                        "KibitzDesktopMainGameScoreboard-side KibitzDesktopMainGameScoreboard-side--white" +
                        (whiteActive ? " is-active" : "")
                    }
                    role={whiteActive ? "group" : undefined}
                    aria-label={getSideAriaLabel("white")}
                >
                    {whiteActive ? (
                        <span
                            className="KibitzDesktopMainGameScoreboard-activeBackdrop"
                            aria-hidden="true"
                        />
                    ) : null}
                    {renderPlayerLane(game.white, "white")}
                    {renderCaptures(whiteCaptures, "white")}
                    {renderClock(controller, state, "white")}
                </div>
            </div>
        </div>
    );
}
