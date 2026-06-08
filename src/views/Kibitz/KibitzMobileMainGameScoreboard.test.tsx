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
import { KibitzMobileMainGameScoreboard } from "./KibitzMobileMainGameScoreboard";

const clockSpy = jest.fn(({ color, goban }: { color: "black" | "white"; goban: unknown }) => (
    <span data-testid={`clock-${color}`}>{goban ? color : "missing"}</span>
));

jest.mock("@/components/Clock/Clock", () => ({
    __esModule: true,
    Clock: (props: { color: "black" | "white"; goban: unknown }) => clockSpy(props),
}));

jest.mock("@/components/Flag/Flag", () => ({
    __esModule: true,
    Flag: ({ country }: { country: string }) => <span className="flag">{country}</span>,
}));

jest.mock("@/components/Player/PlayerDetails", () => ({
    __esModule: true,
    PlayerDetails: () => null,
}));

jest.mock("@/components/GobanView/hooks", () => {
    return {
        __esModule: true,
        generateGobanHook:
            <
                T,
                G extends {
                    on?: (event: string, cb: () => void) => void;
                    off?: (event: string, cb: () => void) => void;
                },
            >(
                deriveProp: (goban: G) => T,
                events: Array<string> = [],
            ) =>
            (goban: G) => {
                const [prop, setProp] = React.useState(() => deriveProp(goban));

                React.useEffect(() => {
                    const syncProp = () => {
                        setProp(deriveProp(goban));
                    };

                    syncProp();

                    if (!goban) {
                        return undefined;
                    }

                    const eventNames = ["load", ...events];
                    for (const eventName of eventNames) {
                        goban.on?.(eventName, syncProp);
                    }

                    return () => {
                        for (const eventName of eventNames) {
                            goban.off?.(eventName, syncProp);
                        }
                    };
                }, [goban]);

                return prop;
            },
    };
});

jest.mock("./KibitzUserAvatar", () => ({
    __esModule: true,
    KibitzUserAvatar: ({ user }: { user: KibitzRoomUser }) => (
        <span className="KibitzUserAvatar">{user.username}</span>
    ),
}));

jest.mock("@/lib/popover", () => ({
    __esModule: true,
    popover: jest.fn(),
}));

jest.mock("@/lib/translate", () => ({
    __esModule: true,
    interpolate: (template: string, values: Record<string, string | number>) =>
        template.replace(/{{(\w+)}}/g, (_match, key) => String(values[key] ?? "")),
    ngettext: (singular: string, plural: string, count: number) =>
        count === 1 ? singular : plural,
    pgettext: (_context: string, text: string) => text,
}));

type MockClock = {
    current_player: "black" | "white";
    current_player_id: string;
    start_mode?: boolean;
    start_time_left?: number;
    time_of_last_move: number;
    black_clock: { main_time: number; period_time_left?: number; block_time_left?: number };
    white_clock: { main_time: number; period_time_left?: number; block_time_left?: number };
};

type MockEngine = {
    phase: string;
    mode: string;
    outcome: string;
    time_control: object | null;
    paused_since?: number | null;
    winner?: number | "black" | "white";
    playerToMove: () => number;
    computeScore: (only_prisoners?: boolean) => {
        black: { prisoners: number };
        white: { prisoners: number };
    };
};

type MockControllerBundle = {
    controller: GobanController;
    emitter: EventEmitter;
    goban: {
        engine: MockEngine;
        mode: string;
        paused_since?: number;
        last_emitted_clock?: MockClock | null;
        on: (event: string, cb: () => void) => void;
        off: (event: string, cb: () => void) => void;
        emit: (event: string) => void;
    };
};

function makeGame(overrides: Partial<KibitzWatchedGame> = {}): KibitzWatchedGame {
    const player = (id: number, username: string, country = "us"): KibitzRoomUser => ({
        id,
        username,
        ranking: 1,
        professional: false,
        ui_class: "",
        country,
    });

    return {
        game_id: 42,
        board_size: "19x19",
        title: "Test game",
        black: player(1, "alpha"),
        white: player(2, "beta"),
        live: true,
        move_number: 12,
        ...overrides,
    };
}

function makeClock(): MockClock {
    return {
        current_player: "black",
        current_player_id: "1",
        time_of_last_move: Date.now(),
        black_clock: { main_time: 44000 },
        white_clock: { main_time: 159000 },
    };
}

function makeController(
    engine: MockEngine,
    clock: MockClock | null = makeClock(),
): MockControllerBundle {
    const emitter = new EventEmitter();
    const goban = {
        engine,
        mode: "play",
        paused_since: engine.paused_since ?? undefined,
        last_emitted_clock: clock,
        on: emitter.on.bind(emitter),
        off: emitter.off.bind(emitter),
        emit: emitter.emit.bind(emitter),
    };

    return {
        controller: {
            goban,
        } as unknown as GobanController,
        emitter,
        goban,
    };
}

