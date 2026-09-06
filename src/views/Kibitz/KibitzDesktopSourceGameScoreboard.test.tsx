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
import { render, screen } from "@testing-library/react";
import type { KibitzRoomUser, KibitzWatchedGame } from "@/models/kibitz";
import { KibitzDesktopSourceGameScoreboard } from "./KibitzDesktopSourceGameScoreboard";

jest.mock("./KibitzUserAvatar", () => ({
    __esModule: true,
    KibitzUserAvatar: ({
        user,
        className,
        iconClassName,
    }: {
        user: KibitzRoomUser;
        className?: string;
        iconClassName?: string;
    }) => (
        <span className={`${className ?? ""} ${iconClassName ?? ""}`.trim()}>{user.username}</span>
    ),
}));

jest.mock("@/components/Flag/Flag", () => ({
    __esModule: true,
    Flag: ({ country }: { country: string }) => <span className="flag">{country}</span>,
}));

jest.mock("@/lib/translate", () => ({
    __esModule: true,
    pgettext: (_context: string, text: string) => text,
    interpolate: (template: string, values: Array<string | number>) =>
        template.replace("%s", String(values[0] ?? "")),
}));

function makeUser(id: number, username: string, country: string): KibitzRoomUser {
    return {
        id,
        username,
        country,
        ranking: 1,
        professional: false,
        ui_class: "",
    };
}

function makeGame(): KibitzWatchedGame {
    return {
        game_id: 42,
        board_size: "19x19",
        title: "Source game",
        black: makeUser(1, "Black source", "us"),
        white: makeUser(2, "White source", "jp"),
        live: false,
        move_number: 80,
    };
}

describe("KibitzDesktopSourceGameScoreboard", () => {
    it("uses the shared bookend layout without live-state content", () => {
        const { container } = render(<KibitzDesktopSourceGameScoreboard game={makeGame()} />);

        expect(container.querySelector(".KibitzDesktopSourceGameScoreboard")).toHaveClass(
            "KibitzDesktopMainGameScoreboard",
            "KibitzDesktopMainGameScoreboard--compare",
        );
        expect(
            container.querySelectorAll(".KibitzDesktopMainGameScoreboard-avatarCell"),
        ).toHaveLength(2);
        expect(container.querySelectorAll(".KibitzDesktopMainGameScoreboard-row")).toHaveLength(2);
        expect(
            container.querySelectorAll(".KibitzDesktopMainGameScoreboard-rowGroup--end"),
        ).toHaveLength(0);
        expect(container.querySelectorAll(".KibitzDesktopMainGameScoreboard-avatar")).toHaveLength(
            2,
        );
        expect(
            container.querySelectorAll(".KibitzDesktopMainGameScoreboard-playerFlag"),
        ).toHaveLength(2);
        expect(container.querySelectorAll("[class*=stone]")).toHaveLength(0);
        expect(screen.getAllByText("Black source")).toHaveLength(2);
        expect(screen.getAllByText("White source")).toHaveLength(2);
        expect(screen.queryByTestId("clock-black")).toBeNull();
        expect(screen.queryByTestId("clock-white")).toBeNull();
    });
});
