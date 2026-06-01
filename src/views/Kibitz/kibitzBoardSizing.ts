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

export function computeRecenterScale({
    fitMode,
    coordinateSafeInput,
    allowTransientDragScaling = false,
    coordinateSafeInputActiveOverride,
    metricsWidth,
    metricsHeight,
    containerWidth,
    containerHeight,
}: {
    fitMode: "native" | "contain";
    coordinateSafeInput: boolean;
    allowTransientDragScaling?: boolean;
    coordinateSafeInputActiveOverride?: boolean;
    metricsWidth: number;
    metricsHeight: number;
    containerWidth: number;
    containerHeight: number;
}): number {
    const coordinateSafeInputActive =
        coordinateSafeInputActiveOverride ?? (coordinateSafeInput && !allowTransientDragScaling);
    const allowCssTransformScaling = fitMode === "contain" && !coordinateSafeInputActive;

    return allowCssTransformScaling && metricsWidth > 0 && metricsHeight > 0
        ? Math.min(containerWidth / metricsWidth, containerHeight / metricsHeight)
        : 1;
}

export function shouldCommitMobileSplitRatioUpdate({
    currentRatio,
    pendingRatio,
    threshold = 0.001,
}: {
    currentRatio: number;
    pendingRatio: number;
    threshold?: number;
}): boolean {
    return Math.abs(currentRatio - pendingRatio) >= threshold;
}

export function computeTransientDragVisualBoardSize({
    shellHeight,
    nextRatio,
    boardSlotMaxWidth,
    reservedBoardVerticalSpace,
}: {
    shellHeight: number;
    nextRatio: number;
    boardSlotMaxWidth: number;
    reservedBoardVerticalSpace: number;
}): number {
    const topPaneHeight = shellHeight * nextRatio;
    const usableBoardHeight = topPaneHeight - reservedBoardVerticalSpace;

    return Math.max(0, Math.floor(Math.min(boardSlotMaxWidth, usableBoardHeight)));
}

export function computeTransientDragScale(visualSize: number, metricsWidth: number): number {
    if (!Number.isFinite(visualSize) || !Number.isFinite(metricsWidth) || metricsWidth <= 0) {
        return 1;
    }

    return visualSize / metricsWidth;
}

export function computeMeasuredTransientDragContentSize({
    visualSize,
    startWindowSize,
    startContentSize,
}: {
    visualSize: number;
    startWindowSize: number;
    startContentSize: number;
}): number {
    if (
        !Number.isFinite(visualSize) ||
        !Number.isFinite(startWindowSize) ||
        !Number.isFinite(startContentSize) ||
        visualSize <= 0 ||
        startWindowSize <= 0 ||
        startContentSize <= 0
    ) {
        return 0;
    }

    return Math.max(1, startContentSize * (visualSize / startWindowSize));
}

/**
 * Mobile resize geometry terminology:
 *
 * shell:
 *   The mobile layout area used for divider ratio math.
 *
 * board surface:
 *   The actual rectangular host occupied by the board component.
 *   This can be non-square.
 *
 * goban container:
 *   The square internal container in which the Goban element is positioned.
 *
 * goban content:
 *   The actual Goban element/content size, either native or CSS-previewed.
 *
 * Important:
 *   React sizeProp/displaySize and square-fit values are layout inputs/outputs,
 *   not necessarily the same as the measured board surface or Goban content.
 */
export type MobileResizeShellGeometry = {
    shellWidth: number | null;
    shellHeight: number | null;
};

export type MobileResizeBoardSurfaceGeometry = {
    boardSurfaceWidth: number | null;
    boardSurfaceHeight: number | null;
};

export type MobileResizeGobanContainerGeometry = {
    gobanContainerWidth: number | null;
    gobanContainerHeight: number | null;
};

export type MobileResizeGobanContentGeometry = {
    gobanContentWidth: number | null;
    gobanContentHeight: number | null;
    gobanContentSize: number | null;
};

export type MobileResizeDividerGeometry = {
    dividerRatio?: number | null;
    startDividerRatio?: number | null;
    targetDividerRatio?: number | null;
};

export type MobileResizeGeometrySnapshot = {
    shell?: MobileResizeShellGeometry;
    boardSizingSlot?: {
        boardSizingSlotWidth: number | null;
        boardSizingSlotHeight: number | null;
    };
    boardSurface: MobileResizeBoardSurfaceGeometry;
    gobanContainer: MobileResizeGobanContainerGeometry;
    gobanContent: MobileResizeGobanContentGeometry;
    divider?: MobileResizeDividerGeometry;
};

