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

import { GobanController } from "@/lib/GobanController";
import {
    getMovePathToRestore,
    shouldConnectKibitzBoardToGame,
    shouldRestoreMainBoardToOfficialTail,
    refreshLastOfficialMoveFromTrunk,
    restoreToOfficialTail,
    shouldRestoreToOfficialTailForGame,
} from "./KibitzBoard";
import {
    describeBoardSurfaceFromHostRect,
    describeGobanContainerFromContainerRect,
    describeGobanContentFromMetrics,
    describeMobileResizeDividerGeometry,
    describeMobileResizeGeometrySnapshot,
    describeMobileResizeShellGeometry,
    computeRecenterScale,
    computeMobileBoardGeometry,
    computeMobileResizeAppliedTarget,
    computeTransientDragReleaseGeometryFromAppliedTarget,
    computeTransientDragReleaseGeometry,
    compareMobileGeometryToTarget,
    isKibitzBoardResizeStale,
    predictNativeGobanContentSize,
    shouldCommitMobileSplitRatioUpdate,
    computeTransientDragVisualBoardSize,
    computeTransientDragScale,
    computeMeasuredTransientDragContentSize,
} from "./kibitzBoardSizing";

describe("getMovePathToRestore", () => {
    it("uses the original source path when the current restore path is blank and the source is preferred", () => {
        expect(getMovePathToRestore("", "aa", true)).toBe("aa");
    });

    it("keeps a blank current path when it is authoritative", () => {
        expect(getMovePathToRestore("", "aa", false)).toBe("");
    });

    it("falls back to the current path when there is no source path to restore", () => {
        expect(getMovePathToRestore("bb", undefined, true)).toBe("bb");
    });
});

describe("shouldConnectKibitzBoardToGame", () => {
    it("allows only the main board to live-connect", () => {
        expect(shouldConnectKibitzBoardToGame("main", true)).toBe(true);
        expect(shouldConnectKibitzBoardToGame("main", false)).toBe(false);
        expect(shouldConnectKibitzBoardToGame("secondary", true)).toBe(false);
        expect(shouldConnectKibitzBoardToGame("secondary", false)).toBe(false);
    });
});

describe("computeRecenterScale", () => {
    it("keeps coordinate-safe input unscaled", () => {
        expect(
            computeRecenterScale({
                fitMode: "contain",
                coordinateSafeInput: true,
                allowTransientDragScaling: false,
                containerWidth: 374,
                containerHeight: 374,
                metricsWidth: 357,
                metricsHeight: 357,
            }),
        ).toBe(1);
    });

    it("allows temporary contain-scaling during transient drag", () => {
        expect(
            computeRecenterScale({
                fitMode: "contain",
                coordinateSafeInput: true,
                allowTransientDragScaling: true,
                containerWidth: 374,
                containerHeight: 374,
                metricsWidth: 357,
                metricsHeight: 357,
            }),
        ).toBeCloseTo(374 / 357);
    });

    it("still contain-scales non-coordinate-safe boards", () => {
        expect(
            computeRecenterScale({
                fitMode: "contain",
                coordinateSafeInput: false,
                allowTransientDragScaling: false,
                containerWidth: 374,
                containerHeight: 374,
                metricsWidth: 357,
                metricsHeight: 357,
            }),
        ).toBeCloseTo(374 / 357);
    });
});

describe("isKibitzBoardResizeStale", () => {
    it("flags callbacks whose target state changed before they fire", () => {
        expect(
            isKibitzBoardResizeStale({
                scheduledGeneration: 1,
                currentGeneration: 2,
                scheduledControllerEpoch: 1,
                currentControllerEpoch: 2,
                scheduledDisplaySize: 366,
                currentDisplaySize: 369,
                scheduledSize: 366,
                currentSize: 369,
                scheduledContainerWidth: 366,
                scheduledContainerHeight: 366,
                currentContainerWidth: 369,
                currentContainerHeight: 369,
                scheduledFitMode: "contain",
                currentFitMode: "contain",
                scheduledRespectContainerBounds: true,
                currentRespectContainerBounds: true,
            }),
        ).toBe(true);
    });
});

describe("shouldCommitMobileSplitRatioUpdate", () => {
    it("skips repeated clamped divider updates", () => {
        expect(
            shouldCommitMobileSplitRatioUpdate({
                currentRatio: 0.36,
                pendingRatio: 0.3604,
            }),
        ).toBe(false);

        expect(
            shouldCommitMobileSplitRatioUpdate({
                currentRatio: 0.36,
                pendingRatio: 0.37,
            }),
        ).toBe(true);
    });
});

