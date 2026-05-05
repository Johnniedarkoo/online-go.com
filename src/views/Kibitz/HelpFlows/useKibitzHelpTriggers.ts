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

type UseKibitzHelpTriggersArgs = {
    isMobileLayout: boolean;
    room: KibitzRoomSummary | null;
    mainBoardReady: boolean;
    pickerOpen: boolean;
    mobileOverlayOpen: boolean;
    canManageRoom: boolean;
    draftHelpReady: boolean;
    selectedVariationId: string | null;
    selectedVariationReady: boolean;
};

type UseKibitzHelpTriggersResult = {
    noteMobileVariationsPanelOpened: () => void;
    noteDesktopVariationMadeVisible: () => void;
    requestFlow: (flowId: string) => boolean;
};

function getVisibleFlowId(flowInfo: ReturnType<DynamicHelp.AppApi["getFlowInfo"]>): string | null {
    const visibleFlow = flowInfo.find((flow) => flow.visible);
    return visibleFlow?.id ?? null;
}

export function useKibitzHelpTriggers({
    isMobileLayout,
    room,
    mainBoardReady,
    pickerOpen,
    mobileOverlayOpen,
    canManageRoom,
    draftHelpReady,
    selectedVariationId,
    selectedVariationReady,
}: UseKibitzHelpTriggersArgs): UseKibitzHelpTriggersResult {
    const { triggerFlow, getFlowInfo, getSystemStatus } = React.useContext(DynamicHelp.Api);
    const previousRoomGameIdRef = React.useRef<number | null>(null);
    const previousSelectedVariationIdRef = React.useRef<string | null>(null);
    const draftHelpRequestedRef = React.useRef(false);

    const maybeTriggerFlow = React.useCallback(
        (flowId: string) => {
            if (!getSystemStatus().initialized) {
                return false;
            }

            const flowInfo = getFlowInfo();
            if (!flowInfo.some((flow) => flow.id === flowId)) {
                return false;
            }

            if (getVisibleFlowId(flowInfo) != null) {
                return false;
            }

            triggerFlow(flowId);
            return true;
        },
        [getFlowInfo, getSystemStatus, triggerFlow],
    );

    React.useEffect(() => {
        if (!room || !mainBoardReady || pickerOpen || mobileOverlayOpen) {
            previousRoomGameIdRef.current = room?.current_game?.game_id ?? null;
            return;
        }

        const currentGameId = room.current_game?.game_id ?? null;
        const previousGameId = previousRoomGameIdRef.current;
        previousRoomGameIdRef.current = currentGameId;

        if (previousGameId == null || previousGameId === currentGameId) {
            return;
        }

        maybeTriggerFlow(KIBITZ_HELP_FLOW_IDS.roomBoardChange);
    }, [mainBoardReady, maybeTriggerFlow, mobileOverlayOpen, pickerOpen, room]);

    React.useEffect(() => {
        if (!room || !mainBoardReady || pickerOpen || mobileOverlayOpen) {
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

        maybeTriggerFlow(
            isMobileLayout
                ? KIBITZ_HELP_FLOW_IDS.mobilePostedVariation
                : KIBITZ_HELP_FLOW_IDS.desktopPostedVariation,
        );
    }, [
        canManageRoom,
        isMobileLayout,
        mainBoardReady,
        maybeTriggerFlow,
        mobileOverlayOpen,
        pickerOpen,
        room,
        selectedVariationId,
        selectedVariationReady,
    ]);

    React.useEffect(() => {
        if (!room || !mainBoardReady || pickerOpen || mobileOverlayOpen) {
            return;
        }

        maybeTriggerFlow(
            isMobileLayout
                ? KIBITZ_HELP_FLOW_IDS.mobileFirstRun
                : KIBITZ_HELP_FLOW_IDS.desktopFirstRun,
        );
    }, [isMobileLayout, mainBoardReady, maybeTriggerFlow, mobileOverlayOpen, pickerOpen, room]);

    React.useEffect(() => {
        if (!room || !mainBoardReady || pickerOpen || mobileOverlayOpen || !canManageRoom) {
            return;
        }

        const intervalId = window.setInterval(() => {
            maybeTriggerFlow(KIBITZ_HELP_FLOW_IDS.roomManagement);
        }, 1200);

        maybeTriggerFlow(KIBITZ_HELP_FLOW_IDS.roomManagement);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [canManageRoom, mainBoardReady, maybeTriggerFlow, mobileOverlayOpen, pickerOpen, room]);

    const noteMobileVariationsPanelOpened = React.useCallback(() => {
        if (!isMobileLayout) {
            return;
        }

        maybeTriggerFlow(KIBITZ_HELP_FLOW_IDS.mobileFirstVariations);
    }, [isMobileLayout, maybeTriggerFlow]);

    const noteDesktopVariationMadeVisible = React.useCallback(() => {
        if (isMobileLayout) {
            return;
        }

        maybeTriggerFlow(KIBITZ_HELP_FLOW_IDS.desktopFirstVariations);
    }, [isMobileLayout, maybeTriggerFlow]);

    React.useEffect(() => {
        if (!draftHelpReady) {
            draftHelpRequestedRef.current = false;
            return;
        }

        if (draftHelpRequestedRef.current) {
            return;
        }

        const attemptTrigger = () => {
            const triggered = maybeTriggerFlow(KIBITZ_HELP_FLOW_IDS.draftFromPostedVariation);
            if (triggered) {
                draftHelpRequestedRef.current = true;
            }
        };

        const intervalId = window.setInterval(attemptTrigger, 1200);
        attemptTrigger();

        return () => {
            window.clearInterval(intervalId);
        };
    }, [draftHelpReady, maybeTriggerFlow]);

    return {
        noteMobileVariationsPanelOpened,
        noteDesktopVariationMadeVisible,
        requestFlow: maybeTriggerFlow,
    };
}