export type StableMobileBoardGeometrySnapshot = {
    measuredAt: number;
    shell: {
        shellWidth: number;
        shellHeight: number;
    };
    boardSizingSlot?: {
        boardSizingSlotWidth: number;
        boardSizingSlotHeight: number;
    };
    boardSurface: {
        boardSurfaceWidth: number;
        boardSurfaceHeight: number;
    };
    gobanContainer: {
        gobanContainerWidth: number;
        gobanContainerHeight: number;
        gobanContainerSize: number;
    };
    gobanContent: {
        gobanContentWidth: number | null;
        gobanContentHeight: number | null;
        gobanContentSize: number | null;
        nativeGobanContentSize: number | null;
    };
    divider: {
        dividerRatio: number;
    };
    derived: {
        horizontalInset: number;
        boardVerticalChrome: number;
    };
    source: "stable-observer" | "initial-capture" | "post-settle";
};

export type MobileResizeLifecycleState =
    | "idle"
    | "armed"
    | "active"
    | "release-settle"
    | "native-handoff"
    | "final-clear";

export function shouldAcceptStableMobileGeometryMeasurement({
    lifecycleState,
    snapshot,
}: {
    lifecycleState: MobileResizeLifecycleState;
    snapshot: StableMobileBoardGeometrySnapshot | null;
}): boolean {
    if (lifecycleState !== "idle") {
        return false;
    }

    if (!snapshot) {
        return false;
    }

    const { shell, boardSurface, gobanContainer } = snapshot;
    return (
        shell.shellWidth > 0 &&
        shell.shellHeight > 0 &&
        boardSurface.boardSurfaceWidth > 0 &&
        boardSurface.boardSurfaceHeight > 0 &&
        gobanContainer.gobanContainerWidth > 0 &&
        gobanContainer.gobanContainerHeight > 0
    );
}

export type MobileGeometryMismatchType =
    | "horizontal-inset"
    | "vertical-chrome"
    | "surface-container-confusion"
    | "content-prediction"
    | "wrong-shell-basis"
    | "unknown"
    | null;

export function compareMobileGeometryToTarget({
    target,
    actual,
    tolerancePx = 1.5,
}: {
    target: MobileResizeAppliedTarget | null;
    actual: StableMobileBoardGeometrySnapshot | null;
    tolerancePx?: number;
}): {
    matched: boolean;
    maxDeltaPx: number;
    mismatchType: MobileGeometryMismatchType;
    deltas: {
        boardSurfaceWidth: number | null;
        boardSurfaceHeight: number | null;
        gobanContainerWidth: number | null;
        gobanContainerHeight: number | null;
        gobanContentSize: number | null;
    };
} {
    if (!target || !actual) {
        return {
            matched: false,
            maxDeltaPx: Number.POSITIVE_INFINITY,
            mismatchType: null,
            deltas: {
                boardSurfaceWidth: null,
                boardSurfaceHeight: null,
                gobanContainerWidth: null,
                gobanContainerHeight: null,
                gobanContentSize: null,
            },
        };
    }

    const boardSurfaceWidthDelta = Math.abs(
        actual.boardSurface.boardSurfaceWidth - target.boardSurfaceWidth,
    );
    const boardSurfaceHeightDelta = Math.abs(
        actual.boardSurface.boardSurfaceHeight - target.boardSurfaceHeight,
    );
    const gobanContainerWidthDelta = Math.abs(
        actual.gobanContainer.gobanContainerWidth - target.gobanContainerWidth,
    );
    const gobanContainerHeightDelta = Math.abs(
        actual.gobanContainer.gobanContainerHeight - target.gobanContainerHeight,
    );
    const gobanContentSizeDelta =
        actual.gobanContent.nativeGobanContentSize != null
            ? Math.abs(actual.gobanContent.nativeGobanContentSize - target.previewGobanContentSize)
            : null;
    const maxDeltaPx = Math.max(
        boardSurfaceWidthDelta,
        boardSurfaceHeightDelta,
        gobanContainerWidthDelta,
        gobanContainerHeightDelta,
        gobanContentSizeDelta ?? 0,
    );
    const mismatchType = classifyMobileGeometryMismatch({
        target,
        actual,
        tolerancePx,
        deltas: {
            boardSurfaceWidth: boardSurfaceWidthDelta,
            boardSurfaceHeight: boardSurfaceHeightDelta,
            gobanContainerWidth: gobanContainerWidthDelta,
            gobanContainerHeight: gobanContainerHeightDelta,
            gobanContentSize: gobanContentSizeDelta,
        },
    });

    return {
        matched: maxDeltaPx <= tolerancePx,
        maxDeltaPx,
        mismatchType,
        deltas: {
            boardSurfaceWidth: boardSurfaceWidthDelta,
            boardSurfaceHeight: boardSurfaceHeightDelta,
            gobanContainerWidth: gobanContainerWidthDelta,
            gobanContainerHeight: gobanContainerHeightDelta,
            gobanContentSize: gobanContentSizeDelta,
        },
    };
}

