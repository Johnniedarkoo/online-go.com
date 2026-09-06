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
import { PlayerDetails } from "@/components/Player/PlayerDetails";
import { shortShortTimeControl } from "@/components/TimeControl/util";
import { generateGobanHook } from "@/components/GobanView/hooks";
import { GobanController } from "@/lib/GobanController";
import { popover } from "@/lib/popover";
import { interpolate, pgettext } from "@/lib/translate";
import type { KibitzRoomUser, KibitzWatchedGame } from "@/models/kibitz";
import type { Goban, JGOFClockWithTransmitting, JGOFPlayerClock, JGOFTimeControl } from "goban";
import { KibitzDesktopScoreboardCard } from "./KibitzDesktopScoreboardCard";
import {
    KibitzDesktopScoreboardCapture,
    useKibitzDesktopGameScore,
} from "./KibitzDesktopScoreboardCaptures";
import { KibitzUserAvatar } from "./KibitzUserAvatar";

interface KibitzDesktopMainGameScoreboardProps {
    controller: GobanController | null;
    game: KibitzWatchedGame | undefined;
    compact?: boolean;
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

function renderAvatarButton(user: KibitzRoomUser): React.ReactElement {
    return (
        <button
            type="button"
            className="KibitzDesktopMainGameScoreboard-avatarButton"
            onClick={(event) => openPlayerPopover(event, user)}
            aria-label={user.username}
            title={user.username}
        >
            <KibitzUserAvatar
                user={user}
                size={32}
                className="KibitzDesktopMainGameScoreboard-avatar"
                iconClassName="KibitzDesktopMainGameScoreboard-avatarImage"
            />
        </button>
    );
}

export function KibitzDesktopMainGameScoreboard({
    controller,
    game,
    compact = false,
}: KibitzDesktopMainGameScoreboardProps): React.ReactElement | null {
    const goban = controller?.goban ?? null;
    const score = useKibitzDesktopGameScore(goban);
    const state = useScoreboardState(goban);
    const playerToMove = usePlayerToMove(goban);

    if (!game) {
        return null;
    }

    const blackCaptures = score?.black?.prisoners;
    const whiteCaptures = score?.white?.prisoners;
    const blackActive = state.phase !== "finished" && playerToMove === game.black.id;
    const whiteActive = state.phase !== "finished" && playerToMove === game.white.id;

    return (
        <KibitzDesktopScoreboardCard
            blackUser={game.black}
            whiteUser={game.white}
            ariaLabel={pgettext("Kibitz desktop scoreboard aria label", "Current game players")}
            compact={compact}
            blackActive={blackActive}
            whiteActive={whiteActive}
            renderAvatar={(user) => renderAvatarButton(user)}
            renderRowEnd={(_user, side) => (
                <>
                    <KibitzDesktopScoreboardCapture
                        value={side === "black" ? blackCaptures : whiteCaptures}
                        color={side}
                    />
                    {renderClock(controller, state, side)}
                </>
            )}
        />
    );
}
