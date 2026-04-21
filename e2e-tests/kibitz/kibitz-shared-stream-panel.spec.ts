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
import { expectOGSClickableByName } from "@helpers/matchers";

ogsTest(
    "Kibitz shared stream panel desktop split cycles through room and game states",
    async ({ page }) => {
        await page.setViewportSize({ width: 1365, height: 900 });
        await load(page, "/kibitz/top-19x19?demo-kibitz=1");
        await page.waitForTimeout(1000);

        const panel = page.locator(".KibitzSharedStreamPanel").first();
        const divider = await expectOGSClickableByName(page, /Shared stream split/);
        const roomPane = panel.locator(".KibitzSharedStreamPanel-roomPane");
        const gamePane = panel.locator(".KibitzSharedStreamPanel-gamePane");

        await expect(roomPane).toBeVisible();
        await expect(gamePane).toBeVisible();
        await expect(panel.getByPlaceholder("Message Top 19x19")).toBeVisible();

        await divider.click();
        await expect(gamePane).toBeHidden();
        await expect(roomPane).toBeVisible();
        await expect(panel.getByPlaceholder("Message Top 19x19")).toBeVisible();

        await divider.click();
        await expect(gamePane).toBeVisible();
        await expect(roomPane).toBeHidden();
        await expect(panel.getByPlaceholder("Can't send messages to game chat")).toBeVisible();
    },
);

ogsTest(
    "Kibitz shared stream panel mobile switcher swaps between room and game feeds",
    async ({ page }) => {
        await page.setViewportSize({ width: 900, height: 900 });
        await load(page, "/kibitz/top-19x19?demo-kibitz=1");
        await page.waitForTimeout(1000);

        const panel = page.locator(".KibitzSharedStreamPanel").first();
        const roomTab = panel.getByRole("button", { name: "Room" });
        const gameTab = panel.getByRole("button", { name: "Game" });

        await expect(panel.locator(".KibitzSharedStreamPanel-mobileSwitcher")).toBeVisible();
        await expect(roomTab).toHaveAttribute("aria-pressed", "true");
        await expect(gameTab).toHaveAttribute("aria-pressed", "false");
        await expect(panel.getByPlaceholder("Message Top 19x19")).toBeVisible();

        await expect(roomTab).toBeEnabled();
        await expect(gameTab).toBeEnabled();
        await gameTab.click();

        await expect(roomTab).toHaveAttribute("aria-pressed", "false");
        await expect(gameTab).toHaveAttribute("aria-pressed", "true");
        await expect(panel.getByPlaceholder("Can't send messages to game chat")).toBeVisible();

        await roomTab.click();
        await expect(roomTab).toHaveAttribute("aria-pressed", "true");
        await expect(panel.getByPlaceholder("Message Top 19x19")).toBeVisible();
    },
);
