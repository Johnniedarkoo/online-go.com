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
import { getUserRating, PROVISIONAL_RATING_CUTOFF, rankString } from "@/lib/rank_utils";
import { pgettext } from "@/lib/translate";
import type { KibitzRoomUser } from "@/models/kibitz";
import { KibitzUserAvatar } from "./KibitzUserAvatar";
import "./KibitzDesktopScoreboardCard.css";

export type KibitzDesktopScoreboardSide = "black" | "white";

type AvatarRenderer = (
    user: KibitzRoomUser,
    side: KibitzDesktopScoreboardSide,
) => React.ReactElement;

type RowEndRenderer = (user: KibitzRoomUser, side: KibitzDesktopScoreboardSide) => React.ReactNode;

interface KibitzDesktopScoreboardCardProps {
    blackUser: KibitzRoomUser;
    whiteUser: KibitzRoomUser;
    ariaLabel: string;
    renderAvatar: AvatarRenderer;
    renderRowEnd?: RowEndRenderer;
    blackActive?: boolean;
    whiteActive?: boolean;
    compact?: boolean;
    className?: string;
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

function renderPlayerIdentity(
    user: KibitzRoomUser,
    side: KibitzDesktopScoreboardSide,
): React.ReactElement {
    return (
        <span
            className={
                "KibitzDesktopMainGameScoreboard-player KibitzDesktopMainGameScoreboard-player--" +
                side
            }
        >
            {user.country ? (
                <span className="KibitzDesktopMainGameScoreboard-playerFlag" aria-hidden="true">
                    <Flag country={user.country} />
                </span>
            ) : null}
            <span className="KibitzDesktopMainGameScoreboard-playerIdentity">
                <span className="KibitzDesktopMainGameScoreboard-playerName">{user.username}</span>
                <span className="KibitzDesktopMainGameScoreboard-playerRank">
                    [{getRankText(user)}]
                </span>
            </span>
        </span>
    );
}

function renderAvatarCell(
    user: KibitzRoomUser,
    side: KibitzDesktopScoreboardSide,
    active: boolean,
    renderAvatar: AvatarRenderer,
): React.ReactElement {
    return (
        <div
            className={
                "KibitzDesktopMainGameScoreboard-avatarCell KibitzDesktopMainGameScoreboard-avatarCell--" +
                side +
                (active ? " is-active" : "")
            }
        >
            {renderAvatar(user, side)}
        </div>
    );
}

function getSideAriaLabel(side: KibitzDesktopScoreboardSide): string {
    return side === "black"
        ? pgettext("Kibitz desktop scoreboard side aria label", "Black player")
        : pgettext("Kibitz desktop scoreboard side aria label", "White player");
}

function renderPlayerRow(
    user: KibitzRoomUser,
    side: KibitzDesktopScoreboardSide,
    active: boolean,
    renderRowEnd: RowEndRenderer | undefined,
): React.ReactElement {
    return (
        <div
            className={
                "KibitzDesktopMainGameScoreboard-row KibitzDesktopMainGameScoreboard-row--" +
                side +
                (active ? " is-active" : "")
            }
            role="group"
            aria-label={getSideAriaLabel(side)}
        >
            <div className="KibitzDesktopMainGameScoreboard-rowGroup KibitzDesktopMainGameScoreboard-rowGroup--start">
                {renderPlayerIdentity(user, side)}
            </div>
            {renderRowEnd ? (
                <div className="KibitzDesktopMainGameScoreboard-rowGroup KibitzDesktopMainGameScoreboard-rowGroup--end">
                    {renderRowEnd(user, side)}
                </div>
            ) : null}
        </div>
    );
}

function renderDefaultAvatar(user: KibitzRoomUser): React.ReactElement {
    return (
        <KibitzUserAvatar
            user={user}
            size={32}
            className="KibitzDesktopMainGameScoreboard-avatar"
            iconClassName="KibitzDesktopMainGameScoreboard-avatarImage"
        />
    );
}

export function KibitzDesktopScoreboardCard({
    blackUser,
    whiteUser,
    ariaLabel,
    renderAvatar = renderDefaultAvatar,
    renderRowEnd,
    blackActive = false,
    whiteActive = false,
    compact = false,
    className,
}: KibitzDesktopScoreboardCardProps): React.ReactElement {
    return (
        <div
            className={
                "KibitzDesktopMainGameScoreboard" +
                (compact ? " KibitzDesktopMainGameScoreboard--compare" : "") +
                (className ? ` ${className}` : "")
            }
            role="group"
            aria-label={ariaLabel}
        >
            <div className="KibitzDesktopMainGameScoreboard-inner">
                {renderAvatarCell(blackUser, "black", blackActive, renderAvatar)}
                {renderPlayerRow(blackUser, "black", blackActive, renderRowEnd)}
                {renderPlayerRow(whiteUser, "white", whiteActive, renderRowEnd)}
                {renderAvatarCell(whiteUser, "white", whiteActive, renderAvatar)}
            </div>
        </div>
    );
}
