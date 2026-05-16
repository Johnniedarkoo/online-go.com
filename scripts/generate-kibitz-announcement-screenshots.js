import { mkdir } from "fs/promises";
import path from "path";
import { chromium, expect } from "@playwright/test";

const DEFAULT_FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:8080";
const DEFAULT_OUTPUT_DIR = path.resolve(
    process.cwd(),
    "..",
    "online-go.com",
    "kibitz-docs",
    "Announcement",
    "generated",
);

function parseArgs(argv) {
    const result = {
        outputDir: process.env.KIBITZ_ANNOUNCEMENT_OUTPUT_DIR || DEFAULT_OUTPUT_DIR,
        baseUrl: DEFAULT_FRONTEND_URL,
        headless: true,
    };

    for (let index = 0; index < argv.length; index++) {
        const arg = argv[index];

        if (arg === "--output-dir") {
            const next = argv[++index];
            if (!next) {
                throw new Error("--output-dir requires a value");
            }
            result.outputDir = next;
            continue;
        }

        if (arg === "--base-url") {
            const next = argv[++index];
            if (!next) {
                throw new Error("--base-url requires a value");
            }
            result.baseUrl = next;
            continue;
        }

        if (arg === "--headed") {
            result.headless = false;
            continue;
        }
    }

    return result;
}

async function waitForStableRect(page, selector, timeout = 10000) {
    await page.waitForFunction(
        ({ targetSelector }) => {
            const element = document.querySelector(targetSelector);
            if (!element) {
                return false;
            }

            const rect = element.getBoundingClientRect();
            const current = {
                top: Math.round(rect.top),
                left: Math.round(rect.left),
                width: Math.round(rect.width),
                height: Math.round(rect.height),
            };

            const key = `__kibitz_stable_rect_${targetSelector}`;
            const store = window;
            const previous = store[key];
            store[key] = current;

            return (
                previous != null &&
                previous.top === current.top &&
                previous.left === current.left &&
                previous.width === current.width &&
                previous.height === current.height &&
                current.width > 0 &&
                current.height > 0
            );
        },
        { targetSelector: selector },
        { timeout },
    );
}

async function waitForKibitzReady(page) {
    await expect(page.locator(".Kibitz")).toBeVisible({ timeout: 15000 });
    await expect(page.locator(".KibitzRoomStage")).toBeVisible({ timeout: 15000 });
    await waitForStableRect(page, ".KibitzRoomStage");
}

async function openFirstVariation(page) {
    const variationTrigger = page
        .locator(
            ".KibitzVariationList .variation-recall, .KibitzVariationList .variation-item, .KibitzRoomStream .variation-post",
        )
        .first();

    await expect(variationTrigger).toBeVisible({ timeout: 15000 });
    await variationTrigger.scrollIntoViewIfNeeded();
    await variationTrigger.click({ force: true });

    await expect(page.locator(".board-panel.secondary-board")).toBeVisible({ timeout: 15000 });
}

async function openMultipleVariations(page, variationCount = 2) {
    const variationTriggers = page.locator(
        ".KibitzVariationList .variation-recall, .KibitzVariationList .variation-item, .KibitzRoomStream .variation-post",
    );
    const count = Math.min(await variationTriggers.count(), variationCount);

    for (let index = 0; index < count; index++) {
        const trigger = variationTriggers.nth(index);
        await expect(trigger).toBeVisible({ timeout: 15000 });
        await trigger.scrollIntoViewIfNeeded();
        await trigger.click({ force: true });
    }

    await expect(page.locator(".board-panel.secondary-board")).toBeVisible({ timeout: 15000 });
}

async function openChangeBoardPreview(page, gameId) {
    await page.getByLabel("Room settings").click();
    await page.getByRole("button", { name: "Change live game" }).click();
    await expect(page.locator(".KibitzGamePickerOverlay")).toBeVisible({ timeout: 15000 });
    await page.locator("#kibitz-game-picker-input").fill(String(gameId));
    await page.getByRole("button", { name: "Load" }).click();
    await expect(page.locator(".KibitzGamePickerOverlay")).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: "Change board" })).toBeVisible({
        timeout: 15000,
    });
}

