import { say, t } from "../i18n";
import type { Locale } from "../i18n";
import { gameText } from "../i18n/game";
import { isDark, isDarkIn, observe } from "./observe";
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

function displayNoun(raw: string, locale: Locale): string {
  const noun = normalizeNoun(raw).replace(/^(?:the|a|an)\s+/, "");
  return noun || t(locale, gameText.messages.thingFallback);
}

function carrying(state: WorldState, id: ItemId): boolean {
  return state.items[id].placement.kind === "carried";
}

function roomText(state: WorldState, locale: Locale): string {
  if (isDark(state)) {
    return t(locale, gameText.messages.dark);
  }
  const view = observe(state, locale);
  const description = t(locale, WORLD.rooms[state.location].description);
  if (view.visibleItems.length === 0) {
    return description;
  }
  const items = view.visibleItems.join(t(locale, gameText.messages.listSeparator));
  return say(locale, gameText.messages.roomWithItems, { description, items });
}

function inventoryText(state: WorldState, locale: Locale): string {
  const carried = observe(state, locale).carriedItems;
  if (carried.length === 0) {
    return t(locale, gameText.messages.emptyHanded);
  }
  const items = carried.join(t(locale, gameText.messages.listSeparator));
  return say(locale, gameText.messages.carrying, { items });
}

function go(state: Snapshot, direction: Direction, locale: Locale): TurnResult {
  if (isDark(state)) {
    return refused(state, t(locale, gameText.messages.tooDarkToMove));
  }
  const exit = WORLD.rooms[state.location].exits[direction];
  if (exit === undefined) {
    return refused(state, t(locale, gameText.messages.cannotGoThatWay));
  }
  if (exit.kind === "door" && state.doors[exit.door] !== "open") {
    const door = t(locale, WORLD.doors[exit.door].name);
    return refused(state, say(locale, gameText.messages.doorIsLocked, { door }));
  }
  if (isDarkIn(state, exit.room)) {
    return refused(state, t(locale, gameText.messages.tooDarkToGoThere));
  }
  const next: WorldState = {
    ...state,
    location: exit.room,
    moves: state.moves + 1,
  };
  return committed(next, [roomText(next, locale)]);
}

function take(state: Snapshot, rawNoun: string, locale: Locale): TurnResult {
  if (isDark(state)) {
    return refused(state, t(locale, gameText.messages.tooDarkToFindAnything));
  }
  const noun = resolveNoun(rawNoun);
  if (noun === null) {
    const thing = displayNoun(rawNoun, locale);
    return refused(state, say(locale, gameText.messages.seeNoThingHere, { thing }));
  }
  if (noun.kind === "door") {
    const door = t(locale, WORLD.doors[noun.id].name);
    return refused(state, say(locale, gameText.messages.doorCannotBePickedUp, { door }));
  }

  const item = state.items[noun.id];
  const name = t(locale, WORLD.items[noun.id].name);
  if (item.placement.kind === "carried") {
    return refused(state, say(locale, gameText.messages.alreadyCarrying, { item: name }));
  }
  if (item.placement.room !== state.location) {
    return refused(state, say(locale, gameText.messages.seeNoThingHere, { thing: name }));
  }

  const next: WorldState = {
    ...state,
    moves: state.moves + 1,
    items: {
      ...state.items,
      [noun.id]: { ...item, placement: { kind: "carried" } },
    },
  };
  return committed(next, [say(locale, gameText.messages.taken, { item: name })]);
}

function drop(state: Snapshot, rawNoun: string, locale: Locale): TurnResult {
  if (isDark(state)) {
    return refused(state, t(locale, gameText.messages.tooDarkToPutDown));
  }
  const noun = resolveNoun(rawNoun);
  if (noun === null) {
    const thing = displayNoun(rawNoun, locale);
    return refused(state, say(locale, gameText.messages.notCarryingThing, { thing }));
  }
  if (noun.kind === "door") {
    const door = t(locale, WORLD.doors[noun.id].name);
    return refused(state, say(locale, gameText.messages.doorFixed, { door }));
  }

  const item = state.items[noun.id];
  const name = t(locale, WORLD.items[noun.id].name);
  if (item.placement.kind !== "carried") {
    return refused(state, say(locale, gameText.messages.notCarryingItem, { item: name }));
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
  return committed(next, [say(locale, gameText.messages.dropped, { item: name })]);
}

function lamp(state: Snapshot, lit: boolean, locale: Locale): TurnResult {
  const lampItem = state.items.lamp;
  if (lampItem.kind !== "lamp") {
    return refused(state, t(locale, gameText.messages.noLamp));
  }
  if (lampItem.placement.kind !== "carried") {
    return refused(state, t(locale, gameText.messages.notCarryingLamp));
  }
  if (lampItem.lit === lit) {
    return refused(
      state,
      t(locale, lit ? gameText.messages.lampAlreadyLit : gameText.messages.lampAlreadyOut),
    );
  }

  const next: WorldState = {
    ...state,
    moves: state.moves + 1,
    items: {
      ...state.items,
      lamp: { ...lampItem, lit },
    },
  };
  return committed(next, [
    t(locale, lit ? gameText.messages.lampLit : gameText.messages.lampOut),
  ]);
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

function open(state: Snapshot, rawNoun: string, locale: Locale): TurnResult {
  if (isDark(state)) {
    return refused(state, t(locale, gameText.messages.tooDarkToFindLatch));
  }
  const noun = resolveNoun(rawNoun);
  if (noun === null) {
    const thing = displayNoun(rawNoun, locale);
    return refused(state, say(locale, gameText.messages.noThingHere, { thing }));
  }
  if (noun.kind === "item") {
    const item = t(locale, WORLD.items[noun.id].name);
    return refused(state, say(locale, gameText.messages.cannotOpenItem, { item }));
  }

  const door = t(locale, WORLD.doors[noun.id].name);
  if (!doorIsHere(state, noun.id)) {
    return refused(state, say(locale, gameText.messages.cannotReachDoor, { door }));
  }
  if (state.doors[noun.id] === "open") {
    return refused(state, say(locale, gameText.messages.doorAlreadyOpen, { door }));
  }
  if (!carrying(state, WORLD.doors[noun.id].key)) {
    return refused(state, say(locale, gameText.messages.doorIsLocked, { door }));
  }

  const next: WorldState = {
    ...state,
    moves: state.moves + 1,
    doors: { ...state.doors, [noun.id]: "open" },
  };
  return committed(next, [say(locale, gameText.messages.doorOpens, { door })]);
}

export function runTurn(state: Snapshot, command: Command, locale: Locale = "en"): TurnResult {
  switch (command.kind) {
    case "look":
      return { state, output: [roomText(state, locale)], refused: false };
    case "inventory":
      return { state, output: [inventoryText(state, locale)], refused: false };
    case "wait":
      return committed({ ...state, moves: state.moves + 1 }, [
        t(locale, gameText.messages.timePasses),
      ]);
    case "go":
      return go(state, command.direction, locale);
    case "take":
      return take(state, command.noun, locale);
    case "drop":
      return drop(state, command.noun, locale);
    case "lamp":
      return lamp(state, command.lit, locale);
    case "open":
      return open(state, command.noun, locale);
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
