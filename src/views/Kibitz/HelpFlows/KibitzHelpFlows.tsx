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
import { HelpFlow, HelpItem } from "react-dynamic-help";

import { pgettext } from "@/lib/translate";

import { KIBITZ_HELP_TARGETS } from "./KibitzHelpTargets";

export const KIBITZ_HELP_FLOW_IDS = {
    mobileFirstRun: "kibitz-mobile-first-run",
    desktopFirstRun: "kibitz-desktop-first-run",
    mobileFirstVariations: "kibitz-mobile-first-variations",
    desktopFirstVariations: "kibitz-desktop-first-variations",
    mobilePostedVariation: "kibitz-mobile-posted-variation",
    desktopPostedVariation: "kibitz-desktop-posted-variation",
    draftFromPostedVariation: "kibitz-first-draft-from-posted-variation",
    roomBoardChange: "kibitz-first-room-board-change",
    roomManagement: "kibitz-first-room-management",
} as const;

const KIBITZ_MOBILE_LAYOUT_MEDIA_QUERY = "(max-width: 1000px)";

export function KibitzHelpFlows(): React.ReactElement {
    const [isDesktop, setIsDesktop] = React.useState(
        () => !window.matchMedia(KIBITZ_MOBILE_LAYOUT_MEDIA_QUERY).matches,
    );

    React.useEffect(() => {
        const mediaQuery = window.matchMedia(KIBITZ_MOBILE_LAYOUT_MEDIA_QUERY);
        const updateIsDesktop = () => {
            setIsDesktop(!mediaQuery.matches);
        };

        updateIsDesktop();
        mediaQuery.addEventListener("change", updateIsDesktop);

        return () => {
            mediaQuery.removeEventListener("change", updateIsDesktop);
        };
    }, []);

    const draftActionTarget = isDesktop
        ? KIBITZ_HELP_TARGETS.desktopVariationActions
        : KIBITZ_HELP_TARGETS.mobileVariationActions;
    const roomBoardChangeTarget = isDesktop
        ? KIBITZ_HELP_TARGETS.desktopMainBoard
        : KIBITZ_HELP_TARGETS.mobileMainBoard;
    const roomManagementTarget = isDesktop
        ? KIBITZ_HELP_TARGETS.desktopRoomSettings
        : KIBITZ_HELP_TARGETS.mobileRoomMenu;

    return (
        <>
            <HelpFlow
                id={KIBITZ_HELP_FLOW_IDS.mobileFirstRun}
                showInitially={false}
                description={pgettext(
                    "Name of a dynamic help flow for Kibitz mobile first-run onboarding",
                    "Kibitz mobile first run",
                )}
            >
                <HelpItem target={KIBITZ_HELP_TARGETS.mobileRoomTitle} position="bottom-centre">
                    {pgettext(
                        "Kibitz mobile help bubble explaining the room title",
                        "Tap the room name to switch rooms.",
                    )}
                </HelpItem>
                <HelpItem target={KIBITZ_HELP_TARGETS.mobileMainBoard} position="bottom-centre">
                    {pgettext(
                        "Kibitz mobile help bubble explaining the main board",
                        "This is the room's main board. Everyone here is looking at this game.",
                    )}
                </HelpItem>
                <HelpItem target={KIBITZ_HELP_TARGETS.mobilePanelSwitcher} position="top-centre">
                    {pgettext(
                        "Kibitz mobile help bubble explaining the panel switcher",
                        "Click this button to switch between watching Chat and watching Variations.",
                    )}
                </HelpItem>
                <HelpItem target={KIBITZ_HELP_TARGETS.mobileVariationsTab} position="top-centre">
                    {pgettext(
                        "Kibitz mobile help bubble explaining the variations tab",
                        "Open Variations to inspect posted lines.",
                    )}
                </HelpItem>
            </HelpFlow>

            <HelpFlow
                id={KIBITZ_HELP_FLOW_IDS.desktopFirstRun}
                showInitially={false}
                description={pgettext(
                    "Name of a dynamic help flow for Kibitz desktop first-run onboarding",
                    "Kibitz desktop first run",
                )}
            >
                <HelpItem target={KIBITZ_HELP_TARGETS.desktopRoomList} position="center-right">
                    {pgettext(
                        "Kibitz desktop help bubble explaining the room list",
                        "Rooms. Choose a Kibitz room here. Each room has its own main board, chat, and variations.",
                    )}
                </HelpItem>
                <HelpItem target={KIBITZ_HELP_TARGETS.desktopMainBoard} position="center-right">
                    {pgettext(
                        "Kibitz desktop help bubble explaining the main board",
                        "Main board. This is the game the room is watching together.",
                    )}
                </HelpItem>
                <HelpItem target={KIBITZ_HELP_TARGETS.desktopVariations} position="top-centre">
                    {pgettext(
                        "Kibitz desktop help bubble explaining the variations area",
                        "Variations. Open posted lines here to inspect or continue them.",
                    )}
                </HelpItem>
                <HelpItem target={KIBITZ_HELP_TARGETS.desktopStream} position="center-left">
                    {pgettext(
                        "Kibitz desktop help bubble explaining the stream panel",
                        "Chat and room events appear here. Posted variations also show up in the room history.",
                    )}
                </HelpItem>
            </HelpFlow>

            <HelpFlow
                id={KIBITZ_HELP_FLOW_IDS.mobileFirstVariations}
                showInitially={false}
                description={pgettext(
                    "Name of a dynamic help flow for Kibitz mobile variations introduction",
                    "Kibitz mobile variations introduction",
                )}
            >
                <HelpItem target={KIBITZ_HELP_TARGETS.mobileVariationsPanel} position="top-centre">
                    {pgettext(
                        "Kibitz mobile help bubble for the variations panel",
                        "Variations are shared lines from this room.",
                    )}
                </HelpItem>
            </HelpFlow>

            <HelpFlow
                id={KIBITZ_HELP_FLOW_IDS.desktopFirstVariations}
                showInitially={false}
                description={pgettext(
                    "Name of a dynamic help flow for Kibitz desktop variations introduction",
                    "Kibitz desktop variations introduction",
                )}
            >
                <HelpItem target={KIBITZ_HELP_TARGETS.desktopVariations} position="top-centre">
                    {pgettext(
                        "Kibitz desktop help bubble for the variations area",
                        "Variations are shared lines from this room. Opening one lets you inspect it without changing the main board.",
                    )}
                </HelpItem>
            </HelpFlow>

            <HelpFlow
                id={KIBITZ_HELP_FLOW_IDS.mobilePostedVariation}
                showInitially={false}
                description={pgettext(
                    "Name of a dynamic help flow for Kibitz mobile posted variation viewing",
                    "Kibitz mobile posted variation",
                )}
            >
                <HelpItem target={KIBITZ_HELP_TARGETS.mobileVariationBoard} position="top-centre">
                    {pgettext(
                        "Kibitz mobile help bubble for a posted variation board",
                        "You're viewing a posted variation. Tap the To main board button to return to the main board.",
                    )}
                </HelpItem>
            </HelpFlow>

            <HelpFlow
                id={KIBITZ_HELP_FLOW_IDS.desktopPostedVariation}
                showInitially={false}
                description={pgettext(
                    "Name of a dynamic help flow for Kibitz desktop posted variation viewing",
                    "Kibitz desktop posted variation",
                )}
            >
                <HelpItem target={KIBITZ_HELP_TARGETS.desktopVariationBoard} position="top-centre">
                    {pgettext(
                        "Kibitz desktop help bubble for a posted variation board",
                        "You're viewing a posted variation. The main board remains the room's shared game.",
                    )}
                </HelpItem>
            </HelpFlow>

            <HelpFlow
                id={KIBITZ_HELP_FLOW_IDS.draftFromPostedVariation}
                showInitially={false}
                description={pgettext(
                    "Name of a dynamic help flow for Kibitz branching from a posted variation",
                    "Kibitz draft from posted variation",
                )}
            >
                <HelpItem target={draftActionTarget} position="top-centre">
                    {pgettext(
                        "Kibitz help bubble explaining how drafts start from posted variations",
                        "Starting from here creates a new draft. It does not edit the posted variation.",
                    )}
                </HelpItem>
            </HelpFlow>

            <HelpFlow
                id={KIBITZ_HELP_FLOW_IDS.roomBoardChange}
                showInitially={false}
                description={pgettext(
                    "Name of a dynamic help flow for Kibitz board changes",
                    "Kibitz room board change",
                )}
            >
                <HelpItem target={roomBoardChangeTarget} position="bottom-centre">
                    {pgettext(
                        "Kibitz help bubble explaining that the room board changed",
                        "The room changed to a new main board. Chat and room history stay with this room.",
                    )}
                </HelpItem>
            </HelpFlow>

            <HelpFlow
                id={KIBITZ_HELP_FLOW_IDS.roomManagement}
                showInitially={false}
                description={pgettext(
                    "Name of a dynamic help flow for Kibitz room management",
                    "Kibitz room management",
                )}
            >
                <HelpItem target={roomManagementTarget} position="bottom-centre">
                    {pgettext(
                        "Kibitz help bubble for room management",
                        "Room settings. Manage room details and the live game from here.",
                    )}
                </HelpItem>
            </HelpFlow>
        </>
    );
}
