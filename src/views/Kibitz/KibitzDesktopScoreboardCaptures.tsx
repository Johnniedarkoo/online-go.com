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
import { generateGobanHook } from "@/components/GobanView/hooks";
import { interpolate, ngettext, pgettext } from "@/lib/translate";
import type { Goban } from "goban";

export interface KibitzDesktopGameScore {
    black: { prisoners: number };
    white: { prisoners: number };
}

type KibitzScoreGoban = Goban & {
    mode: string;
};

export const useKibitzDesktopGameScore = generateGobanHook<
    KibitzDesktopGameScore | null,
    KibitzScoreGoban | null
>(
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

interface KibitzDesktopScoreboardCaptureProps {
    value: number | undefined | null;
    color: "black" | "white";
}

export function KibitzDesktopScoreboardCapture({
    value,
    color,
}: KibitzDesktopScoreboardCaptureProps): React.ReactElement | null {
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
