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
import { Flag } from "@/components/Flag/Flag";
import { pgettext } from "@/lib/translate";
import { getUserRating, PROVISIONAL_RATING_CUTOFF, rankString } from "@/lib/rank_utils";
import type { KibitzWatchedGame } from "@/models/kibitz";
import type { KibitzRoomUser } from "@/models/kibitz";
import { KibitzUserAvatar } from "./KibitzUserAvatar";
import "./KibitzDesktopSourceGameScoreboard.css";

interface KibitzDesktopSourceGameScoreboardProps {
    game: KibitzWatchedGame;
}

function getRankText(user: KibitzRoomUser): string {
    const rating = getUserRating(user, "overall", 0);

    if (user.professional) {
        return rankString(user);
    }

    if (rating.unset && ((user.ranking || 0) > 0 || user.professional)) {
        return rankString(user);
    }

    if (rating.deviation >= PROVISIONAL_RATING_CUTOFF) {
        return "?";
    }

    return rating.bounded_rank_label;
}

function renderPlayerIdentity(user: KibitzRoomUser, side: "black" | "white"): React.ReactElement {
    return (
        <span
            className={
                "KibitzDesktopSourceGameScoreboard-player KibitzDesktopSourceGameScoreboard-player--" +
                side
            }
        >
            <KibitzUserAvatar
                user={user}
                size={16}
                className="KibitzDesktopSourceGameScoreboard-avatar"
                iconClassName="KibitzDesktopSourceGameScoreboard-avatarImage"
            />
            {user.country ? (
                <span className="KibitzDesktopSourceGameScoreboard-flag" aria-hidden="true">
                    <Flag country={user.country} />
                </span>
            ) : null}
            <span className="KibitzDesktopSourceGameScoreboard-identity">
                <span className="KibitzDesktopMainGameScoreboard-playerName">{user.username}</span>
                <span className="KibitzDesktopMainGameScoreboard-playerRank">
                    [{getRankText(user)}]
                </span>
            </span>
        </span>
    );
}

function renderPlayerRow(game: KibitzWatchedGame, side: "black" | "white"): React.ReactElement {
    const user = side === "black" ? game.black : game.white;
    const sideLabel =
        side === "black"
            ? pgettext("Kibitz source scoreboard side aria label", "Black player")
            : pgettext("Kibitz source scoreboard side aria label", "White player");

    return (
        <div
            className={
                "KibitzDesktopSourceGameScoreboard-row KibitzDesktopSourceGameScoreboard-row--" +
                side
            }
            role="group"
            aria-label={sideLabel}
        >
            <span
                className={
                    "KibitzDesktopSourceGameScoreboard-stone KibitzDesktopSourceGameScoreboard-stone--" +
                    side
                }
                aria-hidden="true"
            />
            {renderPlayerIdentity(user, side)}
        </div>
    );
}

export function KibitzDesktopSourceGameScoreboard({
    game,
}: KibitzDesktopSourceGameScoreboardProps): React.ReactElement {
    return (
        <div
            className="KibitzDesktopSourceGameScoreboard"
            role="group"
            aria-label={pgettext("Kibitz source scoreboard aria label", "Source game players")}
        >
            <div className="KibitzDesktopSourceGameScoreboard-inner">
                {renderPlayerRow(game, "black")}
                {renderPlayerRow(game, "white")}
            </div>
        </div>
    );
}
