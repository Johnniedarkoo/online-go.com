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
import { pgettext } from "@/lib/translate";
import type { KibitzWatchedGame } from "@/models/kibitz";
import { KibitzUserAvatar } from "./KibitzUserAvatar";
import { KibitzDesktopScoreboardCard } from "./KibitzDesktopScoreboardCard";

interface KibitzDesktopSourceGameScoreboardProps {
    game: KibitzWatchedGame;
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
}: KibitzDesktopSourceGameScoreboardProps): React.ReactElement {
    return (
        <KibitzDesktopScoreboardCard
            className="KibitzDesktopSourceGameScoreboard"
            ariaLabel={pgettext("Kibitz source scoreboard aria label", "Source game players")}
            blackUser={game.black}
            whiteUser={game.white}
            compact
            renderAvatar={(user) => renderStaticAvatar(user)}
        />
    );
}