describe("computeTransientDragVisualBoardSize", () => {
    it("derives the visual drag board size from the active pointer target", () => {
        expect(
            computeTransientDragVisualBoardSize({
                shellHeight: 600,
                nextRatio: 0.5,
                boardSlotMaxWidth: 400,
                reservedBoardVerticalSpace: 100,
            }),
        ).toBe(200);
    });
});

describe("computeTransientDragScale", () => {
    it("uses the continuous visual size during live drag", () => {
        expect(computeTransientDragScale(269, 210)).toBeCloseTo(269 / 210);
        expect(computeTransientDragScale(233, 210)).toBeCloseTo(233 / 210);
    });
});

describe("computeMeasuredTransientDragContentSize", () => {
    it("scales measured drag content proportionally from the start window", () => {
        expect(
            computeMeasuredTransientDragContentSize({
                visualSize: 227,
                startWindowSize: 310,
                startContentSize: 294,
            }),
        ).toBeCloseTo(294 * (227 / 310));
    });
});

describe("mobile resize geometry terminology", () => {
    it("maps the current DOM measurements into named geometry fields", () => {
        const shell = describeMobileResizeShellGeometry(390, 640);
        const boardSizingSlot = {
            boardSizingSlotWidth: 382,
            boardSizingSlotHeight: 640,
        };
        const boardSurface = describeBoardSurfaceFromHostRect({
            width: 374,
            height: 382,
        } as Pick<DOMRect, "width" | "height">);
        const gobanContainer = describeGobanContainerFromContainerRect({
            width: 374,
            height: 374,
        } as Pick<DOMRect, "width" | "height">);
        const gobanContent = describeGobanContentFromMetrics({
            width: 360,
            height: 360,
        });
        const divider = describeMobileResizeDividerGeometry({
            dividerRatio: 0.42,
            startDividerRatio: 0.4,
            targetDividerRatio: 0.45,
        });

        expect(
            describeMobileResizeGeometrySnapshot({
                shell,
                boardSizingSlot,
                boardSurface,
                gobanContainer,
                gobanContent,
                divider,
            }),
        ).toEqual({
            shell: {
                shellWidth: 390,
                shellHeight: 640,
            },
            boardSizingSlot: {
                boardSizingSlotWidth: 382,
                boardSizingSlotHeight: 640,
            },
            boardSurface: {
                boardSurfaceWidth: 374,
                boardSurfaceHeight: 382,
            },
            gobanContainer: {
                gobanContainerWidth: 374,
                gobanContainerHeight: 374,
            },
            gobanContent: {
                gobanContentWidth: 360,
                gobanContentHeight: 360,
                gobanContentSize: 360,
            },
            divider: {
                dividerRatio: 0.42,
                startDividerRatio: 0.4,
                targetDividerRatio: 0.45,
            },
        });
    });
});