export function classifyMobileGeometryMismatch({
    target,
    actual,
    tolerancePx = 1.5,
    deltas,
}: {
    target: MobileResizeAppliedTarget | null;
    actual: StableMobileBoardGeometrySnapshot | null;
    tolerancePx?: number;
    deltas?: {
        boardSurfaceWidth: number | null;
        boardSurfaceHeight: number | null;
        gobanContainerWidth: number | null;
        gobanContainerHeight: number | null;
        gobanContentSize: number | null;
    };
}): MobileGeometryMismatchType {
    if (!target || !actual) {
        return null;
    }

    const boardSurfaceWidthDelta =
        deltas?.boardSurfaceWidth ??
        Math.abs(actual.boardSurface.boardSurfaceWidth - target.boardSurfaceWidth);
    const boardSurfaceHeightDelta =
        deltas?.boardSurfaceHeight ??
        Math.abs(actual.boardSurface.boardSurfaceHeight - target.boardSurfaceHeight);
    const gobanContainerWidthDelta =
        deltas?.gobanContainerWidth ??
        Math.abs(actual.gobanContainer.gobanContainerWidth - target.gobanContainerWidth);
    const gobanContainerHeightDelta =
        deltas?.gobanContainerHeight ??
        Math.abs(actual.gobanContainer.gobanContainerHeight - target.gobanContainerHeight);
    const gobanContentSizeDelta =
        deltas?.gobanContentSize ??
        (actual.gobanContent.nativeGobanContentSize != null
            ? Math.abs(actual.gobanContent.nativeGobanContentSize - target.previewGobanContentSize)
            : null);

    if (
        boardSurfaceWidthDelta <= tolerancePx &&
        boardSurfaceHeightDelta <= tolerancePx &&
        gobanContainerWidthDelta <= tolerancePx &&
        gobanContainerHeightDelta <= tolerancePx
    ) {
        return gobanContentSizeDelta != null && gobanContentSizeDelta > tolerancePx
            ? "content-prediction"
            : null;
    }

    if (
        boardSurfaceWidthDelta > tolerancePx &&
        boardSurfaceHeightDelta <= tolerancePx &&
        gobanContainerWidthDelta > tolerancePx &&
        gobanContainerHeightDelta <= tolerancePx
    ) {
        return "horizontal-inset";
    }

    if (
        boardSurfaceHeightDelta > tolerancePx &&
        boardSurfaceWidthDelta <= tolerancePx &&
        gobanContainerHeightDelta > tolerancePx &&
        gobanContainerWidthDelta <= tolerancePx
    ) {
        return "vertical-chrome";
    }

    if (
        boardSurfaceWidthDelta > tolerancePx &&
        boardSurfaceHeightDelta > tolerancePx &&
        gobanContainerWidthDelta > tolerancePx &&
        gobanContainerHeightDelta > tolerancePx &&
        Math.abs(boardSurfaceWidthDelta - gobanContainerWidthDelta) <= tolerancePx &&
        Math.abs(boardSurfaceHeightDelta - gobanContainerHeightDelta) <= tolerancePx
    ) {
        return "surface-container-confusion";
    }

    if (
        boardSurfaceWidthDelta > tolerancePx &&
        boardSurfaceHeightDelta > tolerancePx &&
        actual.shell.shellWidth > target.boardSurfaceWidth + tolerancePx
    ) {
        return "wrong-shell-basis";
    }

    if (gobanContentSizeDelta != null && gobanContentSizeDelta > tolerancePx) {
        return "content-prediction";
    }

    return "unknown";
}

export function describeBoardSurfaceFromHostRect(
    rect: Pick<DOMRect, "width" | "height"> | null,
): MobileResizeBoardSurfaceGeometry {
    return {
        boardSurfaceWidth: rect?.width ?? null,
        boardSurfaceHeight: rect?.height ?? null,
    };
}

