import type { Command, Direction } from "./protocol";
import type {
  ItemId,
  Snapshot,
  TurnResult,
  WorldState,
  ZMachine,
} from "./types";
import { INITIAL_STATE, WORLD, sealSnapshot } from "./world";

function refused(state: Snapshot, text: string): TurnResult {
  return { state, output: [text], refused: true };
}

function committed(next: WorldState, output: readonly string[]): TurnResult {
  return { state: sealSnapshot(next), output, refused: false };
}

function carriedLampLit(state: WorldState): boolean {
  const lamp = state.items.lamp;
  if (lamp.kind !== "lamp") {
    return false;
  }
  return lamp.placement.kind === "carried" && lamp.lit;
}

function isDark(state: WorldState): boolean {
  return WORLD.rooms[state.location].dark && !carriedLampLit(state);
}

function visibleItemNames(state: WorldState): readonly string[] {
  return (Object.keys(state.items) as ItemId[])
    .filter((id) => {
      const placement = state.items[id].placement;
      return placement.kind === "room" && placement.room === state.location;
    })
    .map((id) => WORLD.items[id].name);
}

function roomText(state: WorldState): string {
  if (isDark(state)) {
    return "It is dark. You cannot see anything.";
  }
  const room = WORLD.rooms[state.location];
  const visible = visibleItemNames(state);
  if (visible.length === 0) {
    return room.description;
  }
  return `${room.description} You see: ${visible.join(", ")}.`;
}

function inventoryText(state: WorldState): string {
  const carried = (Object.keys(state.items) as ItemId[]).filter(
    (id) => state.items[id].placement.kind === "carried",
  );
  if (carried.length === 0) {
    return "You are empty-handed.";
  }
  const names = carried.map((id) => {
    const item = state.items[id];
    const name = WORLD.items[id].name;
    return item.kind === "lamp" && item.lit ? `${name} (lit)` : name;
  });
  return `You are carrying: ${names.join(", ")}.`;
}

function go(state: Snapshot, direction: Direction): TurnResult {
  if (isDark(state)) {
    return refused(state, "It is too dark to move.");
  }
  const exit = WORLD.rooms[state.location].exits[direction];
  if (exit === undefined) {
    return refused(state, "You cannot go that way.");
  }
  if (exit.kind === "door" && state.doors[exit.door] !== "open") {
    return refused(state, `The ${WORLD.doors[exit.door].name} is locked.`);
  }
  const next: WorldState = {
    ...state,
    location: exit.room,
    moves: state.moves + 1,
  };
  return committed(next, [roomText(next)]);
}

export function runTurn(state: Snapshot, command: Command): TurnResult {
  switch (command.kind) {
    case "look":
      return { state, output: [roomText(state)], refused: false };
    case "inventory":
      return { state, output: [inventoryText(state)], refused: false };
    case "wait":
      return committed({ ...state, moves: state.moves + 1 }, ["Time passes."]);
    case "go":
      return go(state, command.direction);
    case "take":
    case "drop":
    case "lamp":
    case "open":
      return refused(state, "The machine does not respond to that yet.");
  }
}

export function createZMachine(initial: Snapshot = INITIAL_STATE): ZMachine {
  let current = initial;

  return {
    get state() {
      return current;
    },
    execute(command: Command): TurnResult {
      const result = runTurn(current, command);
      current = result.state;
      return result;
    },
    restore(snapshot: Snapshot): void {
      current = snapshot;
    },
  };
}