describe("computeMobileResizeAppliedTarget", () => {
    const smallBoardStableGeometry = {
        measuredAt: 1,
        shell: {
            shellWidth: 394,
            shellHeight: 640,
        },
        boardSizingSlot: {
            boardSizingSlotWidth: 382,
            boardSizingSlotHeight: 640,
        },
        boardSurface: {
            boardSurfaceWidth: 374,
            boardSurfaceHeight: 300,
        },
        gobanContainer: {
            gobanContainerWidth: 300,
            gobanContainerHeight: 300,
            gobanContainerSize: 300,
        },
        gobanContent: {
            gobanContentWidth: 286,
            gobanContentHeight: 286,
            gobanContentSize: 286,
            nativeGobanContentSize: 286,
        },
        divider: {
            dividerRatio: 0.5,
        },
        derived: {
            horizontalInset: 132,
            boardVerticalChrome: 70,
        },
        source: "stable-observer" as const,
    };

    const maxStartStableGeometry = {
        measuredAt: 1,
        shell: {
            shellWidth: 390,
            shellHeight: 640,
        },
        boardSizingSlot: {
            boardSizingSlotWidth: 382,
            boardSizingSlotHeight: 640,
        },
        boardSurface: {
            boardSurfaceWidth: 374,
            boardSurfaceHeight: 382,
        },
        gobanContainer: {
            gobanContainerWidth: 374,
            gobanContainerHeight: 374,
            gobanContainerSize: 374,
        },
        gobanContent: {
            gobanContentWidth: 360,
            gobanContentHeight: 360,
            gobanContentSize: 360,
            nativeGobanContentSize: 360,
        },
        divider: {
            dividerRatio: 0.596875,
        },
        derived: {
            horizontalInset: 8,
            boardVerticalChrome: 8,
        },
        source: "stable-observer" as const,
    };

    it("grows host and container from a smaller board", () => {
        const target = computeMobileResizeAppliedTarget({
            stableGeometry: smallBoardStableGeometry,
            targetDividerRatio: 0.65,
            boardWidth: 19,
            boardHeight: 19,
            showLabels: true,
        });

        expect(target).not.toBeNull();
        expect(target!.boardSurfaceWidth).toBeGreaterThan(0);
        expect(target!.boardSurfaceHeight).toBeGreaterThan(
            smallBoardStableGeometry.boardSurface.boardSurfaceHeight,
        );
        expect(target!.gobanContainerHeight).toBeGreaterThan(
            smallBoardStableGeometry.gobanContainer.gobanContainerHeight,
        );
        expect(target!.gobanContainerWidth).toBeGreaterThan(
            smallBoardStableGeometry.gobanContainer.gobanContainerWidth,
        );
    });

    it("keeps the max-start geometry out of the padding", () => {
        const target = computeMobileResizeAppliedTarget({
            stableGeometry: maxStartStableGeometry,
            targetDividerRatio: maxStartStableGeometry.divider.dividerRatio,
            boardWidth: 19,
            boardHeight: 19,
            showLabels: true,
        });

        expect(target).not.toBeNull();
        expect(target!.boardSurfaceWidth).toBe(374);
        expect(target!.boardSurfaceHeight).toBe(382);
        expect(target!.gobanContainerWidth).toBe(374);
        expect(target!.gobanContainerHeight).toBe(374);
        expect(target!.gobanLeft).toBe(0);
    });

    it("fails closed when stable goban content metrics are missing", () => {
        const target = computeMobileResizeAppliedTarget({
            stableGeometry: {
                ...smallBoardStableGeometry,
                gobanContent: {
                    gobanContentWidth: null,
                    gobanContentHeight: null,
                    gobanContentSize: null,
                    nativeGobanContentSize: null,
                },
            },
            targetDividerRatio: 0.65,
            boardWidth: 19,
            boardHeight: 19,
            showLabels: true,
        });

        expect(target).toBeNull();
    });

    it("uses an explicit baseline goban content size when the stable snapshot lacks one", () => {
        const target = computeMobileResizeAppliedTarget({
            stableGeometry: {
                ...smallBoardStableGeometry,
                gobanContent: {
                    gobanContentWidth: null,
                    gobanContentHeight: null,
                    gobanContentSize: null,
                    nativeGobanContentSize: null,
                },
            },
            targetDividerRatio: 0.65,
            boardWidth: 19,
            boardHeight: 19,
            showLabels: true,
            baselineGobanContentSize: 286,
        });

        expect(target).not.toBeNull();
        expect(target!.transformScale).toBeCloseTo(target!.previewGobanContentSize / 286);
    });
});

describe("computeMobileBoardGeometry", () => {
    it("keeps the board surface rectangular while the goban container remains square", () => {
        const geometry = computeMobileBoardGeometry({
            shellWidth: 394,
            shellHeight: 640,
            boardSizingSlotWidth: 382,
            dividerRatio: 0.609375,
            horizontalInset: 8,
            boardVerticalChrome: 16,
            boardWidth: 18,
            boardHeight: 18,
            showLabels: true,
        });

        expect(geometry.boardSizingSlot).toEqual({
            boardSizingSlotWidth: 382,
            boardSizingSlotHeight: 640,
        });
        expect(geometry.boardSurface).toEqual({
            boardSurfaceWidth: 374,
            boardSurfaceHeight: 390,
        });
        expect(geometry.gobanContainer).toEqual({
            gobanContainerWidth: 374,
            gobanContainerHeight: 374,
            gobanContainerSize: 374,
            gobanContainerLeft: 0,
            gobanContainerTop: 0,
        });
        expect(geometry.gobanContent.predictedNativeGobanContentSize).toBe(360);
    });

    it("grows monotonically from a smaller board without freezing at the start size", () => {
        const smaller = computeMobileBoardGeometry({
            shellWidth: 394,
            shellHeight: 640,
            boardSizingSlotWidth: 382,
            dividerRatio: 0.4,
            horizontalInset: 8,
            boardVerticalChrome: 16,
            boardWidth: 18,
            boardHeight: 18,
            showLabels: true,
        });
        const larger = computeMobileBoardGeometry({
            shellWidth: 394,
            shellHeight: 640,
            boardSizingSlotWidth: 382,
            dividerRatio: 0.55,
            horizontalInset: 8,
            boardVerticalChrome: 16,
            boardWidth: 18,
            boardHeight: 18,
            showLabels: true,
        });

        expect(larger.boardSurface.boardSurfaceWidth).toBe(smaller.boardSurface.boardSurfaceWidth);
        expect(larger.boardSurface.boardSurfaceHeight).toBeGreaterThan(
            smaller.boardSurface.boardSurfaceHeight,
        );
        expect(larger.gobanContainer.gobanContainerSize).toBeGreaterThan(
            smaller.gobanContainer.gobanContainerSize,
        );
    });
});