export function describeGobanContainerFromContainerRect(
    rect: Pick<DOMRect, "width" | "height"> | null,
): MobileResizeGobanContainerGeometry {
    return {
        gobanContainerWidth: rect?.width ?? null,
        gobanContainerHeight: rect?.height ?? null,
    };
}

export function describeGobanContentFromMetrics(
    metrics: {
        width: number;
        height: number;
    } | null,
): MobileResizeGobanContentGeometry {
    const gobanContentWidth = metrics?.width ?? null;
    const gobanContentHeight = metrics?.height ?? null;
    const gobanContentSize =
        metrics != null && Math.abs(metrics.width - metrics.height) <= 1 ? metrics.width : null;

    return {
        gobanContentWidth,
        gobanContentHeight,
        gobanContentSize,
    };
}

export function describeMobileResizeShellGeometry(
    shellWidth: number | null,
    shellHeight: number | null,
): MobileResizeShellGeometry {
    return {
        shellWidth,
        shellHeight,
    };
}

export function describeMobileResizeDividerGeometry({
    dividerRatio,
    startDividerRatio,
    targetDividerRatio,
}: MobileResizeDividerGeometry): MobileResizeDividerGeometry {
    return {
        dividerRatio,
        startDividerRatio,
        targetDividerRatio,
    };
}

export function describeMobileResizeGeometrySnapshot({
    shell,
    boardSizingSlot,
    boardSurface,
    gobanContainer,
    gobanContent,
    divider,
}: {
    shell?: MobileResizeShellGeometry;
    boardSizingSlot?: {
        boardSizingSlotWidth: number | null;
        boardSizingSlotHeight: number | null;
    };
    boardSurface: MobileResizeBoardSurfaceGeometry;
    gobanContainer: MobileResizeGobanContainerGeometry;
    gobanContent: MobileResizeGobanContentGeometry;
    divider?: MobileResizeDividerGeometry;
}): MobileResizeGeometrySnapshot {
    return {
        shell,
        boardSizingSlot,
        boardSurface,
        gobanContainer,
        gobanContent,
        divider,
    };
}

export interface TransientDragGeometryInput {
    visualSize: number;
    startWindowWidth: number;
    startWindowHeight: number;
    startWindowSize: number;
    startContentSize: number;
    metricsWidth: number;
    startedAtHorizontalMax: boolean;
    transientBoardWindowMaxSize: number | null;
}

export interface TransientDragGeometry {
    hostWidth: number;
    hostHeight: number;
    containerWidth: number;
    containerHeight: number;
    contentSize: number;
    transformScale: number;
    gobanLeft: number;
    gobanTop: number;
    dragScale: number;
    usingRestingMaxGeometry: boolean;
}

export interface MobileBoardGeometryInput {
    shellWidth: number;
    shellHeight: number;
    dividerRatio: number;
    boardSizingSlotWidth?: number;
    boardSizingSlotHeight?: number;
    horizontalInset: number;
    boardVerticalChrome: number;
    minBoardPaneHeight?: number;
    maxBoardPaneHeight?: number;
    minGobanContainerSize?: number;
    devicePixelRatio?: number;
    boardWidth?: number;
    boardHeight?: number;
    showLabels?: boolean;
}

export interface MobileBoardGeometry {
    modelVersion: "phase-6-corrected";
    shell: {
        shellWidth: number;
        shellHeight: number;
    };
    boardSizingSlot: {
        boardSizingSlotWidth: number;
        boardSizingSlotHeight: number;
    };
    divider: {
        dividerRatio: number;
        boardPaneHeight: number;
    };
    boardSurface: {
        boardSurfaceWidth: number;
        boardSurfaceHeight: number;
    };
    gobanContainer: {
        gobanContainerWidth: number;
        gobanContainerHeight: number;
        gobanContainerSize: number;
        gobanContainerLeft: number;
        gobanContainerTop: number;
    };
    gobanContent: {
        predictedNativeGobanContentSize: number;
        previewGobanContentSize: number;
        gobanContentLeft: number;
        gobanContentTop: number;
    };
}

function clampMobileRatio(value: number): number {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.max(0, Math.min(1, value));
}

