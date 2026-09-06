/*
 * Copyright (C)  Online-Go.com
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import type { GobanController } from "@/lib/GobanController";
import type { KibitzVariationSummary } from "@/models/kibitz";
import type { MoveTree } from "goban";
import { officialTrunkNodeByMoveNumber, type AppliedKibitzVariation } from "./kibitzVariationTree";

export interface AppliedKibitzVariationPath extends AppliedKibitzVariation {
    revisionKey: string;
}

export type KibitzAppliedVariationPathRegistry = ReadonlyMap<string, AppliedKibitzVariationPath>;

export type KibitzVariationCursorBookmark =
    | {
          kind: "variation";
          variationId: string;
          pathIndex: number;
          revisionKey: string;
      }
    | {
          kind: "official";
          moveNumber: number;
      }
    | {
          kind: "fallback";
          movePath: string;
      };

export interface PendingKibitzVariationCursorRestore {
    variationId: string;
    controller: GobanController;
    controllerEpoch: number;
    roomId: string | null;
    gameId: number;
    operationId: number;
    cursorBookmark: KibitzVariationCursorBookmark;
    focusRequestId: number;
}

export interface KibitzVariationCursorRestoreContext {
    controller: GobanController;
    controllerEpoch: number;
    roomId: string | null;
    gameId: number;
    operationId: number;
    focusRequestId: number;
}

export function isCurrentKibitzVariationCursorRestore(
    pending: PendingKibitzVariationCursorRestore | null,
    context: KibitzVariationCursorRestoreContext,
): pending is PendingKibitzVariationCursorRestore {
    return Boolean(
        pending &&
        pending.controller === context.controller &&
        pending.controllerEpoch === context.controllerEpoch &&
        pending.roomId === context.roomId &&
        pending.gameId === context.gameId &&
        pending.operationId === context.operationId &&
        pending.focusRequestId === context.focusRequestId,
    );
}

export function buildKibitzVariationPathRevisionKey(variation: KibitzVariationSummary): string {
    return JSON.stringify([
        variation.id,
        variation.game_id,
        variation.analysis_from ?? null,
        variation.analysis_moves ?? null,
    ]);
}

function isOfficialTrunkNode(root: MoveTree, node: MoveTree): boolean {
    let cursor: MoveTree | undefined = root;
    while (cursor) {
        if (cursor === node) {
            return true;
        }
        cursor = cursor.trunk_next;
    }

    return false;
}

function findExistingMovePath(controller: GobanController, movePath: string): MoveTree | null {
    const engine = controller.goban.engine;
    let cursor = engine.move_tree;

    if (!movePath) {
        return cursor;
    }

    let decodedMoves;
    try {
        decodedMoves = engine.decodeMoves(movePath);
    } catch {
        return null;
    }

    for (const move of decodedMoves) {
        const next = cursor.lookupMove(
            move.x,
            move.y,
            engine.playerByColor(move.color || 0),
            !!move.edited,
        );
        if (!next) {
            return null;
        }

        cursor = next;
    }

    return cursor;
}

export function captureKibitzVariationCursorBookmark(
    controller: GobanController,
    appliedPaths: KibitzAppliedVariationPathRegistry,
): KibitzVariationCursorBookmark | null {
    const engine = controller.goban.engine;
    const currentNode = engine.cur_move;
    if (!currentNode) {
        return null;
    }

    for (const appliedPath of appliedPaths.values()) {
        const pathIndex = appliedPath.pathNodes.indexOf(currentNode);
        if (pathIndex >= 0 && !isOfficialTrunkNode(engine.move_tree, currentNode)) {
            return {
                kind: "variation",
                variationId: appliedPath.variationId,
                pathIndex,
                revisionKey: appliedPath.revisionKey,
            };
        }
    }

    if (isOfficialTrunkNode(engine.move_tree, currentNode)) {
        return {
            kind: "official",
            moveNumber: currentNode.move_number,
        };
    }

    return {
        kind: "fallback",
        movePath: currentNode.getMoveStringToThisPoint(),
    };
}

export function restoreKibitzVariationCursor(
    controller: GobanController,
    bookmark: KibitzVariationCursorBookmark,
    appliedPaths: KibitzAppliedVariationPathRegistry,
): boolean {
    const engine = controller.goban.engine;
    let cursor: MoveTree | null = null;

    if (bookmark.kind === "variation") {
        const appliedPath = appliedPaths.get(bookmark.variationId);
        if (
            appliedPath?.revisionKey === bookmark.revisionKey &&
            bookmark.pathIndex >= 0 &&
            bookmark.pathIndex < appliedPath.pathNodes.length
        ) {
            cursor = appliedPath.pathNodes[bookmark.pathIndex];
        }
    } else if (bookmark.kind === "official") {
        cursor = officialTrunkNodeByMoveNumber(engine.move_tree, bookmark.moveNumber);
    } else {
        cursor = findExistingMovePath(controller, bookmark.movePath);
    }

    if (!cursor) {
        return false;
    }

    engine.jumpTo(cursor);
    return true;
}