describe("mobile geometry mismatch classification", () => {
    it("classifies a vertical chrome mismatch", () => {
        const target = {
            geometrySource: "computeMobileBoardGeometry",
            dividerRatio: 0.609375,
            boardSurfaceWidth: 374,
            boardSurfaceHeight: 390,
            gobanContainerWidth: 374,
            gobanContainerHeight: 374,
            previewGobanContentSize: 360,
            predictedNativeGobanContentSize: 360,
            legacyVisualSize: 374,
            legacyFinalWindowSize: 374,
            usingRestingMaxGeometry: false,
            transformScale: 1,
            dragScale: 1,
            gobanLeft: 0,
            gobanTop: 0,
            geometry: computeMobileBoardGeometry({
                shellWidth: 394,
                shellHeight: 640,
                boardSizingSlotWidth: 382,
                dividerRatio: 0.609375,
                horizontalInset: 8,
                boardVerticalChrome: 16,
                boardWidth: 18,
                boardHeight: 18,
                showLabels: true,
            }),
        };
        const actual = {
            measuredAt: 1,
            shell: {
                shellWidth: 394,
                shellHeight: 640,
            },
            boardSurface: {
                boardSurfaceWidth: 374,
                boardSurfaceHeight: 394,
            },
            gobanContainer: {
                gobanContainerWidth: 374,
                gobanContainerHeight: 378,
                gobanContainerSize: 374,
            },
            gobanContent: {
                gobanContentWidth: 360,
                gobanContentHeight: 360,
                gobanContentSize: 360,
                nativeGobanContentSize: 360,
            },
            divider: {
                dividerRatio: 0.609375,
            },
            derived: {
                horizontalInset: 8,
                boardVerticalChrome: 16,
            },
            source: "stable-observer" as const,
        };

        const comparison = compareMobileGeometryToTarget({
            target: target as Parameters<typeof compareMobileGeometryToTarget>[0]["target"],
            actual: actual as Parameters<typeof compareMobileGeometryToTarget>[0]["actual"],
        });

        expect(comparison.mismatchType).toBe("vertical-chrome");
    });

    it("flags a bad helper output that pushes the board into padding", () => {
        const stableGeometry = {
            measuredAt: 1,
            shell: {
                shellWidth: 390,
                shellHeight: 640,
            },
            boardSizingSlot: {
                boardSizingSlotWidth: 382,
                boardSizingSlotHeight: 640,
            },
            boardSurface: {
                boardSurfaceWidth: 374,
                boardSurfaceHeight: 382,
            },
            gobanContainer: {
                gobanContainerWidth: 374,
                gobanContainerHeight: 374,
                gobanContainerSize: 374,
            },
            gobanContent: {
                gobanContentWidth: 360,
                gobanContentHeight: 360,
                gobanContentSize: 360,
                nativeGobanContentSize: 360,
            },
            divider: {
                dividerRatio: 0.596875,
            },
            derived: {
                horizontalInset: 8,
                boardVerticalChrome: 8,
            },
            source: "stable-observer" as const,
        };
        const actual = stableGeometry as Parameters<
            typeof compareMobileGeometryToTarget
        >[0]["actual"];
        const target = {
            geometrySource: "computeMobileBoardGeometry" as const,
            dividerRatio: 0.596875,
            boardSurfaceWidth: 378,
            boardSurfaceHeight: 386,
            gobanContainerWidth: 378,
            gobanContainerHeight: 378,
            previewGobanContentSize: 363,
            predictedNativeGobanContentSize: 363,
            legacyVisualSize: 378,
            legacyFinalWindowSize: 378,
            usingRestingMaxGeometry: false,
            transformScale: 1,
            dragScale: 1,
            gobanLeft: 0,
            gobanTop: 0,
            geometry: computeMobileBoardGeometry({
                shellWidth: 390,
                shellHeight: 640,
                boardSizingSlotWidth: 382,
                dividerRatio: 0.596875,
                horizontalInset: 8,
                boardVerticalChrome: 8,
                boardWidth: 19,
                boardHeight: 19,
                showLabels: true,
            }),
        };

        const comparison = compareMobileGeometryToTarget({
            target,
            actual,
        });

        expect(comparison.matched).toBe(false);
        expect(comparison.mismatchType).not.toBeNull();
    });
});

