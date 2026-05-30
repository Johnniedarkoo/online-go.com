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
    metricsWidth,
    metricsHeight,
    containerWidth,
    containerHeight,
}: {
    fitMode: "native" | "contain";
    coordinateSafeInput: boolean;
    allowTransientDragScaling?: boolean;
    metricsWidth: number;
    metricsHeight: number;
    containerWidth: number;
    containerHeight: number;
}): number {
    const coordinateSafeInputActive = coordinateSafeInput && !allowTransientDragScaling;
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
