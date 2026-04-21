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
    "Kibitz shared stream panel desktop divider drags and snaps to preset splits",
    async ({ page }) => {
        await page.setViewportSize({ width: 1365, height: 900 });
        await load(page, "/kibitz/top-19x19?demo-kibitz=1");
        await page.waitForTimeout(1000);

        const panel = page.locator(".KibitzSharedStreamPanel").first();
        const stack = panel.locator(".KibitzSharedStreamPanel-stack");
        const divider = panel.locator(".KibitzSharedStreamPanel-divider");
        const roomPane = panel.locator(".KibitzSharedStreamPanel-roomPane");
        const gamePane = panel.locator(".KibitzSharedStreamPanel-gamePane");
        const stackBox = await stack.boundingBox();
        const dividerBox = await divider.boundingBox();

        await expect(roomPane).toBeVisible();
        await expect(gamePane).toBeVisible();
        await expect(panel.getByPlaceholder("Message Top 19x19")).toBeVisible();
        await expect(panel).toHaveClass(/split-game-30-room-70/);

        if (!stackBox || !dividerBox) {
            throw new Error("Expected Kibitz shared stream panel to have measurable layout boxes");
        }

        await page.mouse.move(
            dividerBox.x + dividerBox.width / 2,
            dividerBox.y + dividerBox.height / 2,
        );
        await page.mouse.down();
        await page.mouse.move(
            dividerBox.x + dividerBox.width / 2,
            stackBox.y + stackBox.height * 0.5,
            { steps: 8 },
        );
        await page.mouse.up();

        await expect(panel).toHaveClass(/split-game-50-room-50/);
        await expect(gamePane).toBeVisible();
        await expect(roomPane).toBeVisible();
        await expect(panel.getByPlaceholder("Message Top 19x19")).toBeVisible();
    },
);

ogsTest("Kibitz shared stream panel game stream uses accented background", async ({ page }) => {
    await page.setViewportSize({ width: 1365, height: 900 });
    await load(page, "/kibitz/top-19x19?demo-kibitz=1");
    await page.waitForTimeout(1000);

    const panel = page.locator(".KibitzSharedStreamPanel").first();
    const divider = panel.locator(".KibitzSharedStreamPanel-divider");
    const roomFeed = panel.locator(
        ".KibitzSharedStreamPanel-roomPane .KibitzSharedStreamPanel-paneFeed",
    );
    const gameFeed = panel.locator(
        ".KibitzSharedStreamPanel-gamePane .KibitzSharedStreamPanel-paneFeed",
    );
    const variationPreview = page.locator(".KibitzVariationList .variation-preview").first();
    const paneHeaders = panel.locator(".KibitzSharedStreamPanel-paneHeader");

    await expect(panel).toHaveClass(/split-game-30-room-70/);
    await expect(paneHeaders).toHaveCount(0);
    await expect(divider).toContainText("Game");
    await expect(divider).toContainText("Room");
    await expect(roomFeed).toBeVisible();
    await expect(gameFeed).toBeVisible();
    await expect(variationPreview).toBeVisible();

    const computedStyles = await gameFeed.evaluate((element) => {
        const styles = window.getComputedStyle(element);
        return {
            backgroundColor: styles.backgroundColor,
        };
    });

    const roomStyles = await roomFeed.evaluate((element) => {
        const styles = window.getComputedStyle(element);
        return {
            backgroundColor: styles.backgroundColor,
        };
    });

    expect(computedStyles.backgroundColor).not.toBe(roomStyles.backgroundColor);
});

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