describe("computeTransientDragReleaseGeometry", () => {
    it("preserves the resting max rect during release from the real max-start runtime inputs", () => {
        expect(
            computeTransientDragReleaseGeometry({
                finalWindowSize: 378,
                lastVisibleWindowSize: 374,
                startWindowWidth: 374,
                startWindowHeight: 378,
                usingRestingMaxGeometry: true,
            }),
        ).toEqual({
            settleWindowWidth: 374,
            settleWindowHeight: 378,
            fromWindowSize: 374,
            toWindowSize: 374,
            preserveRestingRect: true,
        });
    });
});

describe("computeTransientDragReleaseGeometryFromAppliedTarget", () => {
    it("commits the last applied target without remeasuring a new release window", () => {
        expect(
            computeTransientDragReleaseGeometryFromAppliedTarget({
                target: {
                    geometrySource: "computeMobileBoardGeometry",
                    dividerRatio: 0.5,
                    boardSurfaceWidth: 374,
                    boardSurfaceHeight: 382,
                    gobanContainerWidth: 374,
                    gobanContainerHeight: 382,
                    previewGobanContentSize: 360,
                    predictedNativeGobanContentSize: 360,
                    legacyVisualSize: 378,
                    legacyFinalWindowSize: 378,
                    usingRestingMaxGeometry: true,
                    transformScale: 1,
                    dragScale: 1,
                    gobanLeft: 7,
                    gobanTop: 0,
                    geometry: {
                        modelVersion: "phase-6-corrected",
                        shell: {
                            shellWidth: 382,
                            shellHeight: 640,
                        },
                        boardSizingSlot: {
                            boardSizingSlotWidth: 382,
                            boardSizingSlotHeight: 640,
                        },
                        divider: {
                            dividerRatio: 0.5,
                            boardPaneHeight: 320,
                        },
                        boardSurface: {
                            boardSurfaceWidth: 374,
                            boardSurfaceHeight: 382,
                        },
                        gobanContainer: {
                            gobanContainerWidth: 374,
                            gobanContainerHeight: 374,
                            gobanContainerSize: 374,
                            gobanContainerLeft: 0,
                            gobanContainerTop: 0,
                        },
                        gobanContent: {
                            predictedNativeGobanContentSize: 360,
                            previewGobanContentSize: 360,
                            gobanContentLeft: 7,
                            gobanContentTop: 7,
                        },
                    },
                },
                lastVisibleContentSize: 360,
                lastVisibleLeft: 7,
                boardWidth: 19,
                boardHeight: 19,
                showLabels: true,
            }),
        ).toEqual({
            boardSurfaceWidth: 374,
            boardSurfaceHeight: 382,
            gobanContainerWidth: 374,
            gobanContainerHeight: 382,
            finalNativeContentSize: 360,
            fromContentSize: 360,
            toContentSize: 360,
            fromLeft: 7,
            toLeft: 7,
            contentDelta: 0,
            windowDelta: 0,
            targetSource: "last-applied-target",
            boardSurfacePreserved: true,
        });
    });
});

describe("predictNativeGobanContentSize", () => {
    it("predicts the quantized native board size for a labelled 19x19 board", () => {
        expect(
            predictNativeGobanContentSize({
                targetSlotSize: 260,
                boardWidth: 19,
                boardHeight: 19,
                showLabels: true,
            }),
        ).toBe(252);

        expect(
            predictNativeGobanContentSize({
                targetSlotSize: 292,
                boardWidth: 19,
                boardHeight: 19,
                showLabels: true,
            }),
        ).toBe(273);

        expect(
            predictNativeGobanContentSize({
                targetSlotSize: 363,
                boardWidth: 19,
                boardHeight: 19,
                showLabels: true,
            }),
        ).toBe(357);

        expect(
            predictNativeGobanContentSize({
                targetSlotSize: 382,
                boardWidth: 19,
                boardHeight: 19,
                showLabels: true,
            }),
        ).toBe(378);
    });
});

