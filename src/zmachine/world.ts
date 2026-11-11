import type { Direction } from "./protocol";
import type {
  DoorId,
  ItemId,
  RoomId,
  Snapshot,
  WorldState,
} from "./types";

export interface RoomExitToRoom {
  readonly kind: "room";
  readonly room: RoomId;
}

export interface RoomExitThroughDoor {
  readonly kind: "door";
  readonly door: DoorId;
  readonly room: RoomId;
}

export type RoomExit = RoomExitToRoom | RoomExitThroughDoor;

export interface RoomDef {
  readonly title: string;
  readonly description: string;
  readonly dark: boolean;
  readonly exits: Readonly<Partial<Record<Direction, RoomExit>>>;
}

export interface ItemDef {
  readonly name: string;
  readonly aliases: readonly string[];
}

export interface DoorDef {
  readonly name: string;
  readonly aliases: readonly string[];
  readonly key: ItemId;
}

export type NounRef =
  | { readonly kind: "item"; readonly id: ItemId }
  | { readonly kind: "door"; readonly id: DoorId };

export interface WorldDef {
  readonly rooms: Readonly<Record<RoomId, RoomDef>>;
  readonly items: Readonly<Record<ItemId, ItemDef>>;
  readonly doors: Readonly<Record<DoorId, DoorDef>>;
  readonly nouns: Readonly<Record<string, NounRef>>;
}

const rooms: Readonly<Record<RoomId, RoomDef>> = {
  cell: {
    title: "Cell",
    description: "Cell. Cold stone, a narrow cot, and a barred door north.",
    dark: false,
    exits: {
      north: { kind: "room", room: "corridor" },
    },
  },
  corridor: {
    title: "Corridor",
    description:
      "Corridor. Dust and a dead fluorescent. The cell lies south, and a hatch is set in the east wall.",
    dark: true,
    exits: {
      south: { kind: "room", room: "cell" },
      east: { kind: "door", door: "hatch", room: "vault" },
    },
  },
  vault: {
    title: "Vault",
    description: "Vault. Shelves of dead terminals line the walls. A hatch opens west.",
    dark: false,
    exits: {
      west: { kind: "door", door: "hatch", room: "corridor" },
    },
  },
};

const items: Readonly<Record<ItemId, ItemDef>> = {
  lamp: { name: "brass lamp", aliases: ["lamp", "brass lamp"] },
  key: { name: "brass key", aliases: ["key", "brass key"] },
  notebook: { name: "notebook", aliases: ["notebook", "book", "journal"] },
};

const doors: Readonly<Record<DoorId, DoorDef>> = {
  hatch: { name: "hatch", aliases: ["hatch", "door", "trapdoor"], key: "key" },
};

function buildNounIndex(): Readonly<Record<string, NounRef>> {
  const nouns: Record<string, NounRef> = {};
  for (const id of Object.keys(items) as ItemId[]) {
    for (const alias of items[id].aliases) {
      nouns[alias] = { kind: "item", id };
    }
  }
  for (const id of Object.keys(doors) as DoorId[]) {
    for (const alias of doors[id].aliases) {
      nouns[alias] = { kind: "door", id };
    }
  }
  return nouns;
}

export const WORLD: WorldDef = {
  rooms,
  items,
  doors,
  nouns: buildNounIndex(),
};

function deepFreeze(value: unknown): void {
  if (value === null || typeof value !== "object") {
    return;
  }
  for (const nested of Object.values(value)) {
    deepFreeze(nested);
  }
  Object.freeze(value);
}

export function sealSnapshot(state: WorldState): Snapshot {
  deepFreeze(state);
  return state as Snapshot;
}

const INITIAL: WorldState = {
  location: "cell",
  moves: 0,
  items: {
    lamp: { kind: "lamp", placement: { kind: "carried" }, lit: true },
    key: { kind: "plain", placement: { kind: "room", room: "cell" } },
    notebook: { kind: "plain", placement: { kind: "carried" } },
  },
  doors: {
    hatch: "locked",
  },
};

export const INITIAL_STATE: Snapshot = sealSnapshot(INITIAL);