export function computeMobileBoardGeometry({
    shellWidth,
    shellHeight,
    dividerRatio,
    boardSizingSlotWidth,
    boardSizingSlotHeight,
    horizontalInset,
    boardVerticalChrome,
    minBoardPaneHeight = 0,
    maxBoardPaneHeight = shellHeight,
    minGobanContainerSize = 0,
    devicePixelRatio: _devicePixelRatio,
    boardWidth = 19,
    boardHeight = 19,
    showLabels = false,
}: MobileBoardGeometryInput): MobileBoardGeometry {
    const safeShellWidth = Math.max(0, shellWidth);
    const safeShellHeight = Math.max(0, shellHeight);
    const safeBoardSizingSlotWidth = Math.max(
        0,
        Math.floor(boardSizingSlotWidth ?? safeShellWidth),
    );
    const safeBoardSizingSlotHeight = Math.max(
        0,
        Math.floor(boardSizingSlotHeight ?? safeShellHeight),
    );
    const safeDividerRatio = clampMobileRatio(dividerRatio);
    const safeHorizontalInset = Math.max(0, horizontalInset);
    const safeBoardVerticalChrome = Math.max(0, boardVerticalChrome);
    const boardPaneHeight = Math.max(
        0,
        Math.floor(
            Math.max(
                minBoardPaneHeight,
                Math.min(maxBoardPaneHeight, safeShellHeight * safeDividerRatio),
            ),
        ),
    );
    const boardSurfaceWidth = Math.max(
        0,
        Math.floor(safeBoardSizingSlotWidth - safeHorizontalInset),
    );
    const boardSurfaceHeight = boardPaneHeight;
    const availableContainerHeight = Math.max(0, boardSurfaceHeight - safeBoardVerticalChrome);
    const gobanContainerSize = Math.max(
        minGobanContainerSize,
        Math.floor(Math.min(boardSurfaceWidth, availableContainerHeight)),
    );
    const predictedNativeGobanContentSize = predictNativeGobanContentSize({
        targetSlotSize: gobanContainerSize,
        boardWidth,
        boardHeight,
        showLabels,
    });
    const previewGobanContentSize = predictedNativeGobanContentSize;
    const gobanContainerLeft = Math.max(
        0,
        Math.floor((boardSurfaceWidth - gobanContainerSize) / 2),
    );
    const gobanContentLeft = Math.max(
        0,
        Math.floor((gobanContainerSize - previewGobanContentSize) / 2),
    );

    return {
        modelVersion: "phase-6-corrected",
        shell: {
            shellWidth: safeShellWidth,
            shellHeight: safeShellHeight,
        },
        boardSizingSlot: {
            boardSizingSlotWidth: safeBoardSizingSlotWidth,
            boardSizingSlotHeight: safeBoardSizingSlotHeight,
        },
        divider: {
            dividerRatio: safeDividerRatio,
            boardPaneHeight,
        },
        boardSurface: {
            boardSurfaceWidth,
            boardSurfaceHeight,
        },
        gobanContainer: {
            gobanContainerWidth: gobanContainerSize,
            gobanContainerHeight: gobanContainerSize,
            gobanContainerSize,
            gobanContainerLeft,
            gobanContainerTop: 0,
        },
        gobanContent: {
            predictedNativeGobanContentSize,
            previewGobanContentSize,
            gobanContentLeft,
            gobanContentTop: gobanContentLeft,
        },
    };
}

export interface MobileResizeAppliedTarget {
    geometrySource: "computeMobileBoardGeometry";
    dividerRatio: number;
    boardSurfaceWidth: number;
    boardSurfaceHeight: number;
    gobanContainerWidth: number;
    gobanContainerHeight: number;
    previewGobanContentSize: number;
    predictedNativeGobanContentSize: number | null;
    legacyVisualSize: number;
    legacyFinalWindowSize: number | null;
    usingRestingMaxGeometry: boolean;
    transformScale: number;
    dragScale: number;
    gobanLeft: number;
    gobanTop: number;
    geometry: MobileBoardGeometry;
}

export interface MobileResizeAppliedTargetInput {
    stableGeometry: StableMobileBoardGeometrySnapshot;
    targetDividerRatio: number;
    boardWidth: number;
    boardHeight: number;
    showLabels: boolean;
}

