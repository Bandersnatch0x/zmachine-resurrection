import type { Command } from "./protocol";

export type RoomId = "cell" | "corridor" | "vault";
export type ItemId = "lamp" | "key" | "notebook";
export type DoorId = "hatch";

export type Placement =
  | { readonly kind: "carried" }
  | { readonly kind: "room"; readonly room: RoomId };

export type ItemState =
  | { readonly kind: "lamp"; readonly placement: Placement; readonly lit: boolean }
  | { readonly kind: "plain"; readonly placement: Placement };

export type DoorState = "locked" | "open";

export interface WorldState {
  readonly location: RoomId;
  readonly moves: number;
  readonly items: Readonly<Record<ItemId, ItemState>>;
  readonly doors: Readonly<Record<DoorId, DoorState>>;
}

declare const SNAPSHOT: unique symbol;
export type Snapshot = WorldState & { readonly [SNAPSHOT]: true };

export interface TurnResult {
  readonly state: Snapshot;
  readonly output: readonly string[];
  readonly refused: boolean;
}

export interface ZMachine {
  readonly state: Snapshot;
  execute(command: Command): TurnResult;
  restore(snapshot: Snapshot): void;
}
