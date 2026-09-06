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

export const CURRENT_VARIATION_HEADER_QUERY_PARAM = "kibitz_current_variation_header";

export function isSplitCurrentVariationHeaderForced(search: string): boolean {
    return new URLSearchParams(search).get(CURRENT_VARIATION_HEADER_QUERY_PARAM) === "split";
}

export function shouldUseCompareHeader(
    mainGameId: number | null | undefined,
    selectedVariationGameId: number | null | undefined,
    forceSplitCurrentVariationHeader: boolean,
): boolean {
    const variationIsFromCurrentGame =
        mainGameId != null &&
        selectedVariationGameId != null &&
        selectedVariationGameId === mainGameId;

    return !variationIsFromCurrentGame || forceSplitCurrentVariationHeader;
}