describe("refreshLastOfficialMoveFromTrunk", () => {
    it("updates a stale official move pointer while preserving the current variation node", () => {
        const controller = new GobanController({
            width: 9,
            height: 9,
            players: {
                black: { id: 1, username: "black" },
                white: { id: 2, username: "white" },
            },
            move_tree: {
                x: -1,
                y: -1,
                trunk_next: {
                    x: 3,
                    y: 3,
                    trunk_next: {
                        x: 4,
                        y: 3,
                    },
                    branches: [
                        {
                            x: 3,
                            y: 4,
                        },
                    ],
                },
            },
        });
        const staleOfficialMove = controller.goban.engine.move_tree.trunk_next;
        const trunkTail = staleOfficialMove?.trunk_next;
        const variation = staleOfficialMove?.branches[0];

        if (!staleOfficialMove || !trunkTail || !variation) {
            throw new Error("Expected test move tree to contain trunk and variation nodes");
        }

        controller.goban.engine.jumpTo(variation);
        controller.goban.engine.last_official_move = staleOfficialMove;

        expect(refreshLastOfficialMoveFromTrunk(controller)).toBe(trunkTail);
        expect(controller.goban.engine.last_official_move).toBe(trunkTail);
        expect(controller.goban.engine.cur_move).toBe(variation);
    });
});

describe("restoreToOfficialTail", () => {
    it("jumps the board to the trunk tail and keeps the official pointer there", () => {
        const controller = new GobanController({
            width: 9,
            height: 9,
            players: {
                black: { id: 1, username: "black" },
                white: { id: 2, username: "white" },
            },
            move_tree: {
                x: -1,
                y: -1,
                trunk_next: {
                    x: 3,
                    y: 3,
                    trunk_next: {
                        x: 4,
                        y: 3,
                    },
                    branches: [
                        {
                            x: 3,
                            y: 4,
                        },
                    ],
                },
            },
        });
        const trunkTail = controller.goban.engine.move_tree.trunk_next?.trunk_next;

        if (!trunkTail) {
            throw new Error("Expected test move tree to contain a trunk tail");
        }

        expect(restoreToOfficialTail(controller)).toBe(trunkTail);
        expect(controller.goban.engine.last_official_move).toBe(trunkTail);
        expect(controller.goban.engine.cur_move).toBe(trunkTail);
    });
});

describe("shouldRestoreToOfficialTailForGame", () => {
    it("restores once per game and again only if the board falls back to root", () => {
        expect(shouldRestoreToOfficialTailForGame(0, null, 123)).toBe(true);
        expect(shouldRestoreToOfficialTailForGame(81, null, 123)).toBe(true);
        expect(shouldRestoreToOfficialTailForGame(81, 123, 123)).toBe(false);
        expect(shouldRestoreToOfficialTailForGame(0, 123, 123)).toBe(true);
        expect(shouldRestoreToOfficialTailForGame(81, 123, 456)).toBe(true);
    });
});

describe("shouldRestoreMainBoardToOfficialTail", () => {
    it("restores on a new game, at root, or when the previously-followed live tail advances", () => {
        expect(
            shouldRestoreMainBoardToOfficialTail({
                gameId: 123,
                currentMoveNumber: 0,
                officialTailMoveNumber: 20,
                lastRestored: null,
            }),
        ).toBe(true);

        expect(
            shouldRestoreMainBoardToOfficialTail({
                gameId: 123,
                currentMoveNumber: 20,
                officialTailMoveNumber: 20,
                lastRestored: {
                    gameId: 123,
                    moveNumber: 20,
                    nodeId: 20,
                },
            }),
        ).toBe(false);

        expect(
            shouldRestoreMainBoardToOfficialTail({
                gameId: 123,
                currentMoveNumber: 20,
                officialTailMoveNumber: 21,
                lastRestored: {
                    gameId: 123,
                    moveNumber: 20,
                    nodeId: 20,
                },
            }),
        ).toBe(true);

        expect(
            shouldRestoreMainBoardToOfficialTail({
                gameId: 123,
                currentMoveNumber: 19,
                officialTailMoveNumber: 21,
                lastRestored: {
                    gameId: 123,
                    moveNumber: 20,
                    nodeId: 20,
                },
            }),
        ).toBe(false);
    });
});