export function computeMobileResizeAppliedTarget({
    stableGeometry,
    targetDividerRatio,
    boardWidth,
    boardHeight,
    showLabels,
}: MobileResizeAppliedTargetInput): MobileResizeAppliedTarget {
    const boardSizingSlotWidth =
        stableGeometry.boardSizingSlot?.boardSizingSlotWidth ?? stableGeometry.shell.shellWidth;
    const boardSizingSlotHeight =
        stableGeometry.boardSizingSlot?.boardSizingSlotHeight ?? stableGeometry.shell.shellHeight;
    const boardSurfaceWidth = stableGeometry.boardSurface.boardSurfaceWidth;
    const boardVerticalChrome = Math.max(
        0,
        stableGeometry.boardSurface.boardSurfaceHeight -
            stableGeometry.gobanContainer.gobanContainerHeight,
    );
    const horizontalInset = Math.max(0, boardSizingSlotWidth - boardSurfaceWidth);
    const stableMetricsWidth =
        stableGeometry.gobanContent.nativeGobanContentSize ??
        stableGeometry.gobanContent.gobanContentSize ??
        1;
    const geometry = computeMobileBoardGeometry({
        shellWidth: stableGeometry.shell.shellWidth,
        shellHeight: stableGeometry.shell.shellHeight,
        dividerRatio: targetDividerRatio,
        boardSizingSlotWidth,
        boardSizingSlotHeight,
        horizontalInset,
        boardVerticalChrome,
        minBoardPaneHeight: 0,
        maxBoardPaneHeight: stableGeometry.shell.shellHeight,
        minGobanContainerSize: 0,
        devicePixelRatio: 1,
        boardWidth,
        boardHeight,
        showLabels,
    });

    return {
        geometrySource: "computeMobileBoardGeometry",
        dividerRatio: geometry.divider.dividerRatio,
        boardSurfaceWidth: geometry.boardSurface.boardSurfaceWidth,
        boardSurfaceHeight: geometry.boardSurface.boardSurfaceHeight,
        gobanContainerWidth: geometry.gobanContainer.gobanContainerWidth,
        gobanContainerHeight: geometry.gobanContainer.gobanContainerHeight,
        previewGobanContentSize: geometry.gobanContent.previewGobanContentSize,
        predictedNativeGobanContentSize: geometry.gobanContent.predictedNativeGobanContentSize,
        legacyVisualSize: geometry.gobanContainer.gobanContainerSize,
        legacyFinalWindowSize: geometry.gobanContainer.gobanContainerWidth,
        usingRestingMaxGeometry: false,
        transformScale:
            geometry.gobanContent.previewGobanContentSize / Math.max(1, stableMetricsWidth),
        dragScale: geometry.boardSurface.boardSurfaceWidth / Math.max(1, boardSizingSlotWidth),
        gobanLeft: geometry.gobanContainer.gobanContainerLeft,
        gobanTop: geometry.gobanContainer.gobanContainerTop,
        geometry,
    };
}

/**
 * Compatibility adapter only.
 * Authoritative mobile resize geometry comes from computeMobileBoardGeometry(...).
 * Keep this helper stable for legacy tests, but do not route new behavior through it.
 */
export function computeTransientDragGeometry({
    visualSize,
    startWindowWidth,
    startWindowHeight,
    startWindowSize,
    startContentSize,
    metricsWidth,
    startedAtHorizontalMax,
    transientBoardWindowMaxSize,
}: TransientDragGeometryInput): TransientDragGeometry {
    const isTallRestingHost = startWindowHeight > startWindowWidth;
    const isNearMaxRestingHost =
        transientBoardWindowMaxSize != null &&
        isTallRestingHost &&
        startWindowWidth >= transientBoardWindowMaxSize - 4;
    const usingRestingMaxGeometry =
        Boolean(
            startedAtHorizontalMax &&
            transientBoardWindowMaxSize != null &&
            visualSize >= transientBoardWindowMaxSize,
        ) || Boolean(isNearMaxRestingHost && visualSize >= transientBoardWindowMaxSize);
    const hostWidth = usingRestingMaxGeometry ? startWindowWidth : visualSize;
    const hostHeight = usingRestingMaxGeometry
        ? startWindowHeight
        : visualSize + Math.max(0, startWindowHeight - startWindowWidth);
    const containerWidth = usingRestingMaxGeometry ? startWindowWidth : visualSize;
    const containerHeight = usingRestingMaxGeometry ? startWindowHeight : visualSize;
    const contentSize = usingRestingMaxGeometry
        ? startContentSize
        : computeMeasuredTransientDragContentSize({
              visualSize,
              startWindowSize,
              startContentSize,
          });
    const transformScale = usingRestingMaxGeometry
        ? 1
        : computeTransientDragScale(contentSize, metricsWidth);
    const gobanLeft = Math.max(0, Math.floor((hostWidth - contentSize) / 2));

    return {
        hostWidth,
        hostHeight,
        containerWidth,
        containerHeight,
        contentSize,
        transformScale,
        gobanLeft,
        gobanTop: 0,
        dragScale: hostWidth / startWindowSize,
        usingRestingMaxGeometry,
    };
}

