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
import { useLocation } from "react-router-dom";
import { pgettext } from "@/lib/translate";
import { KibitzController } from "./KibitzController";
import { KibitzInner } from "./KibitzInner";
import {
    KibitzHeaderDesignFixture,
    type KibitzHeaderDesignFixtureVariant,
} from "./KibitzHeaderDesignFixture";

const HEADER_DESIGN_FIXTURE_VARIANTS = new Set<KibitzHeaderDesignFixtureVariant>([
    "baseline",
    "current",
    "previous",
    "previous-streamer",
    "current-streamer",
]);

export function Kibitz(): React.ReactElement {
    const location = useLocation();
    const [controller, setController] = React.useState<KibitzController | null>(null);

    React.useEffect(() => {
        const nextController = new KibitzController();
        setController(nextController);

        return () => {
            nextController.destroy();
        };
    }, []);

    if (!controller) {
        return (
            <div className="Kibitz">{pgettext("Kibitz loading state", "Loading Kibitz...")}</div>
        );
    }

    const fixtureVariant = new URLSearchParams(location.search).get("kibitz-header-design");
    if (
        fixtureVariant &&
        HEADER_DESIGN_FIXTURE_VARIANTS.has(fixtureVariant as KibitzHeaderDesignFixtureVariant)
    ) {
        return (
            <KibitzHeaderDesignFixture
                variant={fixtureVariant as KibitzHeaderDesignFixtureVariant}
            />
        );
    }

    return <KibitzInner controller={controller} />;
}
