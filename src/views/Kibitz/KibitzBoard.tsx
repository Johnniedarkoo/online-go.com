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

import * as React from "react";
import { GobanRendererConfig, type MoveTree, type MoveTreeJson } from "goban";
import { OgsResizeDetector } from "@/components/OgsResizeDetector";
import { PersistentElement } from "@/components/PersistentElement";
import { GobanController, getMoveTreeTrunkTail } from "@/lib/GobanController";
import * as preferences from "@/lib/preferences";
import {
    getKibitzElementMetrics,
    isKibitzBoardSizeDebugEnabled,
    recordKibitzBoardSizeEvent,
} from "./kibitzBoardSizeDebug";
import {
    computeMeasuredTransientDragContentSize,
    computeRecenterScale,
    computeTransientDragScale,
    isKibitzBoardResizeStale,
    predictNativeGobanContentSize,
} from "./kibitzBoardSizing";
import { logKibitzVariationDebug, summarizeKibitzMoveTreeNode } from "./kibitzVariationDebug";
import "./KibitzBoard.css";

const TRANSIENT_DRAG_RELEASE_SETTLE_MS = 300;

declare global {
    interface Window {
        __kibitzLifecycleRing?: Array<Record<string, unknown>>;
        __kibitzBoardSizeRing?: Array<Record<string, unknown>>;
    }
}

interface KibitzBoardProps {
    role?: "main" | "secondary" | "variation" | "preview";
    gameId?: number;
    currentRoomGameId?: number | null;
    isMobile?: boolean;
    connectToGame?: boolean;
    width?: number;
    height?: number;
    className?: string;
    size?: number;
    interactive?: boolean;
    showLabels?: boolean;
    fitMode?: "native" | "contain";
    respectContainerBounds?: boolean;
    moveTree?: MoveTreeJson;
    movePath?: string;
    restoreToOfficialTailOnLoad?: boolean;
    coordinateSafeInput?: boolean;
    allowTransientDragScaling?: boolean;
    onTransientDragControllerChange?: (
        controller: KibitzBoardTransientDragController | null,
    ) => void;
    onReady?: (controller: GobanController | null) => void;
}

export interface KibitzBoardTransientDragController {
    beginTransientDrag: (windowMaxSizeHint?: number | null) => {
        metricsWidth: number | null;
        metricsHeight: number | null;
    };
    applyTransientDragVisualSize: (visualSize: number) => void;
    finishTransientDrag: (finalSizeHint: number) => void;
}

function setTransientSquareSize(element: HTMLElement | null, visualSize: number): void {
    if (!element) {
        return;
    }

    const value = `${visualSize}px`;
    element.style.width = value;
    element.style.height = value;
    element.style.minWidth = value;
    element.style.minHeight = value;
    element.style.maxWidth = value;
    element.style.maxHeight = value;
}

function recordKibitzLifecycleEvent(message: string, details: Record<string, unknown> = {}): void {
    if (typeof window === "undefined") {
        return;
    }

    const ring = window.__kibitzLifecycleRing ?? [];
    ring.push({
        sequence: ring.length > 0 ? Number(ring[ring.length - 1]?.sequence ?? 0) + 1 : 1,
        timestamp: Date.now(),
        message,
        ...details,
    });

    while (ring.length > 300) {
        ring.shift();
    }

    window.__kibitzLifecycleRing = ring;
}

const MAX_INITIAL_RESIZE_RETRIES = 60;
const MAX_BOARD_HOST_READY_RAF_ATTEMPTS = 120;
const BOARD_HOST_READY_SLOW_RETRY_MS = 250;
const MAX_BOARD_HOST_READY_SLOW_RETRIES = 20;

export type BoardHostReadinessReason = "missing-host" | "detached" | "zero-size" | "ready";

export interface BoardHostReadiness {
    ready: boolean;
    reason: BoardHostReadinessReason;
    width: number;
    height: number;
    connected: boolean;
}

type FullBoardHostReadiness = BoardHostReadiness & {
    gobanContainerReady: boolean;
};

export function getBoardHostReadiness(host: HTMLElement | null): BoardHostReadiness {
    if (!host) {
        return {
            ready: false,
            reason: "missing-host",
            width: 0,
            height: 0,
            connected: false,
        };
    }

    const connected = host.isConnected;
    const width = host.clientWidth;
    const height = host.clientHeight;

    if (!connected) {
        return {
            ready: false,
            reason: "detached",
            width,
            height,
            connected,
        };
    }

    if (width <= 0 || height <= 0) {
        return {
            ready: false,
            reason: "zero-size",
            width,
            height,
            connected,
        };
    }

    return {
        ready: true,
        reason: "ready",
        width,
        height,
        connected,
    };
}

export function getMovePathToRestore(
    currentMovePath: string | undefined,
    sourceMovePath: string | undefined,
    preferSourceMovePath: boolean,
): string | undefined {
    if (preferSourceMovePath) {
        return sourceMovePath ?? currentMovePath ?? undefined;
    }

    return currentMovePath ?? sourceMovePath ?? undefined;
}

export function shouldConnectKibitzBoardToGame(
    boardRole: "main" | "secondary" | "variation" | "preview",
    connectToGame: boolean,
): boolean {
    return boardRole === "main" && connectToGame;
}

function isGobanStillUsable(
    goban: GobanController["goban"] | null | undefined,
): goban is GobanController["goban"] {
    if (!goban) {
        return false;
    }

    const gobanElement = goban as unknown as {
        parent?: HTMLElement | null;
        destroyed?: boolean;
        renderer?: { destroyed?: boolean };
    };

    return Boolean(
        gobanElement.parent?.isConnected &&
        !gobanElement.destroyed &&
        !gobanElement.renderer?.destroyed,
    );
}

export function refreshLastOfficialMoveFromTrunk(controller: GobanController): MoveTree | null {
    const { engine } = controller.goban;
    const liveTrunkTail = getMoveTreeTrunkTail(engine.move_tree);

    if (!liveTrunkTail) {
        return null;
    }

    const moveToRestore = engine.cur_move;
    engine.jumpTo(liveTrunkTail);
    engine.setLastOfficialMove();

    if (moveToRestore.id !== liveTrunkTail.id) {
        engine.jumpTo(moveToRestore);
    }

    return liveTrunkTail;
}

export function restoreToOfficialTail(controller: GobanController): MoveTree | null {
    const { engine } = controller.goban;
    const officialTail = getMoveTreeTrunkTail(engine.move_tree);

    if (!officialTail || officialTail.move_number <= 0) {
        return null;
    }

    engine.jumpTo(officialTail);
    engine.setLastOfficialMove();
    controller.goban.redraw(true);

    return officialTail;
}

export function shouldRestoreToOfficialTailForGame(
    currentMoveNumber: number | null | undefined,
    restoredOfficialTailForGameId: number | null,
    gameId: number | undefined,
): boolean {
    if (gameId == null) {
        return false;
    }

    return restoredOfficialTailForGameId !== gameId || currentMoveNumber === 0;
}

export interface RestoredOfficialTailRef {
    gameId: number;
    moveNumber: number;
    nodeId?: string | number | null;
}

export function shouldRestoreMainBoardToOfficialTail({
    gameId,
    currentMoveNumber,
    currentMoveNodeId,
    officialTailMoveNumber,
    lastRestored,
}: {
    gameId: number | null | undefined;
    currentMoveNumber: number;
    currentMoveNodeId?: string | number | null;
    officialTailMoveNumber: number;
    lastRestored: RestoredOfficialTailRef | null;
}): boolean {
    if (gameId == null || officialTailMoveNumber <= 0) {
        return false;
    }

    if (!lastRestored || lastRestored.gameId !== gameId) {
        return true;
    }

    if (currentMoveNumber === 0) {
        return true;
    }

    const officialTailAdvanced = officialTailMoveNumber > lastRestored.moveNumber;
    const userWasAtPreviouslyRestoredTail =
        currentMoveNumber === lastRestored.moveNumber ||
        (currentMoveNodeId != null && currentMoveNodeId === lastRestored.nodeId);

    return officialTailAdvanced && userWasAtPreviouslyRestoredTail;
}