export interface TransientDragReleaseGeometryFromAppliedTargetInput {
    target: MobileResizeAppliedTarget;
    lastVisibleContentSize: number;
    lastVisibleLeft: number;
    boardWidth: number;
    boardHeight: number;
    showLabels: boolean;
}

export interface TransientDragReleaseGeometryFromAppliedTarget {
    boardSurfaceWidth: number;
    boardSurfaceHeight: number;
    gobanContainerWidth: number;
    gobanContainerHeight: number;
    finalNativeContentSize: number;
    fromContentSize: number;
    toContentSize: number;
    fromLeft: number;
    toLeft: number;
    contentDelta: number;
    windowDelta: number;
    targetSource: "last-applied-target";
    boardSurfacePreserved: true;
}

export function computeTransientDragReleaseGeometryFromAppliedTarget({
    target,
    lastVisibleContentSize,
    lastVisibleLeft,
    boardWidth,
    boardHeight,
    showLabels,
}: TransientDragReleaseGeometryFromAppliedTargetInput): TransientDragReleaseGeometryFromAppliedTarget {
    const finalNativeContentSize =
        target.predictedNativeGobanContentSize ??
        predictNativeGobanContentSize({
            targetSlotSize: target.gobanContainerWidth,
            boardWidth,
            boardHeight,
            showLabels,
        });
    const toLeft = Math.max(
        0,
        Math.floor((target.gobanContainerWidth - finalNativeContentSize) / 2),
    );
    const contentDelta = Math.abs(finalNativeContentSize - lastVisibleContentSize);

    return {
        boardSurfaceWidth: target.boardSurfaceWidth,
        boardSurfaceHeight: target.boardSurfaceHeight,
        gobanContainerWidth: target.gobanContainerWidth,
        gobanContainerHeight: target.gobanContainerHeight,
        finalNativeContentSize,
        fromContentSize: lastVisibleContentSize,
        toContentSize: finalNativeContentSize,
        fromLeft: lastVisibleLeft,
        toLeft,
        contentDelta,
        windowDelta: 0,
        targetSource: "last-applied-target",
        boardSurfacePreserved: true,
    };
}

export interface TransientDragReleaseGeometryInput {
    finalWindowSize: number;
    lastVisibleWindowSize: number;
    startWindowWidth: number | null;
    startWindowHeight: number | null;
    usingRestingMaxGeometry: boolean;
}

export interface TransientDragReleaseGeometry {
    settleWindowWidth: number;
    settleWindowHeight: number;
    fromWindowSize: number;
    toWindowSize: number;
    preserveRestingRect: boolean;
}

export function computeTransientDragReleaseGeometry({
    finalWindowSize,
    lastVisibleWindowSize,
    startWindowWidth,
    startWindowHeight,
    usingRestingMaxGeometry,
}: TransientDragReleaseGeometryInput): TransientDragReleaseGeometry {
    const preserveRestingRect =
        usingRestingMaxGeometry &&
        Number.isFinite(startWindowWidth) &&
        Number.isFinite(startWindowHeight) &&
        (startWindowWidth ?? 0) > 0 &&
        (startWindowHeight ?? 0) > 0;
    const settleWindowWidth = preserveRestingRect
        ? (startWindowWidth ?? finalWindowSize)
        : finalWindowSize;
    const settleWindowHeight = preserveRestingRect
        ? (startWindowHeight ?? finalWindowSize)
        : finalWindowSize;
    const fromWindowSize = preserveRestingRect ? settleWindowWidth : lastVisibleWindowSize;
    const toWindowSize = preserveRestingRect ? settleWindowWidth : finalWindowSize;

    return {
        settleWindowWidth,
        settleWindowHeight,
        fromWindowSize,
        toWindowSize,
        preserveRestingRect,
    };
}

export function predictNativeGobanContentSize({
    targetSlotSize,
    boardWidth,
    boardHeight,
    showLabels,
}: {
    targetSlotSize: number;
    boardWidth: number;
    boardHeight: number;
    showLabels: boolean;
}): number {
    const boardUnits = Math.max(boardWidth, boardHeight);
    const labelUnits = showLabels ? 2 : 0;
    const metricUnits = boardUnits + labelUnits;

    if (!Number.isFinite(targetSlotSize) || targetSlotSize <= 0 || metricUnits <= 0) {
        return 0;
    }

    return Math.max(metricUnits, Math.floor(targetSlotSize / metricUnits) * metricUnits);
}

