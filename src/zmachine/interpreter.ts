import { normalizeNoun } from "./protocol";
import type { Command, Direction } from "./protocol";
import type {
  DoorId,
  ItemId,
  Snapshot,
  TurnResult,
  WorldState,
  ZMachine,
} from "./types";
import { INITIAL_STATE, WORLD, sealSnapshot } from "./world";
import type { NounRef } from "./world";

function refused(state: Snapshot, text: string): TurnResult {
  return { state, output: [text], refused: true };
}

function committed(next: WorldState, output: readonly string[]): TurnResult {
  return { state: sealSnapshot(next), output, refused: false };
}

function resolveNoun(raw: string): NounRef | null {
  const noun = normalizeNoun(raw).replace(/^(?:the|a|an)\s+/, "");
  return WORLD.nouns[noun] ?? null;
}

function displayNoun(raw: string): string {
  return normalizeNoun(raw).replace(/^(?:the|a|an)\s+/, "") || "thing";
}

function carrying(state: WorldState, id: ItemId): boolean {
  return state.items[id].placement.kind === "carried";
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
  const carried = (Object.keys(state.items) as ItemId[]).filter((id) =>
    carrying(state, id),
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

function take(state: Snapshot, rawNoun: string): TurnResult {
  if (isDark(state)) {
    return refused(state, "It is too dark to find anything.");
  }
  const noun = resolveNoun(rawNoun);
  if (noun === null) {
    return refused(state, `You see no ${displayNoun(rawNoun)} here.`);
  }
  if (noun.kind === "door") {
    return refused(state, `The ${WORLD.doors[noun.id].name} cannot be picked up.`);
  }

  const item = state.items[noun.id];
  const name = WORLD.items[noun.id].name;
  if (item.placement.kind === "carried") {
    return refused(state, `You are already carrying the ${name}.`);
  }
  if (item.placement.room !== state.location) {
    return refused(state, `You see no ${name} here.`);
  }

  const next: WorldState = {
    ...state,
    moves: state.moves + 1,
    items: {
      ...state.items,
      [noun.id]: { ...item, placement: { kind: "carried" } },
    },
  };
  return committed(next, [`Taken: ${name}.`]);
}

function drop(state: Snapshot, rawNoun: string): TurnResult {
  if (isDark(state)) {
    return refused(state, "It is too dark to put anything down safely.");
  }
  const noun = resolveNoun(rawNoun);
  if (noun === null) {
    return refused(state, `You are not carrying a ${displayNoun(rawNoun)}.`);
  }
  if (noun.kind === "door") {
    return refused(state, `The ${WORLD.doors[noun.id].name} is fixed in place.`);
  }

  const item = state.items[noun.id];
  const name = WORLD.items[noun.id].name;
  if (item.placement.kind !== "carried") {
    return refused(state, `You are not carrying the ${name}.`);
  }

  const next: WorldState = {
    ...state,
    moves: state.moves + 1,
    items: {
      ...state.items,
      [noun.id]: {
        ...item,
        placement: { kind: "room", room: state.location },
      },
    },
  };
  return committed(next, [`Dropped: ${name}.`]);
}

function lamp(state: Snapshot, lit: boolean): TurnResult {
  const lampItem = state.items.lamp;
  if (lampItem.kind !== "lamp") {
    return refused(state, "There is no lamp.");
  }
  if (lampItem.placement.kind !== "carried") {
    return refused(state, "You are not carrying the lamp.");
  }
  if (lampItem.lit === lit) {
    return refused(state, lit ? "The lamp is already lit." : "The lamp is already out.");
  }

  const next: WorldState = {
    ...state,
    moves: state.moves + 1,
    items: {
      ...state.items,
      lamp: { ...lampItem, lit },
    },
  };
  return committed(next, [lit ? "The lamp is lit." : "The lamp goes dark."]);
}

function doorIsHere(state: WorldState, door: DoorId): boolean {
  const exits = WORLD.rooms[state.location].exits;
  for (const direction of Object.keys(exits) as Direction[]) {
    const exit = exits[direction];
    if (exit?.kind === "door" && exit.door === door) {
      return true;
    }
  }
  return false;
}

function open(state: Snapshot, rawNoun: string): TurnResult {
  if (isDark(state)) {
    return refused(state, "It is too dark to find the latch.");
  }
  const noun = resolveNoun(rawNoun);
  if (noun === null) {
    return refused(state, `There is no ${displayNoun(rawNoun)} here.`);
  }
  if (noun.kind === "item") {
    return refused(state, `The ${WORLD.items[noun.id].name} cannot be opened.`);
  }

  const door = WORLD.doors[noun.id];
  if (!doorIsHere(state, noun.id)) {
    return refused(state, `You cannot reach the ${door.name} from here.`);
  }
  if (state.doors[noun.id] === "open") {
    return refused(state, `The ${door.name} is already open.`);
  }
  if (!carrying(state, door.key)) {
    return refused(state, `The ${door.name} is locked.`);
  }

  const next: WorldState = {
    ...state,
    moves: state.moves + 1,
    doors: { ...state.doors, [noun.id]: "open" },
  };
  return committed(next, [`The ${door.name} opens.`]);
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
      return take(state, command.noun);
    case "drop":
      return drop(state, command.noun);
    case "lamp":
      return lamp(state, command.lit);
    case "open":
      return open(state, command.noun);
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
