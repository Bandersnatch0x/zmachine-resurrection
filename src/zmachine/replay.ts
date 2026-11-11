import { runTurn } from "./interpreter";
import type { Command } from "./protocol";
import type { ItemId, Snapshot } from "./types";
import { INITIAL_STATE } from "./world";

function sameItems(
  a: Snapshot["items"],
  b: Snapshot["items"],
): boolean {
  const ids = new Set<string>([...Object.keys(a), ...Object.keys(b)]);
  for (const id of ids) {
    const left = a[id as ItemId];
    const right = b[id as ItemId];
    if (left === undefined || right === undefined) {
      return false;
    }
    if (left.kind !== right.kind) {
      return false;
    }
    if (left.placement.kind !== right.placement.kind) {
      return false;
    }
    if (left.placement.kind === "room" && right.placement.kind === "room") {
      if (left.placement.room !== right.placement.room) {
        return false;
      }
    }
    if (left.kind === "lamp" && right.kind === "lamp" && left.lit !== right.lit) {
      return false;
    }
  }
  return true;
}

function sameDoors(a: Snapshot["doors"], b: Snapshot["doors"]): boolean {
  const ids = new Set<string>([...Object.keys(a), ...Object.keys(b)]);
  for (const id of ids) {
    const left = a[id as keyof typeof a];
    const right = b[id as keyof typeof b];
    if (left === undefined || right === undefined || left !== right) {
      return false;
    }
  }
  return true;
}

export function sameState(a: Snapshot, b: Snapshot): boolean {
  return (
    a.location === b.location &&
    a.moves === b.moves &&
    sameItems(a.items, b.items) &&
    sameDoors(a.doors, b.doors)
  );
}

export function replay(commands: readonly Command[], start: Snapshot = INITIAL_STATE): Snapshot {
  return commands.reduce<Snapshot>((state, command) => runTurn(state, command).state, start);
}
