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

import { KIBITZ_HELP_TARGETS } from "./KibitzHelpTargets";

type KibitzHelpTargetId = (typeof KIBITZ_HELP_TARGETS)[keyof typeof KIBITZ_HELP_TARGETS];
type DynamicHelpApi = React.ContextType<typeof DynamicHelp.Api>;
type DynamicHelpTarget = ReturnType<DynamicHelpApi["registerTargetItem"]>;

/**
 * Register an RDH target after render and keep the same target object for the
 * lifetime of the mounted component.
 *
 * Calling registerTargetItem directly from a component body can ask the RDH
 * provider to update while React is rendering Kibitz. That is especially risky
 * in KibitzRoomStage, where many targets are present and the first-run trigger
 * can queue another update immediately afterwards.
 */
export function useKibitzHelpTarget(
    targetId: KibitzHelpTargetId | null | undefined,
): DynamicHelpTarget | null {
    const { registerTargetItem } = React.useContext(DynamicHelp.Api);
    const targetIdRef = React.useRef<KibitzHelpTargetId | null>(null);
    const targetRef = React.useRef<DynamicHelpTarget | null>(null);

    React.useEffect(() => {
        const resolvedTargetId = targetId ?? null;

        if (resolvedTargetId == null) {
            targetIdRef.current = null;
            targetRef.current = null;
            return;
        }

        if (targetIdRef.current === resolvedTargetId && targetRef.current != null) {
            return;
        }

        const nextTarget = registerTargetItem(resolvedTargetId);
        targetIdRef.current = resolvedTargetId;
        targetRef.current = nextTarget;
    }, [registerTargetItem, targetId]);

    return targetRef.current;
}