export interface SquareFitLayoutMetrics {
    slotWidth: number;
    slotHeight: number;
    parentClientHeight: number;
    reservedHeight: number;
    visibleChildrenCount: number;
    rowGap: number;
    fallbackHeight: number;
    usableHeight: number;
    nextSize: number;
}

export function computeSquareFitSizeFromMetrics({
    slotWidth,
    slotHeight,
    parentClientHeight,
    reservedHeight,
    visibleChildrenCount,
    rowGap,
    constrainToParentHeight,
}: {
    slotWidth: number;
    slotHeight: number;
    parentClientHeight: number;
    reservedHeight: number;
    visibleChildrenCount: number;
    rowGap: number;
    constrainToParentHeight: boolean;
}): SquareFitLayoutMetrics {
    const fallbackHeight = Math.max(
        0,
        parentClientHeight - reservedHeight - rowGap * Math.max(0, visibleChildrenCount - 1),
    );
    const usableHeight = constrainToParentHeight
        ? fallbackHeight > 0
            ? Math.min(slotHeight || fallbackHeight, fallbackHeight)
            : slotHeight
        : Math.max(slotHeight, fallbackHeight);
    const nextSize = Math.max(0, Math.floor(Math.min(slotWidth, usableHeight)));

    return {
        slotWidth,
        slotHeight,
        parentClientHeight,
        reservedHeight,
        visibleChildrenCount,
        rowGap,
        fallbackHeight,
        usableHeight,
        nextSize,
    };
}

export function measureSquareFitLayout(
    element: HTMLElement,
    constrainToParentHeight: boolean,
): SquareFitLayoutMetrics {
    const parent = element.parentElement;
    const parentStyle = parent ? window.getComputedStyle(parent) : null;
    const rowGap = Number.parseFloat(parentStyle?.rowGap ?? parentStyle?.gap ?? "0") || 0;
    const visibleChildren = parent
        ? Array.from(parent.children).filter(
              (child): child is HTMLElement =>
                  child instanceof HTMLElement && child.offsetParent !== null,
          )
        : [];
    const reservedHeight = visibleChildren.reduce((total, child) => {
        if (child === element || child.classList.contains("board-content-spacer")) {
            return total;
        }

        return total + child.getBoundingClientRect().height;
    }, 0);
    const slotRect = element.getBoundingClientRect();
    const slotWidth = Math.floor(slotRect.width || element.clientWidth || 0);
    const slotHeight = Math.floor(slotRect.height || element.clientHeight || 0);

    return computeSquareFitSizeFromMetrics({
        slotWidth,
        slotHeight,
        parentClientHeight: parent?.clientHeight ?? 0,
        reservedHeight,
        visibleChildrenCount: visibleChildren.length,
        rowGap,
        constrainToParentHeight,
    });
}

export function isKibitzBoardResizeStale({
    scheduledGeneration,
    currentGeneration,
    scheduledControllerEpoch,
    currentControllerEpoch,
    scheduledDisplaySize,
    currentDisplaySize,
    scheduledSize,
    currentSize,
    scheduledContainerWidth,
    scheduledContainerHeight,
    currentContainerWidth,
    currentContainerHeight,
    scheduledFitMode,
    currentFitMode,
    scheduledRespectContainerBounds,
    currentRespectContainerBounds,
}: {
    scheduledGeneration: number;
    currentGeneration: number;
    scheduledControllerEpoch: number;
    currentControllerEpoch: number;
    scheduledDisplaySize: number | null;
    currentDisplaySize: number | null;
    scheduledSize: number | null;
    currentSize: number | null;
    scheduledContainerWidth: number;
    scheduledContainerHeight: number;
    currentContainerWidth: number | null;
    currentContainerHeight: number | null;
    scheduledFitMode: "native" | "contain";
    currentFitMode: "native" | "contain";
    scheduledRespectContainerBounds: boolean;
    currentRespectContainerBounds: boolean;
}): boolean {
    if (
        scheduledGeneration !== currentGeneration ||
        scheduledControllerEpoch !== currentControllerEpoch ||
        currentContainerWidth == null ||
        currentContainerHeight == null ||
        Math.abs(currentContainerWidth - scheduledContainerWidth) > 1 ||
        Math.abs(currentContainerHeight - scheduledContainerHeight) > 1 ||
        scheduledDisplaySize !== currentDisplaySize ||
        scheduledSize !== currentSize ||
        scheduledFitMode !== currentFitMode ||
        scheduledRespectContainerBounds !== currentRespectContainerBounds
    ) {
        return true;
    }

    return false;
}