export function KibitzBoard({
    role,
    gameId,
    currentRoomGameId,
    isMobile = false,
    connectToGame = true,
    width = 19,
    height = 19,
    className,
    size,
    interactive = false,
    showLabels = true,
    fitMode = "native",
    respectContainerBounds = false,
    moveTree,
    movePath,
    restoreToOfficialTailOnLoad = false,
    coordinateSafeInput = false,
    allowTransientDragScaling = false,
    onTransientDragControllerChange,
    onReady,
}: KibitzBoardProps): React.ReactElement {
    const boardHostRef = React.useRef<HTMLDivElement>(null);
    const gobanContainerRef = React.useRef<HTMLDivElement>(null);
    const gobanDiv = React.useRef<HTMLDivElement>(
        (() => {
            const element = document.createElement("div");
            element.className = "Goban";
            return element;
        })(),
    );
    const controllerRef = React.useRef<GobanController | null>(null);
    const controllerEpochRef = React.useRef(0);
    const controllerPublishedRef = React.useRef(false);
    const resizeDebounceRef = React.useRef<NodeJS.Timeout | null>(null);
    const initialResizeRetryCountRef = React.useRef(0);
    const initialResizeRetryTimedOutRef = React.useRef(false);
    const pendingInitialResizeRetryRef = React.useRef<{
        frame1: number | null;
        frame2: number | null;
    } | null>(null);
    const onResizeRef = React.useRef<
        (no_debounce?: boolean, allowTransientResize?: boolean) => void
    >(() => {});
    const [goban, setGoban] = React.useState<GobanController["goban"] | null>(null);
    const [boardHostReadyKey, setBoardHostReadyKey] = React.useState<string | null>(null);
    const moveTreeRef = React.useRef(moveTree);
    const sourceMovePathRef = React.useRef(movePath);
    const currentMovePathRef = React.useRef(movePath);
    const preferSourceMovePathRef = React.useRef(false);
    const currentMoveNodeRef = React.useRef<MoveTree | undefined>(undefined);
    const pendingLiveMoveRestoreRef = React.useRef<{
        node: MoveTree;
        path: string;
        timeout: ReturnType<typeof setTimeout>;
    } | null>(null);
    const restoringBoardRef = React.useRef(false);
    const requestedHydrationGameIdRef = React.useRef<number | null>(null);
    const restoredOfficialTailRef = React.useRef<RestoredOfficialTailRef | null>(null);
    const boardRole = role ?? (restoreToOfficialTailOnLoad ? "main" : "secondary");
    const effectiveConnectToGame = shouldConnectKibitzBoardToGame(boardRole, connectToGame);
    const hasExplicitSize = typeof size === "number";
    const explicitSizeReady = !hasExplicitSize || (Number.isFinite(size) && size > 0);
    const shouldDeferGobanContainer =
        boardRole === "secondary" && hasExplicitSize && !explicitSizeReady;
    const displaySize = hasExplicitSize && Number.isFinite(size) && size > 0 ? size : undefined;
    const sizePropRef = React.useRef<number | null>(size ?? null);
    const displaySizeRef = React.useRef<number | null>(displaySize ?? null);
    const fitModeRef = React.useRef<"native" | "contain">(fitMode);
    const resizeGenerationRef = React.useRef(0);
    const latestResizeTargetRef = React.useRef<{
        displaySize: number | null;
        size: number | null;
        fitMode: "native" | "contain";
        respectContainerBounds: boolean;
    }>({
        displaySize: displaySize ?? null,
        size: size ?? null,
        fitMode,
        respectContainerBounds,
    });
    const wasTransientDragScalingRef = React.useRef(false);
    const didImmediateCoordinateSafeResizeRef = React.useRef<number | null>(null);
    const transientDragFinalizingRef = React.useRef(false);
    const coordinateSafeInputRef = React.useRef(coordinateSafeInput);
    const allowTransientDragScalingRef = React.useRef(allowTransientDragScaling);
    const pendingTransientDragFinalSizeRef = React.useRef<number | null>(null);
    const pendingTransientDragClearFrameRef = React.useRef<number | null>(null);
    const lastAppliedTransientContentSizeRef = React.useRef<number | null>(null);
    const transientDragMetricsRef = React.useRef<{
        metricsWidth: number | null;
        metricsHeight: number | null;
        transientBoardWindowMaxSize: number | null;
        startWindowSize: number | null;
        startContentSize: number | null;
        startGap: number | null;
        lastWindowSize: number | null;
        lastContentSize: number | null;
        lastLogAt: number;
        active: boolean;
    } | null>(null);
    const boardHostReadinessKey = React.useMemo(
        () =>
            [
                boardRole,
                gameId ?? "none",
                currentRoomGameId ?? "none",
                isMobile ? "mobile" : "desktop",
                effectiveConnectToGame ? "connect" : "no-connect",
                width,
                height,
                interactive ? "interactive" : "static",
                showLabels ? "labels" : "no-labels",
                fitMode,
                respectContainerBounds ? "respect" : "no-respect",
                restoreToOfficialTailOnLoad ? "restore" : "no-restore",
            ].join("|"),
        [
            boardRole,
            effectiveConnectToGame,
            currentRoomGameId,
            fitMode,
            gameId,
            height,
            interactive,
            isMobile,
            restoreToOfficialTailOnLoad,
            respectContainerBounds,
            showLabels,
            width,
        ],
    );

    React.useEffect(() => {
        sizePropRef.current = size ?? null;
        displaySizeRef.current = displaySize ?? null;
        fitModeRef.current = fitMode;
        latestResizeTargetRef.current = {
            displaySize: displaySize ?? null,
            size: size ?? null,
            fitMode,
            respectContainerBounds,
        };
        resizeGenerationRef.current += 1;
    }, [coordinateSafeInput, displaySize, fitMode, respectContainerBounds, size]);

    React.useEffect(() => {
        coordinateSafeInputRef.current = coordinateSafeInput;
        allowTransientDragScalingRef.current = allowTransientDragScaling;
    }, [allowTransientDragScaling, coordinateSafeInput]);

    const getKibitzBoardMetricsSnapshot = React.useCallback(
        (reason: string): Record<string, unknown> => {
            const host = boardHostRef.current;
            const container = gobanContainerRef.current;
            const gobanElement = gobanDiv.current;
            const gobanController = controllerRef.current?.goban ?? goban;
            const metrics = gobanController?.computeMetrics?.();
            const sizePropLatest = sizePropRef.current;
            const displaySizeLatest = displaySizeRef.current;
            const coordinateSafeInputActive =
                coordinateSafeInputRef.current &&
                (!allowTransientDragScalingRef.current || transientDragFinalizingRef.current);

            return {
                reason,
                role: boardRole,
                gameId,
                currentRoomGameId,
                isMobile,
                interactive,
                className: typeof className === "string" ? className : null,
                sizeProp: sizePropLatest,
                displaySize: displaySizeLatest,
                fitMode: fitModeRef.current,
                coordinateSafeInput: coordinateSafeInputRef.current,
                allowTransientDragScaling: allowTransientDragScalingRef.current,
                coordinateSafeInputActive,
                allowCssTransformScaling:
                    fitModeRef.current === "contain" && !coordinateSafeInputActive,
                pointerEventsDisabledForTransientScaling:
                    coordinateSafeInputRef.current &&
                    (allowTransientDragScalingRef.current || transientDragFinalizingRef.current),
                respectContainerBounds,
                host: getKibitzElementMetrics(host),
                container: getKibitzElementMetrics(container),
                gobanElement: getKibitzElementMetrics(gobanElement),
                gobanMetrics: metrics
                    ? {
                          width: metrics.width,
                          height: metrics.height,
                      }
                    : null,
                devicePixelRatio: window.devicePixelRatio,
            };
        },
        [
            boardRole,
            className,
            currentRoomGameId,
            gameId,
            goban,
            interactive,
            isMobile,
            respectContainerBounds,
        ],
    );

    const beginTransientDrag = React.useCallback(
        (
            windowMaxSizeHint?: number | null,
        ): {
            metricsWidth: number | null;
            metricsHeight: number | null;
        } => {
            if (pendingTransientDragClearFrameRef.current !== null) {
                window.cancelAnimationFrame(pendingTransientDragClearFrameRef.current);
                pendingTransientDragClearFrameRef.current = null;
            }

            pendingTransientDragFinalSizeRef.current = null;
            transientDragFinalizingRef.current = false;
            const gobanController = controllerRef.current?.goban;
            const metrics = gobanController?.computeMetrics?.();
            const metricsWidth = typeof metrics?.width === "number" ? metrics.width : null;
            const metricsHeight = typeof metrics?.height === "number" ? metrics.height : null;
            const host = boardHostRef.current;
            const gobanElement = gobanDiv.current;
            const hostRect = host?.getBoundingClientRect();
            const gobanRect = gobanElement?.getBoundingClientRect();
            const startWindowSize =
                hostRect &&
                Number.isFinite(hostRect.width) &&
                Number.isFinite(hostRect.height) &&
                hostRect.width > 0 &&
                hostRect.height > 0
                    ? Math.min(hostRect.width, hostRect.height)
                    : null;
            const startContentSize =
                gobanRect &&
                Number.isFinite(gobanRect.width) &&
                Number.isFinite(gobanRect.height) &&
                gobanRect.width > 0 &&
                gobanRect.height > 0
                    ? Math.min(gobanRect.width, gobanRect.height)
                    : metricsWidth;
            const transientBoardWindowMaxSize =
                Number.isFinite(windowMaxSizeHint) && (windowMaxSizeHint ?? 0) > 0
                    ? Math.floor(windowMaxSizeHint ?? 0)
                    : null;
            const startGap =
                startWindowSize != null && startContentSize != null
                    ? Math.max(0, startWindowSize - startContentSize)
                    : null;

            transientDragMetricsRef.current = {
                metricsWidth,
                metricsHeight,
                transientBoardWindowMaxSize,
                startWindowSize,
                startContentSize,
                startGap,
                lastWindowSize: startWindowSize,
                lastContentSize: startContentSize,
                lastLogAt: 0,
                active: true,
            };
            lastAppliedTransientContentSizeRef.current = startContentSize;

            recordKibitzBoardSizeEvent("kibitz-board:transient-drag-begin", {
                role: boardRole,
                gameId,
                currentRoomGameId,
                isMobile,
                interactive,
                metricsWidth,
                metricsHeight,
                startWindowSize,
                startContentSize,
                transientBoardWindowMaxSize,
                startGap,
                host: getKibitzElementMetrics(host),
                gobanElement: getKibitzElementMetrics(gobanElement),
            });

            return {
                metricsWidth,
                metricsHeight,
            };
        },
        [boardRole, currentRoomGameId, gameId, interactive, isMobile],
    );

    const applyTransientDragVisualSize = React.useCallback(
        (visualSize: number) => {
            if (!coordinateSafeInputRef.current || !allowTransientDragScalingRef.current) {
                return;
            }

            const host = boardHostRef.current;
            const container = gobanContainerRef.current;
            const transientMetrics = transientDragMetricsRef.current;
            const metricsWidth = transientMetrics?.metricsWidth ?? null;
            const metricsHeight = transientMetrics?.metricsHeight ?? null;
            const startWindowSize = transientMetrics?.startWindowSize ?? null;
            const startContentSize = transientMetrics?.startContentSize ?? null;
            if (
                !transientMetrics ||
                !transientMetrics.active ||
                !metricsWidth ||
                !metricsHeight ||
                !startWindowSize ||
                !startContentSize ||
                !host ||
                !container
            ) {
                return;
            }

            const gobanElement = gobanDiv.current;
            if (!gobanElement) {
                return;
            }

            const contentSize = computeMeasuredTransientDragContentSize({
                visualSize,
                startWindowSize,
                startContentSize,
            });
            if (contentSize <= 0) {
                return;
            }

            setTransientSquareSize(host, visualSize);
            setTransientSquareSize(container, visualSize);
            const scale = computeTransientDragScale(contentSize, metricsWidth);
            gobanElement.style.transformOrigin = "top left";
            gobanElement.style.transform = `scale(${scale})`;
            gobanElement.style.left = `${Math.max(0, Math.floor((visualSize - contentSize) / 2))}px`;
            gobanElement.style.top = "0px";
            gobanElement.style.pointerEvents = "none";
            transientMetrics.lastWindowSize = visualSize;
            transientMetrics.lastContentSize = contentSize;
            lastAppliedTransientContentSizeRef.current = contentSize;

            const now = Date.now();
            if (isKibitzBoardSizeDebugEnabled() && now - transientMetrics.lastLogAt >= 120) {
                transientMetrics.lastLogAt = now;
                const hostMetrics = getKibitzElementMetrics(host);
                const containerMetrics = getKibitzElementMetrics(container);
                const gobanMetrics = getKibitzElementMetrics(gobanElement);
                recordKibitzBoardSizeEvent("kibitz-board:drag-fast-scale", {
                    role: boardRole,
                    gameId,
                    currentRoomGameId,
                    isMobile,
                    interactive,
                    coordinateSafeInput: coordinateSafeInputRef.current,
                    allowTransientDragScaling: allowTransientDragScalingRef.current,
                    coordinateSafeInputActive:
                        coordinateSafeInputRef.current && !allowTransientDragScalingRef.current,
                    allowCssTransformScaling:
                        fitMode === "contain" &&
                        !(coordinateSafeInputRef.current && !allowTransientDragScalingRef.current),
                    pointerEventsDisabledForTransientScaling:
                        coordinateSafeInputRef.current &&
                        (allowTransientDragScalingRef.current ||
                            transientDragFinalizingRef.current),
                    visualSize,
                    contentSize,
                    startWindowSize,
                    startContentSize,
                    transientBoardWindowMaxSize:
                        transientMetrics.transientBoardWindowMaxSize ?? null,
                    startGap: transientMetrics.startGap,
                    dragScale: visualSize / startWindowSize,
                    cachedMetricsWidth: metricsWidth,
                    cachedMetricsHeight: metricsHeight,
                    transformScale: scale,
                });
                recordKibitzBoardSizeEvent("kibitz-board:drag-fast-layout", {
                    role: boardRole,
                    gameId,
                    currentRoomGameId,
                    isMobile,
                    interactive,
                    visualSize,
                    hostRectWidth: hostMetrics?.rectWidth ?? null,
                    hostRectHeight: hostMetrics?.rectHeight ?? null,
                    containerRectWidth: containerMetrics?.rectWidth ?? null,
                    containerRectHeight: containerMetrics?.rectHeight ?? null,
                    gobanRectWidth: gobanMetrics?.rectWidth ?? null,
                    gobanRectHeight: gobanMetrics?.rectHeight ?? null,
                    contentSize,
                    startWindowSize,
                    startContentSize,
                    startGap: transientMetrics.startGap,
                    dragScale: visualSize / startWindowSize,
                    transformScale: scale,
                    gobanLeft: gobanElement.style.left,
                    gobanTop: gobanElement.style.top,
                    transform: gobanElement.style.transform,
                });
            }
        },
        [boardRole, currentRoomGameId, fitMode, gameId, interactive, isMobile],
    );

    const prepareTransientNativeResizeHandoff = React.useCallback(
        (finalWindowSize: number, finalNativeContentSize: number) => {
            const host = boardHostRef.current;
            const container = gobanContainerRef.current;
            const gobanElement = gobanDiv.current;

            if (!host || !container || !gobanElement) {
                return;
            }

            const finalLeft = Math.max(
                0,
                Math.floor((finalWindowSize - finalNativeContentSize) / 2),
            );

            setTransientSquareSize(host, finalWindowSize);
            setTransientSquareSize(container, finalWindowSize);

            gobanElement.style.width = `${finalNativeContentSize}px`;
            gobanElement.style.height = `${finalNativeContentSize}px`;
            gobanElement.style.transform = "";
            gobanElement.style.transformOrigin = "";
            gobanElement.style.left = `${finalLeft}px`;
            gobanElement.style.top = "0px";
            gobanElement.style.pointerEvents = "none";

            recordKibitzBoardSizeEvent("kibitz-board:transient-drag-native-handoff", {
                ...getKibitzBoardMetricsSnapshot("transient-drag-native-handoff"),
                finalWindowSize,
                finalNativeContentSize,
                finalLeft,
            });
        },
        [getKibitzBoardMetricsSnapshot],
    );

    const clearTransientDragPresentationPreservingWindow = React.useCallback(
        (
            finalWindowSize: number,
            finalNativeContentSize: number,
            readiness: {
                metricsWidth: number | null;
                metricsHeight: number | null;
                hostRectWidth: number | null;
                hostRectHeight: number | null;
                containerRectWidth: number | null;
                containerRectHeight: number | null;
                nativeReady: boolean;
                layoutReady: boolean;
                reactHasCaughtUp: boolean;
            },
        ) => {
            const host = boardHostRef.current;
            const container = gobanContainerRef.current;
            const gobanElement = gobanDiv.current;
            const finalLeft = Math.max(
                0,
                Math.floor((finalWindowSize - finalNativeContentSize) / 2),
            );

            setTransientSquareSize(host, finalWindowSize);
            setTransientSquareSize(container, finalWindowSize);

            if (readiness.nativeReady && readiness.layoutReady && readiness.reactHasCaughtUp) {
                if (host) {
                    host.style.minWidth = "";
                    host.style.minHeight = "";
                    host.style.maxWidth = "";
                    host.style.maxHeight = "";
                }
                if (container) {
                    container.style.minWidth = "";
                    container.style.minHeight = "";
                    container.style.maxWidth = "";
                    container.style.maxHeight = "";
                }
            }

            if (gobanElement) {
                gobanElement.style.width = `${finalNativeContentSize}px`;
                gobanElement.style.height = `${finalNativeContentSize}px`;
                gobanElement.style.transform = "";
                gobanElement.style.transformOrigin = "";
                gobanElement.style.left = `${finalLeft}px`;
                gobanElement.style.top = "0px";
                gobanElement.style.pointerEvents = "";
            }

            transientDragMetricsRef.current = null;
            lastAppliedTransientContentSizeRef.current = null;

            recordKibitzBoardSizeEvent("kibitz-board:transient-drag-final-clear", {
                ...getKibitzBoardMetricsSnapshot("transient-drag-final-clear"),
                finalWindowSize,
                finalNativeContentSize,
                finalLeft,
                metricsWidth: readiness.metricsWidth,
                metricsHeight: readiness.metricsHeight,
                hostRectWidth: readiness.hostRectWidth,
                hostRectHeight: readiness.hostRectHeight,
                containerRectWidth: readiness.containerRectWidth,
                containerRectHeight: readiness.containerRectHeight,
                sizePropLatest: sizePropRef.current,
                displaySizeLatest: displaySizeRef.current,
                nativeReady: readiness.nativeReady,
                layoutReady: readiness.layoutReady,
                reactHasCaughtUp: readiness.reactHasCaughtUp,
                host: getKibitzElementMetrics(host),
                container: getKibitzElementMetrics(container),
                gobanElement: getKibitzElementMetrics(gobanElement),
            });
        },
        [getKibitzBoardMetricsSnapshot],
    );

    const isNativeFinalResizeReady = React.useCallback(
        (expectedNativeContentSize: number): boolean => {
            const gobanController = controllerRef.current?.goban;
            const host = boardHostRef.current;
            const container = gobanContainerRef.current;

            if (!gobanController || !host || !container) {
                return false;
            }

            if (host.offsetWidth <= 0 || host.offsetHeight <= 0) {
                return false;
            }

            if (container.offsetWidth <= 0 || container.offsetHeight <= 0) {
                return false;
            }

            const metrics = gobanController.computeMetrics?.();
            const metricWidth = Number(metrics?.width ?? NaN);
            const metricHeight = Number(metrics?.height ?? NaN);
            if (!Number.isFinite(metricWidth) || !Number.isFinite(metricHeight)) {
                return false;
            }

            return (
                Math.abs(metricWidth - expectedNativeContentSize) <= 1 &&
                Math.abs(metricHeight - expectedNativeContentSize) <= 1
            );
        },
        [],
    );

    const waitForNativeFinalResizeReadyThenClear = React.useCallback(
        (finalWindowSize: number, finalNativeContentSize: number) => {
            if (pendingTransientDragClearFrameRef.current !== null) {
                window.cancelAnimationFrame(pendingTransientDragClearFrameRef.current);
                pendingTransientDragClearFrameRef.current = null;
            }

            let attempts = 0;
            const maxAttempts = 24;

            const check = () => {
                if (pendingTransientDragFinalSizeRef.current == null) {
                    pendingTransientDragClearFrameRef.current = null;
                    return;
                }

                attempts += 1;

                const gobanController = controllerRef.current?.goban;
                const host = boardHostRef.current;
                const container = gobanContainerRef.current;
                const gobanElement = gobanDiv.current;
                const hostRect = host?.getBoundingClientRect() ?? null;
                const containerRect = container?.getBoundingClientRect() ?? null;
                const metrics = gobanController?.computeMetrics?.();
                const metricWidth = Number(metrics?.width ?? NaN);
                const metricHeight = Number(metrics?.height ?? NaN);
                const nativeReady = isNativeFinalResizeReady(finalNativeContentSize);
                const layoutReady =
                    hostRect != null &&
                    containerRect != null &&
                    Math.abs(hostRect.width - finalWindowSize) <= 1 &&
                    Math.abs(containerRect.width - finalWindowSize) <= 1;
                const sizePropLatest = sizePropRef.current;
                const displaySizeLatest = displaySizeRef.current;
                const reactHasCaughtUp =
                    layoutReady ||
                    (sizePropLatest != null && Math.abs(sizePropLatest - finalWindowSize) <= 1) ||
                    (displaySizeLatest != null &&
                        Math.abs(displaySizeLatest - finalWindowSize) <= 1);

                if (gobanElement && Number.isFinite(metricWidth) && metricWidth > 0) {
                    gobanElement.style.transformOrigin = "top left";
                    gobanElement.style.transform = `scale(${finalNativeContentSize / metricWidth})`;
                    gobanElement.style.left = `${Math.max(
                        0,
                        (finalWindowSize - finalNativeContentSize) / 2,
                    )}px`;
                    gobanElement.style.top = "0px";
                    gobanElement.style.pointerEvents = "none";
                }

                if ((nativeReady && layoutReady && reactHasCaughtUp) || attempts >= maxAttempts) {
                    recordKibitzBoardSizeEvent("kibitz-board:transient-drag-final-native-ready", {
                        ...getKibitzBoardMetricsSnapshot("transient-drag-final-native-ready"),
                        finalWindowSize,
                        finalNativeContentSize,
                        metricsWidth: Number.isFinite(metricWidth) ? metricWidth : null,
                        metricsHeight: Number.isFinite(metricHeight) ? metricHeight : null,
                        nativeReady,
                        hostRectWidth: hostRect?.width ?? null,
                        hostRectHeight: hostRect?.height ?? null,
                        containerRectWidth: containerRect?.width ?? null,
                        containerRectHeight: containerRect?.height ?? null,
                        layoutReady,
                        sizePropLatest,
                        displaySizeLatest,
                        reactHasCaughtUp,
                        attempts,
                    });

                    clearTransientDragPresentationPreservingWindow(
                        finalWindowSize,
                        finalNativeContentSize,
                        {
                            metricsWidth: Number.isFinite(metricWidth) ? metricWidth : null,
                            metricsHeight: Number.isFinite(metricHeight) ? metricHeight : null,
                            hostRectWidth: hostRect?.width ?? null,
                            hostRectHeight: hostRect?.height ?? null,
                            containerRectWidth: containerRect?.width ?? null,
                            containerRectHeight: containerRect?.height ?? null,
                            nativeReady,
                            layoutReady,
                            reactHasCaughtUp,
                        },
                    );
                    transientDragFinalizingRef.current = false;
                    pendingTransientDragFinalSizeRef.current = null;
                    pendingTransientDragClearFrameRef.current = null;
                    return;
                }

                pendingTransientDragClearFrameRef.current = window.requestAnimationFrame(check);
            };

            pendingTransientDragClearFrameRef.current = window.requestAnimationFrame(check);
        },
        [
            clearTransientDragPresentationPreservingWindow,
            getKibitzBoardMetricsSnapshot,
            isNativeFinalResizeReady,
        ],
    );

    const runFinalNativeResizeAfterSettle = React.useCallback(
        (finalWindowSize: number, finalNativeContentSize: number) => {
            const host = boardHostRef.current;
            const container = gobanContainerRef.current;
            const gobanElement = gobanDiv.current;
            if (!host || !container || !gobanElement) {
                return;
            }

            prepareTransientNativeResizeHandoff(finalWindowSize, finalNativeContentSize);

            recordKibitzBoardSizeEvent("kibitz-board:transient-drag-native-resize-after-settle", {
                ...getKibitzBoardMetricsSnapshot("transient-drag-native-resize-after-settle"),
                finalWindowSize,
                finalNativeContentSize,
            });

            onResizeRef.current(true, true);
            waitForNativeFinalResizeReadyThenClear(finalWindowSize, finalNativeContentSize);
        },
        [
            getKibitzBoardMetricsSnapshot,
            prepareTransientNativeResizeHandoff,
            waitForNativeFinalResizeReadyThenClear,
        ],
    );

    const startTransientReleaseSettle = React.useCallback(
        ({
            fromWindowSize,
            finalWindowSize,
            toWindowSize,
            fromContentSize,
            toContentSize,
            fromLeft,
            toLeft,
        }: {
            fromWindowSize: number;
            finalWindowSize: number;
            toWindowSize: number;
            fromContentSize: number;
            toContentSize: number;
            fromLeft: number;
            toLeft: number;
        }) => {
            if (pendingTransientDragClearFrameRef.current !== null) {
                window.cancelAnimationFrame(pendingTransientDragClearFrameRef.current);
                pendingTransientDragClearFrameRef.current = null;
            }

            const settleDurationMs = TRANSIENT_DRAG_RELEASE_SETTLE_MS;
            const contentDelta = Math.abs(toContentSize - fromContentSize);
            const leftDelta = Math.abs(toLeft - fromLeft);
            const windowDelta = Math.abs(toWindowSize - fromWindowSize);

            const host = boardHostRef.current;
            const container = gobanContainerRef.current;
            const gobanElement = gobanDiv.current;
            const transientMetrics = transientDragMetricsRef.current;
            const metricsWidth = transientMetrics?.metricsWidth ?? null;

            if (host && container) {
                setTransientSquareSize(host, finalWindowSize);
                setTransientSquareSize(container, finalWindowSize);
            }

            if (isKibitzBoardSizeDebugEnabled()) {
                recordKibitzBoardSizeEvent("kibitz-board:transient-drag-release-settle", {
                    ...getKibitzBoardMetricsSnapshot("transient-drag-release-settle"),
                    finalWindowSize,
                    fromContentSize,
                    toContentSize,
                    fromLeft,
                    toLeft,
                    fromWindowSize,
                    toWindowSize,
                    currentContentSize: fromContentSize,
                    currentLeft: fromLeft,
                    settleElapsedMs: 0,
                    settleDurationMs,
                    contentDelta,
                    leftDelta,
                    windowDelta,
                    animationProgress: 0,
                    easedProgress: 0,
                    settleSkipped: contentDelta < 1 && leftDelta < 0.5 && windowDelta < 1,
                });
            }

            if (contentDelta < 1 && leftDelta < 0.5 && windowDelta < 1) {
                runFinalNativeResizeAfterSettle(finalWindowSize, toContentSize);
                return;
            }

            if (!host || !container || !gobanElement || !metricsWidth || metricsWidth <= 0) {
                runFinalNativeResizeAfterSettle(finalWindowSize, toContentSize);
                return;
            }

            const startTime = performance.now();
            let lastLoggedContentSize: number | null = null;

            const step = () => {
                if (pendingTransientDragFinalSizeRef.current == null) {
                    pendingTransientDragClearFrameRef.current = null;
                    return;
                }

                const elapsed = performance.now() - startTime;
                const linearT = Math.min(1, elapsed / settleDurationMs);
                const easedT =
                    linearT < 0.5
                        ? 4 * linearT * linearT * linearT
                        : 1 - Math.pow(-2 * linearT + 2, 3) / 2;
                const currentContentSize =
                    fromContentSize + (toContentSize - fromContentSize) * easedT;
                const currentLeft = fromLeft + (toLeft - fromLeft) * easedT;

                setTransientSquareSize(host, finalWindowSize);
                setTransientSquareSize(container, finalWindowSize);

                gobanElement.style.transformOrigin = "top left";
                gobanElement.style.transform = `scale(${currentContentSize / metricsWidth})`;
                gobanElement.style.left = `${currentLeft}px`;
                gobanElement.style.top = "0px";
                gobanElement.style.pointerEvents = "none";

                if (transientMetrics) {
                    transientMetrics.lastWindowSize = finalWindowSize;
                    transientMetrics.lastContentSize = currentContentSize;
                }
                lastAppliedTransientContentSizeRef.current = currentContentSize;

                if (
                    isKibitzBoardSizeDebugEnabled() &&
                    (lastLoggedContentSize == null ||
                        Math.abs(lastLoggedContentSize - currentContentSize) >= 1 ||
                        linearT >= 1)
                ) {
                    lastLoggedContentSize = currentContentSize;
                    recordKibitzBoardSizeEvent("kibitz-board:transient-drag-release-settle", {
                        ...getKibitzBoardMetricsSnapshot("transient-drag-release-settle"),
                        finalWindowSize,
                        fromContentSize,
                        toContentSize,
                        currentContentSize,
                        fromLeft,
                        toLeft,
                        currentLeft,
                        fromWindowSize,
                        toWindowSize,
                        currentWindowSize: finalWindowSize,
                        animationProgress: linearT,
                        easedProgress: easedT,
                        settleElapsedMs: elapsed,
                        settleDurationMs,
                        contentDelta,
                        leftDelta,
                        windowDelta,
                    });
                }

                if (linearT < 1) {
                    pendingTransientDragClearFrameRef.current = window.requestAnimationFrame(step);
                    return;
                }

                pendingTransientDragClearFrameRef.current = null;
                runFinalNativeResizeAfterSettle(finalWindowSize, toContentSize);
            };

            pendingTransientDragClearFrameRef.current = window.requestAnimationFrame(step);
        },
        [getKibitzBoardMetricsSnapshot, runFinalNativeResizeAfterSettle],
    );

    const finishTransientDrag = React.useCallback(
        (finalWindowSize: number) => {
            if (!Number.isFinite(finalWindowSize) || finalWindowSize <= 0) {
                return;
            }

            const host = boardHostRef.current;
            const container = gobanContainerRef.current;
            const gobanElement = gobanDiv.current;
            const transientMetrics = transientDragMetricsRef.current;
            if (!host || !container || !gobanElement || !transientMetrics) {
                return;
            }

            if (pendingTransientDragClearFrameRef.current !== null) {
                window.cancelAnimationFrame(pendingTransientDragClearFrameRef.current);
                pendingTransientDragClearFrameRef.current = null;
            }

            pendingTransientDragFinalSizeRef.current = finalWindowSize;
            transientDragFinalizingRef.current = true;
            gobanElement.style.pointerEvents = "none";

            const finalNativeContentSize = predictNativeGobanContentSize({
                targetSlotSize: finalWindowSize,
                boardWidth: width,
                boardHeight: height,
                showLabels,
            });
            const lastVisibleWindowSize =
                transientMetrics.lastWindowSize ??
                transientMetrics.startWindowSize ??
                finalWindowSize;
            const lastVisibleContentSize =
                transientMetrics.lastContentSize ??
                lastAppliedTransientContentSizeRef.current ??
                transientMetrics.startContentSize ??
                finalNativeContentSize;
            const inlineLeft = Number.parseFloat(gobanElement.style.left);
            const lastVisibleLeft = Number.isFinite(inlineLeft)
                ? inlineLeft
                : Math.max(0, (lastVisibleWindowSize - lastVisibleContentSize) / 2);
            const fromLeft = lastVisibleLeft;
            const toLeft = Math.max(0, Math.floor((finalWindowSize - finalNativeContentSize) / 2));
            const contentDelta = Math.abs(finalNativeContentSize - lastVisibleContentSize);

            recordKibitzBoardSizeEvent("kibitz-board:transient-drag-release-start", {
                ...getKibitzBoardMetricsSnapshot("transient-drag-release-start"),
                finalWindowSize,
                finalNativeContentSize,
                lastVisibleWindowSize,
                lastVisibleContentSize,
                lastVisibleLeft,
                fromLeft,
                toLeft,
                contentDelta,
                sizePropLatest: sizePropRef.current,
                displaySizeLatest: displaySizeRef.current,
                startWindowSize: transientMetrics.startWindowSize,
                startContentSize: transientMetrics.startContentSize,
                startGap: transientMetrics.startGap,
            });

            startTransientReleaseSettle({
                fromWindowSize: lastVisibleWindowSize,
                finalWindowSize,
                toWindowSize: finalWindowSize,
                fromContentSize: lastVisibleContentSize,
                toContentSize: finalNativeContentSize,
                fromLeft,
                toLeft,
            });
        },
        [getKibitzBoardMetricsSnapshot, height, showLabels, startTransientReleaseSettle, width],
    );

    const transientDragController = React.useMemo<KibitzBoardTransientDragController>(
        () => ({
            beginTransientDrag,
            applyTransientDragVisualSize,
            finishTransientDrag,
        }),
        [applyTransientDragVisualSize, beginTransientDrag, finishTransientDrag],
    );

    React.useEffect(() => {
        onTransientDragControllerChange?.(transientDragController);

        return () => {
            onTransientDragControllerChange?.(null);
        };
    }, [onTransientDragControllerChange, transientDragController]);

    React.useEffect(() => {
        moveTreeRef.current = moveTree;
    }, [moveTree]);

    React.useEffect(() => {
        sourceMovePathRef.current = movePath;
        currentMovePathRef.current = movePath;
        preferSourceMovePathRef.current = false;
    }, [movePath]);

    React.useEffect(() => {
        requestedHydrationGameIdRef.current = null;
        restoredOfficialTailRef.current = null;
    }, [gameId]);

    React.useLayoutEffect(() => {
        if (goban) {
            return;
        }

        let disposed = false;
        let readinessFrame: number | null = null;
        let slowRetryTimer: number | null = null;
        let resizeObserver: ResizeObserver | null = null;
        let rafAttemptCount = 0;
        let slowRetryCount = 0;
        let timeoutLogged = false;
        let abandonedLogged = false;
        let slowRecoveryActive = false;
        let readySignaled = false;
        let lastReadiness = getFullBoardHostReadiness();

        function getFullBoardHostReadiness(): FullBoardHostReadiness {
            const readiness = getBoardHostReadiness(boardHostRef.current);
            const gobanContainer = gobanContainerRef.current;
            const gobanWrapper = gobanDiv.current.parentElement;
            const gobanContainerReady =
                Boolean(gobanContainer?.isConnected) &&
                Boolean(gobanWrapper?.isConnected) &&
                Boolean(gobanWrapper?.classList.contains("Goban")) &&
                Boolean(gobanContainer?.classList.contains("goban-container")) &&
                Boolean(gobanContainer && gobanContainer.parentElement === boardHostRef.current) &&
                Boolean(gobanWrapper && gobanWrapper.parentElement === gobanContainer) &&
                gobanDiv.current.parentElement === gobanWrapper;

            return {
                ...readiness,
                ready: readiness.ready && gobanContainerReady,
                gobanContainerReady,
            };
        }

        const clearReadinessWatchers = () => {
            if (readinessFrame !== null) {
                window.cancelAnimationFrame(readinessFrame);
                readinessFrame = null;
            }

            if (slowRetryTimer !== null) {
                window.clearTimeout(slowRetryTimer);
                slowRetryTimer = null;
            }

            resizeObserver?.disconnect();
            resizeObserver = null;
        };

        const logHostReadyTimeout = (readiness: FullBoardHostReadiness) => {
            if (timeoutLogged) {
                return;
            }

            timeoutLogged = true;
            logKibitzVariationDebug("kibitz-board:host-ready-raf-timeout", {
                role,
                gameId,
                currentRoomGameId,
                className: typeof className === "string" ? className : null,
                size: size ?? null,
                width: readiness.width,
                height: readiness.height,
                connected: readiness.connected,
                reason: readiness.reason,
                attempts: rafAttemptCount,
            });
        };

        const logHostReadyAbandoned = () => {
            if (abandonedLogged) {
                return;
            }

            abandonedLogged = true;
            logKibitzVariationDebug("kibitz-board:host-ready-abandoned", {
                role,
                gameId,
                currentRoomGameId,
                className: typeof className === "string" ? className : null,
                size: size ?? null,
                lastReason: lastReadiness.reason,
                lastWidth: lastReadiness.width,
                lastHeight: lastReadiness.height,
                connected: lastReadiness.connected,
                rafAttempts: MAX_BOARD_HOST_READY_RAF_ATTEMPTS,
                slowRetries: slowRetryCount,
            });
        };

        const maybeMarkBoardHostReady = (
            source: "raf" | "resize-observer" | "slow-retry",
        ): boolean => {
            if (disposed || readySignaled || controllerRef.current) {
                return true;
            }

            const readiness = getFullBoardHostReadiness();
            lastReadiness = readiness;

            if (!readiness.ready) {
                return false;
            }

            readySignaled = true;
            clearReadinessWatchers();

            recordKibitzBoardSizeEvent("kibitz-board:metrics:host-ready", {
                ...getKibitzBoardMetricsSnapshot("host-ready"),
                source,
                width: readiness.width,
                height: readiness.height,
                connected: readiness.connected,
                reasonCode: readiness.reason,
                gobanContainerReady: readiness.gobanContainerReady,
            });

            if (source !== "raf" || slowRecoveryActive) {
                logKibitzVariationDebug("kibitz-board:host-ready-slow-recovered", {
                    role,
                    gameId,
                    currentRoomGameId,
                    className: typeof className === "string" ? className : null,
                    size: size ?? null,
                    reason: source,
                    slowRetryCount,
                    width: readiness.width,
                    height: readiness.height,
                    gobanContainerReady: readiness.gobanContainerReady,
                });
            }

            setBoardHostReadyKey(boardHostReadinessKey);
            return true;
        };

        const scheduleSlowRetry = () => {
            if (disposed || readySignaled) {
                return;
            }

            if (slowRetryCount >= MAX_BOARD_HOST_READY_SLOW_RETRIES) {
                clearReadinessWatchers();
                logHostReadyAbandoned();
                return;
            }

            slowRetryTimer = window.setTimeout(() => {
                slowRetryTimer = null;

                if (disposed || readySignaled) {
                    return;
                }

                slowRetryCount += 1;
                if (maybeMarkBoardHostReady("slow-retry")) {
                    return;
                }

                scheduleSlowRetry();
            }, BOARD_HOST_READY_SLOW_RETRY_MS);
        };

        const startSlowRecovery = (readiness: FullBoardHostReadiness) => {
            if (disposed || readySignaled) {
                return;
            }

            slowRecoveryActive = true;
            lastReadiness = readiness;

            if (typeof window.ResizeObserver === "function" && boardHostRef.current) {
                resizeObserver = new ResizeObserver(() => {
                    maybeMarkBoardHostReady("resize-observer");
                });
                resizeObserver.observe(boardHostRef.current);
            }

            scheduleSlowRetry();
        };

        const checkBoardHostReady = () => {
            if (disposed || readySignaled || controllerRef.current) {
                return;
            }

            const readiness = getFullBoardHostReadiness();
            lastReadiness = readiness;

            if (readiness.ready) {
                maybeMarkBoardHostReady("raf");
                return;
            }

            rafAttemptCount += 1;

            if (rafAttemptCount >= MAX_BOARD_HOST_READY_RAF_ATTEMPTS) {
                logHostReadyTimeout(readiness);
                clearReadinessWatchers();
                startSlowRecovery(readiness);
                return;
            }

            readinessFrame = window.requestAnimationFrame(checkBoardHostReady);
        };

        readinessFrame = window.requestAnimationFrame(checkBoardHostReady);

        return () => {
            disposed = true;
            clearReadinessWatchers();
        };
    }, [boardHostReadinessKey, goban, role, gameId, currentRoomGameId, className, size]);

    const cancelPendingInitialResizeRetry = React.useCallback(() => {
        const pendingRetry = pendingInitialResizeRetryRef.current;
        if (!pendingRetry) {
            return;
        }

        if (pendingRetry.frame1 !== null) {
            window.cancelAnimationFrame(pendingRetry.frame1);
        }

        if (pendingRetry.frame2 !== null) {
            window.cancelAnimationFrame(pendingRetry.frame2);
        }

        pendingInitialResizeRetryRef.current = null;
    }, []);

    const scheduleInitialResizeRetry = React.useCallback(() => {
        if (pendingInitialResizeRetryRef.current) {
            return;
        }

        if (initialResizeRetryCountRef.current >= MAX_INITIAL_RESIZE_RETRIES) {
            if (initialResizeRetryTimedOutRef.current) {
                return;
            }

            initialResizeRetryTimedOutRef.current = true;
            logKibitzVariationDebug("kibitz-board:initial-resize-retry-timeout", {
                role: boardRole,
                gameId,
                isMobile,
            });
            return;
        }

        initialResizeRetryCountRef.current += 1;
        const scheduledControllerEpoch = controllerEpochRef.current;
        const scheduledController = controllerRef.current;

        const pendingRetry = {
            frame1: null as number | null,
            frame2: null as number | null,
        };
        pendingInitialResizeRetryRef.current = pendingRetry;

        pendingRetry.frame1 = window.requestAnimationFrame(() => {
            pendingRetry.frame1 = null;

            pendingRetry.frame2 = window.requestAnimationFrame(() => {
                pendingRetry.frame2 = null;
                pendingInitialResizeRetryRef.current = null;

                if (
                    scheduledController &&
                    controllerEpochRef.current !== scheduledControllerEpoch
                ) {
                    recordKibitzLifecycleEvent("kibitz-board:delayed-callback-skip-destroyed", {
                        role: boardRole,
                        gameId,
                        currentRoomGameId,
                        reason: "initial-resize-retry",
                        scheduledControllerEpoch,
                        currentControllerEpoch: controllerEpochRef.current,
                        scheduledControllerGameId:
                            scheduledController?.goban.config?.game_id ?? null,
                        currentControllerGameId:
                            controllerRef.current?.goban.config?.game_id ?? null,
                    });
                    return;
                }

                if (
                    scheduledController &&
                    (!isGobanStillUsable(scheduledController.goban) ||
                        controllerRef.current !== scheduledController)
                ) {
                    recordKibitzLifecycleEvent("kibitz-board:delayed-callback-skip-destroyed", {
                        role: boardRole,
                        gameId,
                        currentRoomGameId,
                        reason: "initial-resize-retry",
                        scheduledControllerEpoch,
                        currentControllerEpoch: controllerEpochRef.current,
                        scheduledControllerGameId:
                            scheduledController?.goban.config?.game_id ?? null,
                        currentControllerGameId:
                            controllerRef.current?.goban.config?.game_id ?? null,
                    });
                    return;
                }

                onResizeRef.current(true);
            });
        });
    }, [boardRole, currentRoomGameId, gameId, isMobile]);

    const recenterGoban = React.useCallback(
        (gobanController: GobanController["goban"]) => {
            const container = gobanContainerRef.current;
            const gobanElement = gobanDiv.current;

            if (!container || !gobanController || !gobanElement) {
                return;
            }

            const metrics = gobanController.computeMetrics();
            const containerWidth = container.offsetWidth;
            const containerHeight = container.offsetHeight;
            const metricWidth = Number(metrics.width ?? 0);
            const metricHeight = Number(metrics.height ?? 0);
            const coordinateSafeInputActive =
                coordinateSafeInput &&
                (!allowTransientDragScaling || transientDragFinalizingRef.current);
            const allowCssTransformScaling = fitMode === "contain" && !coordinateSafeInputActive;
            const scale = computeRecenterScale({
                fitMode,
                coordinateSafeInput,
                allowTransientDragScaling,
                coordinateSafeInputActiveOverride: coordinateSafeInputActive,
                metricsWidth: metricWidth,
                metricsHeight: metricHeight,
                containerWidth,
                containerHeight,
            });
            const visualWidth = allowCssTransformScaling ? metricWidth * scale : metricWidth;
            const visualHeight = allowCssTransformScaling ? metricHeight * scale : metricHeight;

            gobanElement.style.transformOrigin = allowCssTransformScaling ? "top left" : "";
            gobanElement.style.transform = scale === 1 ? "" : `scale(${scale})`;
            gobanElement.style.top = "0px";
            gobanElement.style.left = `${Math.max(0, Math.floor((containerWidth - visualWidth) / 2))}px`;
            gobanElement.style.pointerEvents =
                coordinateSafeInput &&
                (allowTransientDragScaling || transientDragFinalizingRef.current)
                    ? "none"
                    : "";

            const gobanElementMetrics = getKibitzElementMetrics(gobanElement);
            const predictedNativeContentSize = predictNativeGobanContentSize({
                targetSlotSize: containerWidth,
                boardWidth: width,
                boardHeight: height,
                showLabels,
            });

            recordKibitzBoardSizeEvent("kibitz-board:metrics:after-recenter", {
                ...getKibitzBoardMetricsSnapshot("after-recenter"),
                coordinateSafeInput,
                allowTransientDragScaling,
                coordinateSafeInputActive,
                allowCssTransformScaling,
                pointerEventsDisabledForTransientScaling:
                    coordinateSafeInput &&
                    (allowTransientDragScaling || transientDragFinalizingRef.current),
                containerWidth,
                containerHeight,
                metricsWidth: metricWidth,
                metricsHeight: metricHeight,
                scale,
                scaledWidth: visualWidth,
                visualWidth,
                visualHeight,
                predictedNativeContentSize,
                visualToInternalScaleX:
                    typeof gobanElementMetrics?.rectWidth === "number" && metricWidth > 0
                        ? gobanElementMetrics.rectWidth / metricWidth
                        : null,
                visualToInternalScaleY:
                    typeof gobanElementMetrics?.rectHeight === "number" && metricHeight > 0
                        ? gobanElementMetrics.rectHeight / metricHeight
                        : null,
                left: Math.max(0, Math.floor((containerWidth - visualWidth) / 2)),
            });
        },
        [
            allowTransientDragScaling,
            coordinateSafeInput,
            fitMode,
            getKibitzBoardMetricsSnapshot,
            height,
            showLabels,
            width,
        ],
    );

    const onResize = React.useCallback(
        (no_debounce: boolean = false, allowTransientResize = false) => {
            const gobanController = goban;
            const gobanElement = gobanDiv.current;
            const container = gobanContainerRef.current;

            if (!isGobanStillUsable(gobanController) || !gobanElement || !container) {
                return;
            }

            if (resizeDebounceRef.current) {
                clearTimeout(resizeDebounceRef.current);
                resizeDebounceRef.current = null;
            }

            if (transientDragFinalizingRef.current && !allowTransientResize) {
                return;
            }

            if (coordinateSafeInput && allowTransientDragScaling && !allowTransientResize) {
                return;
            }

            const containerWidth = container.offsetWidth;
            const containerHeight = container.offsetHeight;
            const targetDisplayWidth = respectContainerBounds
                ? Math.min(containerWidth, containerHeight || containerWidth)
                : containerWidth;
            const metrics = gobanController.computeMetrics?.();
            const metricWidth = Number(metrics?.width ?? NaN);
            const metricHeight = Number(metrics?.height ?? NaN);
            const coordinateSafeInputActive =
                coordinateSafeInput &&
                (!allowTransientDragScaling || transientDragFinalizingRef.current);
            const allowCssTransformScaling = fitMode === "contain" && !coordinateSafeInputActive;
            const alreadyClose =
                Number.isFinite(metricWidth) &&
                Number.isFinite(metricHeight) &&
                Math.abs(metricWidth - targetDisplayWidth) <= 1 &&
                Math.abs(metricHeight - targetDisplayWidth) <= 1;

            recordKibitzBoardSizeEvent("kibitz-board:resize:start", {
                ...getKibitzBoardMetricsSnapshot("resize-start"),
                noDebounce: no_debounce,
                containerWidth,
                containerHeight,
                targetDisplayWidth,
                fitMode,
                coordinateSafeInput,
                allowTransientDragScaling,
                coordinateSafeInputActive,
                allowCssTransformScaling,
                pointerEventsDisabledForTransientScaling:
                    coordinateSafeInput &&
                    (allowTransientDragScaling || transientDragFinalizingRef.current),
                respectContainerBounds,
            });

            if (
                !Number.isFinite(containerWidth) ||
                !Number.isFinite(containerHeight) ||
                containerWidth <= 0 ||
                containerHeight <= 0
            ) {
                recordKibitzBoardSizeEvent("kibitz-board:resize:invalid-container", {
                    ...getKibitzBoardMetricsSnapshot("resize-invalid-container"),
                    noDebounce: no_debounce,
                    containerWidth,
                    containerHeight,
                    targetDisplayWidth,
                    fitMode,
                    coordinateSafeInput,
                    allowTransientDragScaling,
                    coordinateSafeInputActive,
                    allowCssTransformScaling,
                    pointerEventsDisabledForTransientScaling:
                        coordinateSafeInput &&
                        (allowTransientDragScaling || transientDragFinalizingRef.current),
                    respectContainerBounds,
                });
                if (no_debounce) {
                    scheduleInitialResizeRetry();
                }
                return;
            }

            initialResizeRetryCountRef.current = 0;
            cancelPendingInitialResizeRetry();

            if (alreadyClose) {
                recordKibitzBoardSizeEvent("kibitz-board:resize:already-satisfied", {
                    ...getKibitzBoardMetricsSnapshot("resize-already-satisfied"),
                    noDebounce: no_debounce,
                    containerWidth,
                    containerHeight,
                    targetDisplayWidth,
                    fitMode,
                    coordinateSafeInput,
                    allowTransientDragScaling,
                    coordinateSafeInputActive,
                    allowCssTransformScaling,
                    pointerEventsDisabledForTransientScaling:
                        coordinateSafeInput &&
                        allowTransientDragScaling &&
                        !transientDragFinalizingRef.current,
                    respectContainerBounds,
                    metricsWidth: metrics?.width ?? null,
                    metricsHeight: metrics?.height ?? null,
                });
                recenterGoban(gobanController);
                return;
            }

            recordKibitzBoardSizeEvent("kibitz-board:resize:before-resize", {
                ...getKibitzBoardMetricsSnapshot("resize-before"),
                noDebounce: no_debounce,
                containerWidth,
                containerHeight,
                targetDisplayWidth,
                fitMode,
                coordinateSafeInput,
                allowTransientDragScaling,
                coordinateSafeInputActive,
                allowCssTransformScaling,
                pointerEventsDisabledForTransientScaling:
                    coordinateSafeInput &&
                    (allowTransientDragScaling || transientDragFinalizingRef.current),
                respectContainerBounds,
            });
            gobanController.setLastMoveOpacity(preferences.get("last-move-opacity"));
            if (no_debounce) {
                recordKibitzBoardSizeEvent("kibitz-board:resize:apply-immediate", {
                    ...getKibitzBoardMetricsSnapshot("resize-apply-immediate"),
                    noDebounce: no_debounce,
                    containerWidth,
                    containerHeight,
                    targetDisplayWidth,
                    fitMode,
                    coordinateSafeInput,
                    allowTransientDragScaling,
                    coordinateSafeInputActive,
                    allowCssTransformScaling,
                    pointerEventsDisabledForTransientScaling:
                        coordinateSafeInput &&
                        (allowTransientDragScaling || transientDragFinalizingRef.current),
                    respectContainerBounds,
                });
                gobanController.setSquareSizeBasedOnDisplayWidth(targetDisplayWidth);
                recordKibitzBoardSizeEvent("kibitz-board:resize:after-resize", {
                    ...getKibitzBoardMetricsSnapshot("resize-after"),
                    noDebounce: no_debounce,
                    containerWidth,
                    containerHeight,
                    targetDisplayWidth,
                    fitMode,
                    coordinateSafeInput,
                    allowTransientDragScaling,
                    coordinateSafeInputActive,
                    allowCssTransformScaling,
                    pointerEventsDisabledForTransientScaling:
                        coordinateSafeInput &&
                        (allowTransientDragScaling || transientDragFinalizingRef.current),
                    respectContainerBounds,
                });
                recenterGoban(gobanController);
            } else {
                const scheduledControllerEpoch = controllerEpochRef.current;
                const scheduledController = gobanController;
                const scheduledGeneration = resizeGenerationRef.current;
                const scheduledDisplaySize = latestResizeTargetRef.current.displaySize;
                const scheduledSize = latestResizeTargetRef.current.size;
                const scheduledContainerWidth = containerWidth;
                const scheduledContainerHeight = containerHeight;
                const scheduledTargetDisplayWidth = targetDisplayWidth;
                recordKibitzBoardSizeEvent("kibitz-board:resize:debounced", {
                    ...getKibitzBoardMetricsSnapshot("resize-debounced"),
                    noDebounce: no_debounce,
                    containerWidth: scheduledContainerWidth,
                    containerHeight: scheduledContainerHeight,
                    targetDisplayWidth: scheduledTargetDisplayWidth,
                    fitMode,
                    coordinateSafeInput,
                    allowTransientDragScaling,
                    coordinateSafeInputActive,
                    allowCssTransformScaling,
                    pointerEventsDisabledForTransientScaling:
                        coordinateSafeInput &&
                        (allowTransientDragScaling || transientDragFinalizingRef.current),
                    respectContainerBounds,
                    scheduledControllerEpoch,
                    scheduledGeneration,
                    scheduledDisplaySize,
                    scheduledSize,
                });
                resizeDebounceRef.current = setTimeout(() => {
                    const currentContainerRect = gobanContainerRef.current?.getBoundingClientRect();
                    const currentTarget = latestResizeTargetRef.current;
                    const currentTargetDisplayWidth = currentTarget.respectContainerBounds
                        ? Math.min(
                              currentContainerRect?.width ?? scheduledContainerWidth,
                              currentContainerRect?.height ??
                                  scheduledContainerHeight ??
                                  scheduledContainerWidth,
                          )
                        : (currentContainerRect?.width ?? scheduledContainerWidth);
                    const stale = isKibitzBoardResizeStale({
                        scheduledGeneration,
                        currentGeneration: resizeGenerationRef.current,
                        scheduledControllerEpoch,
                        currentControllerEpoch: controllerEpochRef.current,
                        scheduledDisplaySize,
                        currentDisplaySize: currentTarget.displaySize,
                        scheduledSize,
                        currentSize: currentTarget.size,
                        scheduledContainerWidth,
                        scheduledContainerHeight,
                        currentContainerWidth: currentContainerRect?.width ?? null,
                        currentContainerHeight: currentContainerRect?.height ?? null,
                        scheduledFitMode: fitMode,
                        currentFitMode: currentTarget.fitMode,
                        scheduledRespectContainerBounds: respectContainerBounds,
                        currentRespectContainerBounds: currentTarget.respectContainerBounds,
                    });

                    if (stale) {
                        recordKibitzBoardSizeEvent("kibitz-board:resize:stale-skip", {
                            ...getKibitzBoardMetricsSnapshot("resize-stale-skip"),
                            noDebounce: no_debounce,
                            scheduledGeneration,
                            currentGeneration: resizeGenerationRef.current,
                            scheduledControllerEpoch,
                            currentControllerEpoch: controllerEpochRef.current,
                            scheduledDisplaySize,
                            currentDisplaySize: currentTarget.displaySize,
                            scheduledSize,
                            currentSize: currentTarget.size,
                            scheduledContainerWidth,
                            scheduledContainerHeight,
                            currentContainerWidth: currentContainerRect?.width ?? null,
                            currentContainerHeight: currentContainerRect?.height ?? null,
                            scheduledTargetDisplayWidth,
                            currentTargetDisplayWidth,
                            fitMode,
                            coordinateSafeInput,
                            allowTransientDragScaling,
                            coordinateSafeInputActive,
                            allowCssTransformScaling,
                            pointerEventsDisabledForTransientScaling:
                                coordinateSafeInput &&
                                (allowTransientDragScaling || transientDragFinalizingRef.current),
                            respectContainerBounds,
                        });
                        return;
                    }

                    if (
                        controllerEpochRef.current !== scheduledControllerEpoch ||
                        !isGobanStillUsable(scheduledController) ||
                        controllerRef.current?.goban !== scheduledController
                    ) {
                        recordKibitzLifecycleEvent("kibitz-board:delayed-callback-skip-destroyed", {
                            role: boardRole,
                            gameId,
                            currentRoomGameId,
                            reason: "resize-debounce",
                            scheduledControllerEpoch,
                            currentControllerEpoch: controllerEpochRef.current,
                            scheduledControllerGameId: scheduledController?.config?.game_id ?? null,
                            currentControllerGameId:
                                controllerRef.current?.goban.config?.game_id ?? null,
                        });
                        return;
                    }

                    recordKibitzBoardSizeEvent("kibitz-board:resize:debounced-apply", {
                        ...getKibitzBoardMetricsSnapshot("resize-debounced-apply"),
                        noDebounce: no_debounce,
                        containerWidth: scheduledContainerWidth,
                        containerHeight: scheduledContainerHeight,
                        targetDisplayWidth: scheduledTargetDisplayWidth,
                        fitMode,
                        coordinateSafeInput,
                        allowTransientDragScaling,
                        coordinateSafeInputActive,
                        allowCssTransformScaling,
                        pointerEventsDisabledForTransientScaling:
                            coordinateSafeInput &&
                            (allowTransientDragScaling || transientDragFinalizingRef.current),
                        respectContainerBounds,
                        scheduledControllerEpoch,
                        scheduledGeneration,
                        scheduledDisplaySize,
                        scheduledSize,
                    });
                    onResizeRef.current(true);
                }, 10);
            }
        },
        [
            cancelPendingInitialResizeRetry,
            boardRole,
            getKibitzBoardMetricsSnapshot,
            currentRoomGameId,
            coordinateSafeInput,
            gameId,
            goban,
            allowTransientDragScaling,
            recenterGoban,
            respectContainerBounds,
            scheduleInitialResizeRetry,
            isGobanStillUsable,
            fitMode,
        ],
    );

    React.useEffect(() => {
        onResizeRef.current = onResize;
    }, [onResize]);

    React.useEffect(() => {
        if (!allowTransientDragScaling || !resizeDebounceRef.current) {
            return;
        }

        clearTimeout(resizeDebounceRef.current);
        resizeDebounceRef.current = null;
    }, [allowTransientDragScaling]);

    React.useEffect(() => {
        if (!goban || !coordinateSafeInput || allowTransientDragScaling) {
            return;
        }

        if (wasTransientDragScalingRef.current) {
            return;
        }

        const controllerEpoch = controllerEpochRef.current;
        if (didImmediateCoordinateSafeResizeRef.current === controllerEpoch) {
            return;
        }

        didImmediateCoordinateSafeResizeRef.current = controllerEpoch;
        onResize(true);
    }, [allowTransientDragScaling, coordinateSafeInput, goban, onResize]);

    React.useEffect(() => {
        wasTransientDragScalingRef.current = allowTransientDragScaling;
    }, [allowTransientDragScaling]);

    React.useEffect(() => {
        if (!goban) {
            return;
        }

        initialResizeRetryCountRef.current = 0;
        initialResizeRetryTimedOutRef.current = false;

        let cancelled = false;
        let frame1 = 0;
        let frame2 = 0;

        frame1 = window.requestAnimationFrame(() => {
            frame2 = window.requestAnimationFrame(() => {
                if (cancelled) {
                    return;
                }

                onResize(true);
            });
        });

        return () => {
            cancelled = true;
            window.cancelAnimationFrame(frame1);
            window.cancelAnimationFrame(frame2);
        };
    }, [goban, onResize, size]);

    const previousLoggedSizePropRef = React.useRef<number | null>(null);
    React.useEffect(() => {
        const nextSizeProp = size ?? null;
        if (previousLoggedSizePropRef.current === nextSizeProp) {
            return;
        }

        previousLoggedSizePropRef.current = nextSizeProp;
        recordKibitzBoardSizeEvent("kibitz-board:metrics:size-prop-change", {
            ...getKibitzBoardMetricsSnapshot("size-prop-change"),
        });
    }, [getKibitzBoardMetricsSnapshot, size]);

    React.useEffect(() => cancelPendingInitialResizeRetry, [cancelPendingInitialResizeRetry]);

    React.useEffect(() => {
        return () => {
            if (resizeDebounceRef.current) {
                clearTimeout(resizeDebounceRef.current);
                resizeDebounceRef.current = null;
            }
        };
    }, []);

    React.useEffect(() => {
        if (boardHostReadyKey !== boardHostReadinessKey) {
            return;
        }

        const labelPosition = preferences.get("label-positioning");
        const config: GobanRendererConfig = {
            board_div: gobanDiv.current,
            interactive,
            // Subscribe to game chat so the kibitz room's game pane can
            // surface what players are saying. Kibitz users count as
            // spectators on the watched game while subscribed.
            connect_to_chat: effectiveConnectToGame,
            draw_top_labels:
                showLabels && (labelPosition === "all" || labelPosition.indexOf("top") >= 0),
            draw_left_labels:
                showLabels && (labelPosition === "all" || labelPosition.indexOf("left") >= 0),
            draw_right_labels:
                showLabels && (labelPosition === "all" || labelPosition.indexOf("right") >= 0),
            draw_bottom_labels:
                showLabels && (labelPosition === "all" || labelPosition.indexOf("bottom") >= 0),
            variation_stone_opacity: preferences.get("variation-stone-opacity"),
            stone_font_scale: preferences.get("stone-font-scale"),
            square_size: "auto",
            game_id: effectiveConnectToGame ? gameId : undefined,
            move_tree: moveTreeRef.current,
            width,
            height,
        };

        controllerEpochRef.current += 1;
        controllerRef.current?.destroy();
        controllerRef.current = new GobanController(config);
        controllerEpochRef.current += 1;
        controllerPublishedRef.current = false;
        if (!effectiveConnectToGame) {
            logKibitzVariationDebug("kibitz-board:connect-suppressed", {
                role: boardRole,
                gameId,
                currentRoomGameId,
                isMobile,
            });
        }

        const logBoardState = (reason: string, extra: Record<string, unknown> = {}) => {
            const currentController = controllerRef.current;
            if (!currentController) {
                return;
            }

            const currentEngine = currentController.goban.engine;
            const officialTail = getMoveTreeTrunkTail(currentEngine.move_tree);

            logKibitzVariationDebug("main-board:state", {
                reason,
                role: boardRole,
                gameId,
                currentRoomGameId,
                isMobile,
                restoreToOfficialTailOnLoad,
                currentMove: summarizeKibitzMoveTreeNode(currentEngine.cur_move),
                currentMoveNumber: currentEngine.cur_move?.move_number ?? null,
                currentMoveId: currentEngine.cur_move?.id ?? null,
                officialTail: summarizeKibitzMoveTreeNode(officialTail),
                officialTailMoveNumber: officialTail?.move_number ?? null,
                officialTailId: officialTail?.id ?? null,
                lastOfficialMove: summarizeKibitzMoveTreeNode(currentEngine.last_official_move),
                lastOfficialMoveNumber: currentEngine.last_official_move?.move_number ?? null,
                lastOfficialMoveId: currentEngine.last_official_move?.id ?? null,
                ...extra,
            });
        };

        const hasRestorableBoardState = Boolean(moveTreeRef.current || sourceMovePathRef.current);

        const clearPendingLiveMoveRestore = () => {
            const pending = pendingLiveMoveRestoreRef.current;
            if (!pending) {
                return;
            }

            clearTimeout(pending.timeout);
            pendingLiveMoveRestoreRef.current = null;
        };

        const captureCurrentMovePath = (move?: MoveTree) => {
            if (restoringBoardRef.current || !controllerRef.current) {
                return;
            }

            const { engine } = controllerRef.current.goban;
            const currentMove = move ?? engine.cur_move;
            const previousMove = currentMoveNodeRef.current;
            const officialMove = engine.last_official_move;
            const isPossibleLiveMoveJumpToParent =
                previousMove &&
                !previousMove.trunk &&
                previousMove.parent?.id === officialMove.id &&
                currentMove.id === officialMove.id;

            if (isPossibleLiveMoveJumpToParent) {
                const path = previousMove.getMoveStringToThisPoint();
                pendingLiveMoveRestoreRef.current = {
                    node: previousMove,
                    path,
                    timeout: setTimeout(() => {
                        if (pendingLiveMoveRestoreRef.current?.node.id !== previousMove.id) {
                            return;
                        }

                        pendingLiveMoveRestoreRef.current = null;
                        currentMoveNodeRef.current = engine.cur_move;
                        currentMovePathRef.current = engine.cur_move.getMoveStringToThisPoint();
                        preferSourceMovePathRef.current = false;
                    }, 0),
                };
                return;
            }

            if (pendingLiveMoveRestoreRef.current) {
                return;
            }

            currentMoveNodeRef.current = currentMove;
            currentMovePathRef.current =
                controllerRef.current.goban.engine.cur_move.getMoveStringToThisPoint();
            preferSourceMovePathRef.current = false;
        };

        const restorePendingLiveMoveCursor = () => {
            const pending = pendingLiveMoveRestoreRef.current;
            if (!pending || !controllerRef.current) {
                return;
            }

            clearPendingLiveMoveRestore();
            restoringBoardRef.current = true;
            try {
                controllerRef.current.goban.engine.jumpTo(pending.node);
                controllerRef.current.goban.redraw(true);
                currentMoveNodeRef.current = pending.node;
                currentMovePathRef.current = pending.path;
                preferSourceMovePathRef.current = false;
            } finally {
                restoringBoardRef.current = false;
            }
        };

        const restoreBoardState = (movePathToRestore?: string) => {
            if (!controllerRef.current) {
                return;
            }

            // Anchor the official move before applying/restoring a variation path.
            refreshLastOfficialMoveFromTrunk(controllerRef.current);
            if (movePathToRestore) {
                controllerRef.current.goban.engine.followPath(0, movePathToRestore);
            }
            controllerRef.current.goban.redraw(true);
            const restoredMovePath =
                controllerRef.current.goban.engine.cur_move.getMoveStringToThisPoint();
            currentMoveNodeRef.current = controllerRef.current.goban.engine.cur_move;
            currentMovePathRef.current = restoredMovePath;
            preferSourceMovePathRef.current =
                movePathToRestore !== undefined && restoredMovePath !== movePathToRestore;
        };

        const handleLoad = () => {
            if (!hasRestorableBoardState) {
                return;
            }

            const movePathToRestore = getMovePathToRestore(
                currentMovePathRef.current,
                sourceMovePathRef.current,
                preferSourceMovePathRef.current,
            );
            restoringBoardRef.current = true;
            try {
                restoreBoardState(movePathToRestore);
            } finally {
                restoringBoardRef.current = false;
            }
        };

        if (hasRestorableBoardState) {
            controllerRef.current.goban.on("cur_move", captureCurrentMovePath);
            controllerRef.current.goban.on("move-made", restorePendingLiveMoveCursor);
            controllerRef.current.goban.on("load", handleLoad);
            handleLoad();
        }
        if (restoreToOfficialTailOnLoad) {
            logBoardState("controller-create");
        }
        setGoban(controllerRef.current.goban);
        recordKibitzBoardSizeEvent("kibitz-board:metrics:goban-created", {
            ...getKibitzBoardMetricsSnapshot("goban-created"),
        });
        onReady?.(controllerRef.current);
        controllerPublishedRef.current = true;

        return () => {
            if (controllerPublishedRef.current) {
                onReady?.(null);
            }
            controllerPublishedRef.current = false;
            recordKibitzLifecycleEvent("kibitz-board:destroy", {
                role: boardRole,
                gameId,
                currentRoomGameId,
                controllerGameId: controllerRef.current?.goban.config?.game_id ?? null,
                controllerEpoch: controllerEpochRef.current,
            });
            if (resizeDebounceRef.current) {
                clearTimeout(resizeDebounceRef.current);
                resizeDebounceRef.current = null;
            }
            cancelPendingInitialResizeRetry();
            clearPendingLiveMoveRestore();
            controllerRef.current?.goban.off("cur_move", captureCurrentMovePath);
            controllerRef.current?.goban.off("move-made", restorePendingLiveMoveCursor);
            controllerRef.current?.goban.off("load", handleLoad);
            controllerEpochRef.current += 1;
            controllerRef.current?.destroy();
            controllerRef.current = null;
            setGoban(null);
        };
    }, [
        gameId,
        effectiveConnectToGame,
        currentRoomGameId,
        isMobile,
        width,
        height,
        interactive,
        onReady,
        restoreToOfficialTailOnLoad,
        role,
        showLabels,
        boardHostReadyKey,
        boardHostReadinessKey,
    ]);

    React.useEffect(() => {
        if (!goban || !restoreToOfficialTailOnLoad || !controllerRef.current) {
            return;
        }

        const boardRole = role ?? "main";
        const logBoardState = (reason: string, extra: Record<string, unknown> = {}) => {
            const currentController = controllerRef.current;
            if (!currentController) {
                return;
            }

            const currentEngine = currentController.goban.engine;
            const officialTail = getMoveTreeTrunkTail(currentEngine.move_tree);

            logKibitzVariationDebug("main-board:state", {
                reason,
                role: boardRole,
                gameId,
                restoreToOfficialTailOnLoad,
                currentMove: summarizeKibitzMoveTreeNode(currentEngine.cur_move),
                currentMoveNumber: currentEngine.cur_move?.move_number ?? null,
                officialTail: summarizeKibitzMoveTreeNode(officialTail),
                officialTailMoveNumber: officialTail?.move_number ?? null,
                lastOfficialMove: summarizeKibitzMoveTreeNode(currentEngine.last_official_move),
                lastOfficialMoveNumber: currentEngine.last_official_move?.move_number ?? null,
                ...extra,
            });
        };

        const handleRestoreToOfficialTail = (reason: string) => {
            if (!controllerRef.current) {
                return;
            }

            if (restoringBoardRef.current) {
                return;
            }

            const currentEngine = controllerRef.current.goban.engine;
            const currentMoveNumber = currentEngine.cur_move?.move_number ?? null;
            const currentMoveNodeId = currentEngine.cur_move?.id ?? null;
            const officialTail = getMoveTreeTrunkTail(currentEngine.move_tree);
            const officialTailMoveNumber = officialTail?.move_number ?? 0;
            const officialTailNodeId = officialTail?.id ?? null;
            if (
                !shouldRestoreMainBoardToOfficialTail({
                    gameId,
                    currentMoveNumber: currentMoveNumber ?? 0,
                    currentMoveNodeId,
                    officialTailMoveNumber,
                    lastRestored: restoredOfficialTailRef.current,
                })
            ) {
                logBoardState(`${reason}:restore-skipped`, {
                    currentMoveNumber,
                    currentMoveNodeId,
                    officialTailMoveNumber,
                    officialTailNodeId,
                    lastRestored: restoredOfficialTailRef.current,
                });
                return;
            }

            logBoardState(`${reason}:restore-attempt`);
            restoringBoardRef.current = true;
            try {
                const restoredTail = restoreToOfficialTail(controllerRef.current);
                logBoardState(`${reason}:restore-result`, {
                    restored: Boolean(restoredTail),
                    restoredTailMoveNumber: restoredTail?.move_number ?? null,
                    restoredTailId: restoredTail?.id ?? null,
                });

                if (
                    !restoredTail &&
                    effectiveConnectToGame &&
                    gameId != null &&
                    requestedHydrationGameIdRef.current !== gameId
                ) {
                    requestedHydrationGameIdRef.current = gameId;
                    logKibitzVariationDebug("main-board:hydrate-request", {
                        reason,
                        role: boardRole,
                        gameId,
                    });
                    // The controller is already connected through OGSConnectivity.
                    // Defer to its normal load/gamedata path instead of sending a
                    // second raw connect here, which can race a still-hydrating board.
                } else if (restoredTail && gameId != null) {
                    restoredOfficialTailRef.current = {
                        gameId,
                        moveNumber: restoredTail.move_number,
                        nodeId: restoredTail.id,
                    };
                }
            } finally {
                restoringBoardRef.current = false;
            }
        };

        const onLoad = () => {
            handleRestoreToOfficialTail("load");
        };
        const onGameData = () => {
            handleRestoreToOfficialTail("gamedata");
        };
        const onLastOfficialMove = () => {
            handleRestoreToOfficialTail("last_official_move");
        };
        const onMoveMade = () => {
            logBoardState("move-made");
            handleRestoreToOfficialTail("move-made");
        };

        goban.on("load", onLoad);
        goban.on("gamedata", onGameData);
        goban.on("last_official_move", onLastOfficialMove);
        goban.on("move-made", onMoveMade);
        handleRestoreToOfficialTail("mount");

        return () => {
            goban.off("load", onLoad);
            goban.off("gamedata", onGameData);
            goban.off("last_official_move", onLastOfficialMove);
            goban.off("move-made", onMoveMade);
        };
    }, [
        gameId,
        goban,
        effectiveConnectToGame,
        currentRoomGameId,
        isMobile,
        restoreToOfficialTailOnLoad,
        role,
    ]);

    React.useEffect(() => {
        if (!goban || !size || size <= 0) {
            return;
        }

        let cancelled = false;
        let frame1 = 0;
        let frame2 = 0;
        const scheduledController = goban;
        const scheduledControllerEpoch = controllerEpochRef.current;

        frame1 = window.requestAnimationFrame(() => {
            frame2 = window.requestAnimationFrame(() => {
                if (
                    cancelled ||
                    controllerEpochRef.current !== scheduledControllerEpoch ||
                    !isGobanStillUsable(scheduledController) ||
                    controllerRef.current?.goban !== scheduledController
                ) {
                    if (!cancelled) {
                        recordKibitzLifecycleEvent("kibitz-board:delayed-callback-skip-destroyed", {
                            role: boardRole,
                            gameId,
                            currentRoomGameId,
                            reason: "post-mount-redraw",
                            scheduledControllerEpoch,
                            currentControllerEpoch: controllerEpochRef.current,
                            scheduledControllerGameId: scheduledController?.config?.game_id ?? null,
                            currentControllerGameId:
                                controllerRef.current?.goban.config?.game_id ?? null,
                        });
                    }
                    return;
                }

                scheduledController.redraw(true);
                scheduledController.move_tree_redraw?.(true);
            });
        });

        return () => {
            cancelled = true;
            window.cancelAnimationFrame(frame1);
            window.cancelAnimationFrame(frame2);
        };
    }, [boardRole, currentRoomGameId, gameId, goban, size]);

    React.useEffect(() => {
        if (!shouldDeferGobanContainer) {
            return;
        }

        logKibitzVariationDebug("kibitz-board:defer-goban-container-invalid-size", {
            role: boardRole,
            size,
        });
    }, [boardRole, shouldDeferGobanContainer, size]);

    const shouldRecordPointerCapture = interactive || (isMobile && boardRole === "secondary");
    const handlePointerDownCapture = React.useCallback(
        (event: React.PointerEvent<HTMLDivElement>) => {
            if (!shouldRecordPointerCapture || !isKibitzBoardSizeDebugEnabled()) {
                return;
            }

            const gobanElement = gobanDiv.current;
            const gobanRect = gobanElement.getBoundingClientRect();
            const metrics =
                controllerRef.current?.goban?.computeMetrics?.() ?? goban?.computeMetrics?.();
            const visualToInternalScaleX =
                metrics && metrics.width > 0 ? gobanRect.width / metrics.width : null;
            const visualToInternalScaleY =
                metrics && metrics.height > 0 ? gobanRect.height / metrics.height : null;

            recordKibitzBoardSizeEvent("kibitz-board:pointer-down-capture", {
                ...getKibitzBoardMetricsSnapshot("pointer-down-capture"),
                pointerType: event.pointerType,
                clientX: event.clientX,
                clientY: event.clientY,
                relativeToGobanElement: gobanRect
                    ? {
                          x: event.clientX - gobanRect.left,
                          y: event.clientY - gobanRect.top,
                      }
                    : null,
                visualToInternalScaleX,
                visualToInternalScaleY,
            });
        },
        [
            boardRole,
            goban,
            getKibitzBoardMetricsSnapshot,
            interactive,
            isMobile,
            shouldRecordPointerCapture,
        ],
    );
    const handlePointerUpCapture = React.useCallback(
        (event: React.PointerEvent<HTMLDivElement>) => {
            if (!shouldRecordPointerCapture || !isKibitzBoardSizeDebugEnabled()) {
                return;
            }

            recordKibitzBoardSizeEvent("kibitz-board:pointer-up-capture", {
                ...getKibitzBoardMetricsSnapshot("pointer-up-capture"),
                pointerType: event.pointerType,
                clientX: event.clientX,
                clientY: event.clientY,
            });
        },
        [getKibitzBoardMetricsSnapshot, shouldRecordPointerCapture],
    );

    if (shouldDeferGobanContainer) {
        return (
            <div
                className={"KibitzBoard" + (className ? ` ${className}` : "")}
                data-kibitz-board-pending-size="true"
                style={{
                    width: "100%",
                    height: "100%",
                    flex: "0 0 auto",
                }}
                aria-hidden="true"
            />
        );
    }

    return (
        <div
            ref={boardHostRef}
            className={"KibitzBoard" + (className ? ` ${className}` : "")}
            onPointerDownCapture={handlePointerDownCapture}
            onPointerUpCapture={handlePointerUpCapture}
            style={
                displaySize
                    ? {
                          width: `${displaySize}px`,
                          height: `${displaySize}px`,
                          flex: "0 0 auto",
                          pointerEvents:
                              coordinateSafeInput &&
                              (allowTransientDragScaling || transientDragFinalizingRef.current)
                                  ? "none"
                                  : undefined,
                      }
                    : coordinateSafeInput &&
                        (allowTransientDragScaling || transientDragFinalizingRef.current)
                      ? {
                            pointerEvents: "none",
                        }
                      : undefined
            }
        >
            <div ref={gobanContainerRef} className="goban-container">
                <OgsResizeDetector onResize={onResize} targetRef={gobanContainerRef} />
                <PersistentElement className="Goban" elt={gobanDiv.current} />
            </div>
        </div>
    );
}
