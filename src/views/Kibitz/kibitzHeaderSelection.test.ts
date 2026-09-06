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

import {
    isSplitCurrentVariationHeaderForced,
    shouldUseCompareHeader,
} from "./kibitzHeaderSelection";

describe("Kibitz variation header selection", () => {
    it("uses the original header for a current-game variation by default", () => {
        expect(shouldUseCompareHeader(42, 42, false)).toBe(false);
    });

    it("uses the split header for a current-game variation with the review flag", () => {
        expect(shouldUseCompareHeader(42, 42, true)).toBe(true);
    });

    it("always uses the split header for a previous-game variation", () => {
        expect(shouldUseCompareHeader(42, 41, false)).toBe(true);
        expect(shouldUseCompareHeader(42, 41, true)).toBe(true);
    });

    it("uses the split header while the variation source is unresolved", () => {
        expect(shouldUseCompareHeader(42, undefined, false)).toBe(true);
    });

    it("recognizes only the explicit split query value", () => {
        expect(isSplitCurrentVariationHeaderForced("?kibitz_current_variation_header=split")).toBe(
            true,
        );
        expect(
            isSplitCurrentVariationHeaderForced("?kibitz_current_variation_header=original"),
        ).toBe(false);
        expect(isSplitCurrentVariationHeaderForced("")).toBe(false);
    });
});
