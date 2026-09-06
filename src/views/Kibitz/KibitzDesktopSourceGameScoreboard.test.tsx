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
import { act, render, screen } from "@testing-library/react";
import EventEmitter from "eventemitter3";
import type { GobanController } from "@/lib/GobanController";
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
    _: (text: string) => text,
    pgettext: (_context: string, text: string) => text,
    interpolate: (template: string, values: Record<string, string | number>) =>
        template.replace(/{{(\w+)}}/g, (_match, key) => String(values[key] ?? "")),
    ngettext: (singular: string, plural: string, count: number) =>
        count === 1 ? singular : plural,
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

type MockScore = {
    black: { prisoners: number };
    white: { prisoners: number };
};

type MockGoban = {
    engine: {
        phase: string;
        mode: string;
        outcome: string;
        computeScore: (onlyPrisoners?: boolean) => MockScore;
    };
    mode: string;
    on: (event: string, listener: () => void) => void;
    off: (event: string, listener: () => void) => void;
};

function makeController(scoreProvider: () => MockScore): {
    controller: GobanController;
    emitter: EventEmitter;
    goban: MockGoban;
} {
    const emitter = new EventEmitter();
    const goban: MockGoban = {
        engine: {
            phase: "play",
            mode: "play",
            outcome: "",
            computeScore: (onlyPrisoners = true) => {
                expect(onlyPrisoners).toBe(true);
                return scoreProvider();
            },
        },
        mode: "play",
        on: (event, listener) => {
            emitter.on(event, listener);
        },
        off: (event, listener) => {
            emitter.off(event, listener);
        },
    };

    return {
        controller: { goban } as unknown as GobanController,
        emitter,
        goban,
    };
}

describe("KibitzDesktopSourceGameScoreboard", () => {
    it("uses the shared bookend layout without live-state content", () => {
        const { container } = render(
            <KibitzDesktopSourceGameScoreboard game={makeGame()} secondaryBoardController={null} />,
        );

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
        ).toHaveLength(2);
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
        expect(container.querySelectorAll(".is-active")).toHaveLength(0);
    });

    it("renders prisoners from the secondary Goban in the matching rows and updates them", () => {
        let score: MockScore = {
            black: { prisoners: 3 },
            white: { prisoners: 5 },
        };
        const { emitter, controller } = makeController(() => score);

        const { container } = render(
            <KibitzDesktopSourceGameScoreboard
                game={makeGame()}
                secondaryBoardController={controller}
            />,
        );

        expect(
            container
                .querySelector(".KibitzDesktopMainGameScoreboard-row--black")
                ?.querySelector('[aria-label="Black has captured 3 stones"]'),
        ).toBeInTheDocument();
        expect(
            container
                .querySelector(".KibitzDesktopMainGameScoreboard-row--white")
                ?.querySelector('[aria-label="White has captured 5 stones"]'),
        ).toBeInTheDocument();
        expect(container.querySelectorAll(".KibitzDesktopMainGameScoreboard-clock")).toHaveLength(
            0,
        );

        score = {
            black: { prisoners: 7 },
            white: { prisoners: 1 },
        };
        act(() => {
            emitter.emit("cur_move");
        });

        expect(screen.getByLabelText("Black has captured 7 stones")).toBeInTheDocument();
        expect(screen.getByLabelText("White has captured 1 stone")).toBeInTheDocument();
        expect(screen.queryByLabelText("Black has captured 3 stones")).toBeNull();
        expect(screen.queryByLabelText("White has captured 5 stones")).toBeNull();
    });
});
