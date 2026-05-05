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
import * as DynamicHelp from "react-dynamic-help";

import type { KibitzRoomSummary } from "@/models/kibitz";

import { KIBITZ_HELP_FLOW_IDS } from "./KibitzHelpFlows";

type KibitzHelpFlowId = (typeof KIBITZ_HELP_FLOW_IDS)[keyof typeof KIBITZ_HELP_FLOW_IDS];

type UseKibitzHelpTriggersArgs = {
    isMobileLayout: boolean;
    room: KibitzRoomSummary | null;
    flowReadiness: Record<KibitzHelpFlowId, boolean>;
    pickerOpen: boolean;
    mobileOverlayOpen: boolean;
    canManageRoom: boolean;
    selectedVariationId: string | null;
    selectedVariationReady: boolean;
};

type UseKibitzHelpTriggersResult = {
    noteMobileVariationsPanelOpened: () => void;
    noteDesktopVariationMadeVisible: () => void;
    requestFlow: (flowId: KibitzHelpFlowId) => void;
};

function getVisibleFlowId(flowInfo: ReturnType<DynamicHelp.AppApi["getFlowInfo"]>): string | null {
    const visibleFlow = flowInfo.find((flow) => flow.visible);
    return visibleFlow?.id ?? null;
}

export function useKibitzHelpTriggers({
    isMobileLayout,
    room,
    flowReadiness,
    pickerOpen,
    mobileOverlayOpen,
    canManageRoom,
    selectedVariationId,
    selectedVariationReady,
}: UseKibitzHelpTriggersArgs): UseKibitzHelpTriggersResult {
    const { triggerFlow, getFlowInfo, getSystemStatus } = React.useContext(DynamicHelp.Api);
    const previousRoomIdRef = React.useRef<string | null>(null);
    const previousRoomGameIdRef = React.useRef<number | null>(null);
    const previousSelectedVariationIdRef = React.useRef<string | null>(null);
    const pendingFlowRequestsRef = React.useRef<Set<KibitzHelpFlowId>>(new Set());
    const [pendingFlowTick, setPendingFlowTick] = React.useState(0);

    const requestFlow = React.useCallback(
        (flowId: KibitzHelpFlowId) => {
            const flowInfo = getFlowInfo();
            const flowState = flowInfo.find((flow) => flow.id === flowId);
            if (flowState?.visible || flowState?.seen) {
                return;
            }

            if (pendingFlowRequestsRef.current.has(flowId)) {
                return;
            }

            pendingFlowRequestsRef.current.add(flowId);
            setPendingFlowTick((value) => value + 1);
        },
        [getFlowInfo],
    );

    const flushPendingFlowRequests = React.useCallback(() => {
        if (!getSystemStatus().initialized) {
            return;
        }

        const flowInfo = getFlowInfo();
        if (getVisibleFlowId(flowInfo) != null) {
            return;
        }

        for (const flowId of pendingFlowRequestsRef.current) {
            const flowState = flowInfo.find((flow) => flow.id === flowId);
            if (flowState?.visible || flowState?.seen) {
                pendingFlowRequestsRef.current.delete(flowId);
                continue;
            }

            if (!flowReadiness[flowId]) {
                continue;
            }

            if (!flowState) {
                continue;
            }

            triggerFlow(flowId);
            pendingFlowRequestsRef.current.delete(flowId);
            break;
        }
    }, [flowReadiness, getFlowInfo, getSystemStatus, triggerFlow]);

    React.useEffect(() => {
        if (!room || pickerOpen || mobileOverlayOpen) {
            previousRoomIdRef.current = room?.id ?? null;
            previousRoomGameIdRef.current = room?.current_game?.game_id ?? null;
            return;
        }

        const currentRoomId = room.id;
        const currentGameId = room.current_game?.game_id ?? null;
        const previousRoomId = previousRoomIdRef.current;
        const previousGameId = previousRoomGameIdRef.current;

        previousRoomIdRef.current = currentRoomId;
        previousRoomGameIdRef.current = currentGameId;

        if (previousRoomId == null || previousRoomId !== currentRoomId) {
            return;
        }

        if (previousGameId == null || previousGameId === currentGameId) {
            return;
        }

        requestFlow(KIBITZ_HELP_FLOW_IDS.roomBoardChange);
    }, [mobileOverlayOpen, pickerOpen, requestFlow, room]);

    React.useEffect(() => {
        if (!room || pickerOpen || mobileOverlayOpen) {
            return;
        }

        if (selectedVariationId == null) {
            previousSelectedVariationIdRef.current = null;
            return;
        }

        if (!selectedVariationReady) {
            return;
        }

        const previousSelectedVariationId = previousSelectedVariationIdRef.current;
        previousSelectedVariationIdRef.current = selectedVariationId;

        if (previousSelectedVariationId === selectedVariationId) {
            return;
        }

        requestFlow(
            isMobileLayout
                ? KIBITZ_HELP_FLOW_IDS.mobilePostedVariation
                : KIBITZ_HELP_FLOW_IDS.desktopPostedVariation,
        );
    }, [
        isMobileLayout,
        mobileOverlayOpen,
        pickerOpen,
        requestFlow,
        room,
        selectedVariationId,
        selectedVariationReady,
    ]);

    React.useEffect(() => {
        if (!room || pickerOpen || mobileOverlayOpen) {
            return;
        }

        requestFlow(
            isMobileLayout
                ? KIBITZ_HELP_FLOW_IDS.mobileFirstRun
                : KIBITZ_HELP_FLOW_IDS.desktopFirstRun,
        );
    }, [isMobileLayout, mobileOverlayOpen, pickerOpen, requestFlow, room]);

    React.useEffect(() => {
        if (!room || pickerOpen || mobileOverlayOpen || !canManageRoom) {
            return;
        }

        requestFlow(KIBITZ_HELP_FLOW_IDS.roomManagement);
    }, [canManageRoom, mobileOverlayOpen, pickerOpen, requestFlow, room]);

    const noteMobileVariationsPanelOpened = React.useCallback(() => {
        if (!isMobileLayout) {
            return;
        }

        requestFlow(KIBITZ_HELP_FLOW_IDS.mobileFirstVariations);
    }, [isMobileLayout, requestFlow]);

    const noteDesktopVariationMadeVisible = React.useCallback(() => {
        if (isMobileLayout) {
            return;
        }

        requestFlow(KIBITZ_HELP_FLOW_IDS.desktopFirstVariations);
    }, [isMobileLayout, requestFlow]);

    React.useEffect(() => {
        if (pendingFlowRequestsRef.current.size === 0) {
            return;
        }

        const intervalId = window.setInterval(() => {
            if (pendingFlowRequestsRef.current.size === 0) {
                window.clearInterval(intervalId);
                return;
            }

            flushPendingFlowRequests();

            if (pendingFlowRequestsRef.current.size === 0) {
                window.clearInterval(intervalId);
            }
        }, 1200);

        flushPendingFlowRequests();

        if (pendingFlowRequestsRef.current.size === 0) {
            window.clearInterval(intervalId);
            return;
        }

        return () => {
            window.clearInterval(intervalId);
        };
    }, [flushPendingFlowRequests, pendingFlowTick]);

    return {
        noteMobileVariationsPanelOpened,
        noteDesktopVariationMadeVisible,
        requestFlow,
    };
}
