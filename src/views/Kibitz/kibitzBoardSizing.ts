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

export function clampTransientPreviewGap(value: number): number {
    return Math.max(2, Math.min(20, value));
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