async function clickUntilCompareMode(page) {
    const stageBoards = page.locator(".KibitzRoomStage-boards").first();
    const compareButton = page.locator(".KibitzDividerHandle .divider-mode-button.compare-view");

    if ((await stageBoards.getAttribute("class"))?.includes("secondary-pane-equal")) {
        await waitForStableRect(page, ".KibitzRoomStage-boards");
        return;
    }

    if (await compareButton.count()) {
        await compareButton.first().click({ force: true });
        await expect(stageBoards).toHaveClass(/secondary-pane-equal/, { timeout: 5000 });
        await waitForStableRect(page, ".KibitzRoomStage-boards");
        return;
    }

    const increaseButton = page.locator(".KibitzDividerHandle .divider-arrow.increase");

    for (let index = 0; index < 4; index++) {
        if ((await stageBoards.getAttribute("class"))?.includes("secondary-pane-equal")) {
            await waitForStableRect(page, ".KibitzRoomStage-boards");
            return;
        }

        if (!(await increaseButton.count())) {
            break;
        }

        await increaseButton.first().click({ force: true });
        await expect(stageBoards).toHaveClass(/secondary-pane-(small|equal)/, {
            timeout: 3000,
        });
    }

    await expect(stageBoards).toHaveClass(/secondary-pane-equal/, { timeout: 5000 });
    await waitForStableRect(page, ".KibitzRoomStage-boards");
}

async function goto(page, baseUrl, route) {
    await page.goto(new URL(route, baseUrl).toString(), { waitUntil: "domcontentloaded" });
}

async function captureLocator(page, selector, filePath) {
    const locator = page.locator(selector);
    await expect(locator).toBeVisible({ timeout: 15000 });
    await waitForStableRect(page, selector);
    await locator.screenshot({
        path: filePath,
        animations: "disabled",
    });
}

