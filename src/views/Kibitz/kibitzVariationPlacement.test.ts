/*
 * Copyright (C)  Online-Go.com
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { TestGoban } from "goban";
import { observeKibitzVariationPlacement } from "./kibitzVariationPlacement";

class PlacementBoard extends TestGoban {
    public click(x: number, y: number, shift = false): void {
        this.tapAtImpl(x, y, false, false, shift, 0);
    }
}

function setup(handicap = 0) {
    const board = new PlacementBoard({
        width: 9,
        height: 9,
        mode: "analyze",
        phase: "play",
        handicap,
        free_handicap_placement: true,
    });
    board.engine.parentEventEmitter = board;
    board.setAnalyzeTool("stone", "alternate");
    board.enableStonePlacement();
    const placed = jest.fn(() => true);
    const stop = observeKibitzVariationPlacement(board, placed);
    return { board, placed, stop };
}

describe("posted variation placement", () => {
    test("waits for completed placement and includes the clicked move", () => {
        const { board, placed } = setup();
        board.on("cur_move", () => expect(placed).not.toHaveBeenCalled());
        board.click(2, 3);
        expect(placed).toHaveBeenCalledWith(board.engine.cur_move.getMoveStringToThisPoint());
        expect(placed).toHaveBeenCalledTimes(1);
        board.click(3, 3);
        expect(placed).toHaveBeenCalledTimes(1);
    });

    test("starts a draft when clicking an existing continuation", () => {
        const { board, placed } = setup();
        board.engine.place(2, 3);
        const existing = board.engine.cur_move;
        board.showPrevious();
        expect(placed).not.toHaveBeenCalled();
        board.click(2, 3);
        expect(board.engine.cur_move).toBe(existing);
        expect(placed).toHaveBeenCalledTimes(1);
    });

    test("ignores navigation, shift navigation, and occupied intersections", () => {
        const { board, placed } = setup();
        board.engine.place(2, 3);
        board.engine.place(3, 3);
        board.showPrevious();
        board.showNext();
        board.click(2, 3, true);
        board.click(2, 3);
        expect(placed).not.toHaveBeenCalled();
    });

    test("removes listeners when the posted variation closes", () => {
        const { board, placed, stop } = setup();
        stop();
        board.click(2, 3);
        expect(placed).not.toHaveBeenCalled();
    });

    test("permits a retry if the draft cannot start", () => {
        const { board, placed } = setup();
        placed.mockReturnValueOnce(false);
        board.click(2, 3);
        board.click(3, 3);
        expect(placed).toHaveBeenCalledTimes(2);
    });

    test("includes an automatic handicap pass", () => {
        const { board, placed } = setup(2);
        board.click(2, 3);
        expect(placed).toHaveBeenCalledTimes(1);
        expect(placed).toHaveBeenCalledWith(board.engine.cur_move.getMoveStringToThisPoint());
    });
});