describe("KibitzMobileMainGameScoreboard", () => {
    beforeEach(() => {
        clockSpy.mockClear();
    });

    it("returns null when the main board is not visible", () => {
        const { container } = render(
            <KibitzMobileMainGameScoreboard
                controller={null}
                game={makeGame()}
                isMainBoardVisible={false}
            />,
        );

        expect(container.firstChild).toBeNull();
    });

    it("renders a two-row scoreboard card without VS or visible black/white labels", () => {
        render(
            <KibitzMobileMainGameScoreboard
                controller={null}
                game={makeGame()}
                isMainBoardVisible={true}
            />,
        );

        expect(document.querySelectorAll(".KibitzMobileMainGameScoreboard")).toHaveLength(1);
        expect(document.querySelectorAll(".KibitzMobileMainGameScoreboard-row")).toHaveLength(2);
        expect(document.querySelector(".KibitzMobileMainGameScoreboard-row--black")).toBeTruthy();
        expect(document.querySelector(".KibitzMobileMainGameScoreboard-row--white")).toBeTruthy();
        expect(screen.queryByText("VS")).toBeNull();
        expect(screen.queryByText("Black")).toBeNull();
        expect(screen.queryByText("White")).toBeNull();
    });

    it("omits clocks and captures when the controller is null", () => {
        render(
            <KibitzMobileMainGameScoreboard
                controller={null}
                game={makeGame()}
                isMainBoardVisible={true}
            />,
        );

        expect(screen.queryByTestId("clock-black")).toBeNull();
        expect(screen.queryByTestId("clock-white")).toBeNull();
        expect(screen.queryByText("24")).toBeNull();
        expect(screen.queryByText("26")).toBeNull();
    });

    it("renders clocks and captures from the live controller", () => {
        const { controller } = makeController({
            phase: "play",
            mode: "play",
            outcome: "",
            time_control: {},
            playerToMove: () => 1,
            computeScore: () => ({
                black: { prisoners: 24 },
                white: { prisoners: 26 },
            }),
        });

        render(
            <KibitzMobileMainGameScoreboard
                controller={controller}
                game={makeGame()}
                isMainBoardVisible={true}
            />,
        );

        expect(screen.getByTestId("clock-black")).toHaveTextContent("black");
        expect(screen.getByTestId("clock-white")).toHaveTextContent("white");
        expect(screen.getByText("24")).toBeInTheDocument();
        expect(screen.getByText("26")).toBeInTheDocument();
        expect(clockSpy).toHaveBeenCalledWith(
            expect.objectContaining({ color: "black", goban: controller.goban }),
        );
        expect(clockSpy).toHaveBeenCalledWith(
            expect.objectContaining({ color: "white", goban: controller.goban }),
        );
    });

    it("rounds kyu ranks to whole numbers", () => {
        render(
            <KibitzMobileMainGameScoreboard
                controller={null}
                game={makeGame({
                    black: { ...makeGame().black, ranking: 12.7 },
                    white: { ...makeGame().white, ranking: 3.2 },
                })}
                isMainBoardVisible={true}
            />,
        );

        expect(screen.getByText("[13k]")).toBeInTheDocument();
        expect(screen.getByText("[3k]")).toBeInTheDocument();
    });

    it("applies the active class to the player to move", () => {
        const { controller, emitter, goban } = makeController({
            phase: "play",
            mode: "play",
            outcome: "",
            time_control: {},
            playerToMove: () => 1,
            computeScore: () => ({
                black: { prisoners: 1 },
                white: { prisoners: 2 },
            }),
        });

        const { container } = render(
            <KibitzMobileMainGameScoreboard
                controller={controller}
                game={makeGame()}
                isMainBoardVisible={true}
            />,
        );

        expect(container.querySelector(".KibitzMobileMainGameScoreboard-row--black")).toHaveClass(
            "is-active",
        );

        act(() => {
            goban.engine.playerToMove = () => 2;
            emitter.emit("cur_move");
        });

        expect(container.querySelector(".KibitzMobileMainGameScoreboard-row--white")).toHaveClass(
            "is-active",
        );
    });

    it("shows a compact state token for stone removal, paused, and finished games", () => {
        const scenarios: Array<{
            label: string;
            engine: MockEngine;
            expected: string;
        }> = [
            {
                label: "stone removal",
                engine: {
                    phase: "stone removal",
                    mode: "play",
                    outcome: "",
                    time_control: {},
                    playerToMove: () => 1,
                    computeScore: () => ({
                        black: { prisoners: 1 },
                        white: { prisoners: 2 },
                    }),
                },
                expected: "Score",
            },
            {
                label: "paused",
                engine: {
                    phase: "play",
                    mode: "play",
                    outcome: "",
                    time_control: {},
                    paused_since: Date.now(),
                    playerToMove: () => 1,
                    computeScore: () => ({
                        black: { prisoners: 1 },
                        white: { prisoners: 2 },
                    }),
                },
                expected: "Pause",
            },
            {
                label: "finished",
                engine: {
                    phase: "finished",
                    mode: "play",
                    outcome: "2.5",
                    time_control: {},
                    winner: "white",
                    playerToMove: () => 1,
                    computeScore: () => ({
                        black: { prisoners: 1 },
                        white: { prisoners: 2 },
                    }),
                },
                expected: "W+2.5",
            },
        ];

        for (const scenario of scenarios) {
            const { unmount } = render(
                <KibitzMobileMainGameScoreboard
                    controller={makeController(scenario.engine).controller}
                    game={makeGame()}
                    isMainBoardVisible={true}
                />,
            );

            expect(screen.getByText(scenario.expected)).toBeInTheDocument();
            unmount();
        }
    });
});
