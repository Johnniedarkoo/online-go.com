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

import { expect } from "@playwright/test";
import { load, ogsTest } from "@helpers";

ogsTest(
    "Kibitz room list title truncates without widening the desktop left rail",
    async ({ page }) => {
        await page.setViewportSize({ width: 1365, height: 900 });
        await load(page, "/kibitz/top-19x19?demo-kibitz=1");
        await page.waitForTimeout(750);

        await page.evaluate(() => {
            const longTitle =
                "VeryLongVeryLongVeryLongVeryLongVeryLongVeryLongVeryLongVeryLongVeryLong";
            const titleElements = Array.from(
                document.querySelectorAll(".KibitzRoomList .room-title"),
            );

            titleElements.forEach((element) => {
                element.textContent = longTitle;
            });
        });

        await page.waitForTimeout(100);

        const metrics = await page.evaluate(() => {
            const leftRail = document.querySelector(".Kibitz-left-rail") as HTMLElement | null;
            const createButton = document.querySelector(
                ".KibitzRoomList-createButton",
            ) as HTMLElement | null;
            const roomMain = document.querySelector(
                ".KibitzRoomList-item .room-main",
            ) as HTMLElement | null;
            const roomTitle = document.querySelector(
                ".KibitzRoomList-item .room-title",
            ) as HTMLElement | null;

            if (!leftRail || !createButton || !roomMain || !roomTitle) {
                return null;
            }

            const leftRailRect = leftRail.getBoundingClientRect();
            const createButtonRect = createButton.getBoundingClientRect();
            const roomMainRect = roomMain.getBoundingClientRect();
            const roomTitleRect = roomTitle.getBoundingClientRect();

            return {
                createButtonRight: createButtonRect.right,
                leftRailRight: leftRailRect.right,
                leftRailWidth: leftRailRect.width,
                roomMainRight: roomMainRect.right,
                roomTitleClientWidth: roomTitle.clientWidth,
                roomTitleRectWidth: roomTitleRect.width,
                roomTitleScrollWidth: roomTitle.scrollWidth,
            };
        });

        expect(metrics).not.toBeNull();
        if (!metrics) {
            throw new Error("Kibitz room list metrics could not be collected");
        }

        expect(metrics.roomTitleScrollWidth).toBeGreaterThan(metrics.roomTitleClientWidth);
        expect(metrics.roomMainRight).toBeLessThanOrEqual(metrics.leftRailRight + 1);
        expect(metrics.createButtonRight).toBeLessThanOrEqual(metrics.leftRailRight + 1);
        expect(metrics.leftRailWidth).toBeLessThanOrEqual(210);
        expect(metrics.roomTitleRectWidth).toBeLessThanOrEqual(metrics.leftRailWidth);
    },
);
