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
import { pgettext } from "@/lib/translate";
import type { KibitzWatchedGame } from "@/models/kibitz";
import {
    KibitzDesktopScoreboardCapture,
    useKibitzDesktopGameScore,
} from "./KibitzDesktopScoreboardCaptures";
import { KibitzUserAvatar } from "./KibitzUserAvatar";
import { KibitzDesktopScoreboardCard } from "./KibitzDesktopScoreboardCard";
import "./KibitzDesktopSourceGameScoreboard.css";

interface KibitzDesktopSourceGameScoreboardProps {
    game: KibitzWatchedGame;
    secondaryBoardController: GobanController | null;
}

function renderStaticAvatar(user: KibitzWatchedGame["black"]): React.ReactElement {
    return (
        <KibitzUserAvatar
            user={user}
            size={32}
            className="KibitzDesktopMainGameScoreboard-avatar"
            iconClassName="KibitzDesktopMainGameScoreboard-avatarImage"
        />
    );
}

export function KibitzDesktopSourceGameScoreboard({
    game,
    secondaryBoardController,
}: KibitzDesktopSourceGameScoreboardProps): React.ReactElement {
    const score = useKibitzDesktopGameScore(secondaryBoardController?.goban ?? null);

    return (
        <KibitzDesktopScoreboardCard
            className="KibitzDesktopSourceGameScoreboard"
            ariaLabel={pgettext("Kibitz source scoreboard aria label", "Source game players")}
            blackUser={game.black}
            whiteUser={game.white}
            compact
            renderAvatar={(user) => renderStaticAvatar(user)}
            renderRowEnd={(_user, side) => (
                <KibitzDesktopScoreboardCapture
                    value={side === "black" ? score?.black.prisoners : score?.white.prisoners}
                    color={side}
                />
            )}
        />
    );
}
