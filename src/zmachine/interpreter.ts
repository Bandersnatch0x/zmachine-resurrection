import type { Direction, TurnResult, WorldState, ZMachine } from "./types";

export const INITIAL_STATE: WorldState = {
  location: "cell",
  lampLit: true,
  moves: 0,
};

const EXITS: Record<WorldState["location"], Partial<Record<Direction, WorldState["location"]>>> =
  {
    cell: { north: "corridor" },
    corridor: { south: "cell" },
  };

const ROOM_TEXT: Record<WorldState["location"], string> = {
  cell: "Cell. Cold stone, one barred door to the north. A brass lamp is lit.",
  corridor:
    "Corridor. Dust and a dead fluorescent. The cell is south. A locked hatch is east.",
};

/**
 * The deterministic core. Pure: same state plus same input always yields the
 * same state and the same transcript, which is what makes replay and undo safe.
 */
export function runTurn(state: WorldState, input: string): TurnResult {
  const command = input.trim().toLowerCase();
  const words = command.split(/\s+/).filter(Boolean);
  const verb = words[0] ?? "";

  if (verb === "") {
    return { state, output: ["Say something."] };
  }

  if (verb === "look" || verb === "l") {
    return { state, output: [ROOM_TEXT[state.location]] };
  }

  if (verb === "north" || verb === "n" || verb === "south" || verb === "s") {
    const direction: Direction = verb.startsWith("n") ? "north" : "south";
    const target = EXITS[state.location][direction];
    if (target === undefined) {
      return { state, output: ["You cannot go that way."] };
    }
    const next: WorldState = {
      ...state,
      location: target,
      moves: state.moves + 1,
    };
    return { state: next, output: [ROOM_TEXT[target]] };
  }

  if (verb === "inventory" || verb === "i") {
    return {
      state,
      output: ["You are carrying: a brass lamp (lit), a notebook."],
    };
  }

  if (verb === "wait" || verb === "z") {
    return { state: { ...state, moves: state.moves + 1 }, output: ["Time passes."] };
  }

  return {
    state,
    output: [`I do not know the word "${words[0]}".`],
  };
}

export function createZMachine(initial: WorldState = INITIAL_STATE): ZMachine {
  let current = initial;

  return {
    get state() {
      return current;
    },
    execute(input: string): TurnResult {
      const result = runTurn(current, input);
      current = result.state;
      return result;
    },
    restore(snapshot: WorldState): void {
      current = snapshot;
    },
  };
}