async function main() {
    const { outputDir, baseUrl, headless } = parseArgs(process.argv.slice(2));

    await mkdir(outputDir, { recursive: true });

    const browser = await chromium.launch({ headless });
    const page = await browser.newPage();

    try {
        const scenes = [
            {
                fileName: "kibitz-announcement-01-room-main-stage.png",
                run: async () => {
                    await page.setViewportSize({ width: 1920, height: 1080 });
                    await goto(page, baseUrl, "/kibitz/user-fea5dced");
                    await waitForKibitzReady(page);
                    await captureLocator(
                        page,
                        ".KibitzRoomStage",
                        path.join(outputDir, "kibitz-announcement-01-room-main-stage.png"),
                    );
                },
            },
            {
                fileName: "kibitz-announcement-02-room-list.png",
                run: async () => {
                    await page.setViewportSize({ width: 1920, height: 1080 });
                    await goto(page, baseUrl, "/kibitz/user-fea5dced");
                    await waitForKibitzReady(page);
                    await captureLocator(
                        page,
                        ".KibitzRoomList",
                        path.join(outputDir, "kibitz-announcement-02-room-list.png"),
                    );
                },
            },
            {
                fileName: "kibitz-announcement-03-create-room-flow.png",
                run: async () => {
                    await page.setViewportSize({ width: 1920, height: 1080 });
                    await goto(page, baseUrl, "/kibitz/user-fea5dced");
                    await waitForKibitzReady(page);
                    await page.getByRole("button", { name: "Create room" }).first().click();
                    await expect(page.locator(".KibitzGamePickerOverlay")).toBeVisible({
                        timeout: 15000,
                    });
                    await waitForStableRect(page, ".KibitzGamePickerOverlay");
                    await captureLocator(
                        page,
                        ".KibitzGamePickerOverlay",
                        path.join(outputDir, "kibitz-announcement-03-create-room-flow.png"),
                    );
                },
            },
            {
                fileName: "kibitz-announcement-04-room-after-changing-main-board.png",
                run: async () => {
                    await page.setViewportSize({ width: 1920, height: 1080 });
                    await goto(page, baseUrl, "/kibitz/user-fea5dced");
                    await waitForKibitzReady(page);
                    await openChangeBoardPreview(page, 12459);
                    await page.getByRole("button", { name: "Change board" }).click();
                    await expect(page.locator(".KibitzRoomStage")).toBeVisible({
                        timeout: 15000,
                    });
                    await waitForKibitzReady(page);
                    await captureLocator(
                        page,
                        ".KibitzRoomStage",
                        path.join(
                            outputDir,
                            "kibitz-announcement-04-room-after-changing-main-board.png",
                        ),
                    );
                },
            },
            {
                fileName: "kibitz-announcement-05-room-settings-change-game-flow.png",
                run: async () => {
                    await page.setViewportSize({ width: 1920, height: 1080 });
                    await goto(page, baseUrl, "/kibitz/user-fea5dced");
                    await waitForKibitzReady(page);
                    await openChangeBoardPreview(page, 12459);
                    await waitForStableRect(page, ".KibitzGamePickerOverlay");
                    await captureLocator(
                        page,
                        ".KibitzGamePickerOverlay",
                        path.join(
                            outputDir,
                            "kibitz-announcement-05-room-settings-change-game-flow.png",
                        ),
                    );
                },
            },
            {
                fileName: "kibitz-announcement-06-variation-in-chat.png",
                run: async () => {
                    await page.setViewportSize({ width: 1920, height: 1080 });
                    await goto(page, baseUrl, "/kibitz/user-fea5dced");
                    await waitForKibitzReady(page);
                    const variationPost = page.locator(".KibitzRoomStream .variation-post").first();
                    await expect(variationPost).toBeVisible({ timeout: 15000 });
                    await variationPost.scrollIntoViewIfNeeded();
                    await waitForStableRect(page, ".KibitzRoomStream");
                    await captureLocator(
                        page,
                        ".KibitzRoomStream",
                        path.join(outputDir, "kibitz-announcement-06-variation-in-chat.png"),
                    );
                },
            },
            {
                fileName: "kibitz-announcement-07-variations-list-one-enabled.png",
                run: async () => {
                    await page.setViewportSize({ width: 1920, height: 1080 });
                    await goto(page, baseUrl, "/kibitz/user-fea5dced");
                    await waitForKibitzReady(page);
                    await openFirstVariation(page);
                    await captureLocator(
                        page,
                        ".KibitzVariationList",
                        path.join(
                            outputDir,
                            "kibitz-announcement-07-variations-list-one-enabled.png",
                        ),
                    );
                },
            },
            {
                fileName: "kibitz-announcement-08-variations-board-multiple-enabled.png",
                run: async () => {
                    await page.setViewportSize({ width: 1920, height: 1080 });
                    await goto(page, baseUrl, "/kibitz/user-fea5dced");
                    await waitForKibitzReady(page);
                    await openMultipleVariations(page, 2);
                    await clickUntilCompareMode(page);
                    await captureLocator(
                        page,
                        ".KibitzRoomStage",
                        path.join(
                            outputDir,
                            "kibitz-announcement-08-variations-board-multiple-enabled.png",
                        ),
                    );
                },
            },
            {
                fileName: "kibitz-announcement-09-mobile-room.png",
                run: async () => {
                    await page.setViewportSize({ width: 390, height: 844 });
                    await goto(page, baseUrl, "/kibitz/user-fea5dced");
                    await expect(page.locator(".KibitzRoomStage-mobile")).toBeVisible({
                        timeout: 15000,
                    });
                    await waitForStableRect(page, ".KibitzRoomStage-mobile");
                    await captureLocator(
                        page,
                        ".KibitzRoomStage-mobile",
                        path.join(outputDir, "kibitz-announcement-09-mobile-room.png"),
                    );
                },
            },
        ];

        for (const scene of scenes) {
            await scene.run();
            console.log(`Wrote ${scene.fileName}`);
        }
    } finally {
        await browser.close();
    }
}

await main();
