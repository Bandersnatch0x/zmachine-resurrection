export type LocationId = "cell" | "corridor";

export type Direction = "north" | "south";

export interface WorldState {
  readonly location: LocationId;
  readonly lampLit: boolean;
  readonly moves: number;
}

export interface TurnResult {
  readonly state: WorldState;
  readonly output: readonly string[];
}

export interface ZMachine {
  readonly state: WorldState;
  execute(input: string): TurnResult;
  restore(snapshot: WorldState): void;
}
