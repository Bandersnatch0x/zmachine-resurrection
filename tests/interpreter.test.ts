import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { INITIAL_STATE, parseCommand, runTurn } from "../src/zmachine";
import { WORLD } from "../src/zmachine/world";
import type { Command, Direction, RoomId, Snapshot } from "../src/zmachine";

const COMMANDS: readonly Command[] = [
  { kind: "look" },
  { kind: "inventory" },
  { kind: "wait" },
  { kind: "go", direction: "north" },
  { kind: "go", direction: "south" },
  { kind: "go", direction: "east" },
  { kind: "go", direction: "west" },
  { kind: "lamp", lit: true },
  { kind: "lamp", lit: false },
  { kind: "take", noun: "key" },
  { kind: "drop", noun: "key" },
  { kind: "take", noun: "lamp" },
  { kind: "drop", noun: "lamp" },
  { kind: "open", noun: "hatch" },
];

const commandSequence = fc.array(fc.constantFrom(...COMMANDS), { maxLength: 40 });

function trace(commands: readonly Command[]): Snapshot {
  let state: Snapshot = INITIAL_STATE;
  for (const command of commands) {
    state = runTurn(state, command).state;
  }
  return state;
}

function play(commands: readonly Command[], start: Snapshot = INITIAL_STATE): Snapshot {
  return commands.reduce((state, command) => runTurn(state, command).state, start);
}

function runText(inputs: readonly string[]): { state: Snapshot; output: readonly string[] } {
  let state: Snapshot = INITIAL_STATE;
  const output: string[] = [];
  for (const input of inputs) {
    const command = parseCommand(input);
    if (command === null) {
      output.push(`no command: ${input}`);
      continue;
    }
    const result = runTurn(state, command);
    state = result.state;
    output.push(...result.output);
  }
  return { state, output };
}

describe("Z-machine deterministic core", () => {
  it("produces identical state and transcript for the same command sequence", () => {
    fc.assert(
      fc.property(commandSequence, (commands) => {
        expect(trace(commands)).toEqual(trace(commands));
      }),
    );
  });

  it("keeps every move inside the world and inside the move bound", () => {
    fc.assert(
      fc.property(commandSequence, (commands) => {
        const finalState = trace(commands);
        expect(Object.keys(WORLD.rooms)).toContain(finalState.location);
        expect(finalState.moves).toBeGreaterThanOrEqual(0);
        expect(finalState.moves).toBeLessThanOrEqual(commands.length);
      }),
    );
  });

  it("never mutates the input state", () => {
    const before = structuredClone(INITIAL_STATE) as Snapshot;
    fc.assert(
      fc.property(commandSequence, (commands) => {
        trace(commands);
        expect(structuredClone(INITIAL_STATE)).toEqual(before);
      }),
    );
  });

  it("keeps the acceptance smoke green: north, south, look, xyzzy", () => {
    const { state, output } = runText(["north", "south", "look", "xyzzy"]);
    expect(state.location).toBe("cell");
    expect(state.moves).toBe(2);
    expect(output.join(" ")).toContain("Cell.");
  });

  it("returns the same snapshot reference when a move is refused", () => {
    const result = runTurn(INITIAL_STATE, { kind: "go", direction: "west" });
    expect(result.refused).toBe(true);
    expect(result.state).toBe(INITIAL_STATE);
    expect(result.state.moves).toBe(0);
  });
});

describe("static world content", () => {
  it("keeps every exit and key pointing at a real entity", () => {
    for (const roomId of Object.keys(WORLD.rooms) as RoomId[]) {
      const room = WORLD.rooms[roomId];
      expect(room.title.length).toBeGreaterThan(0);
      expect(room.description.length).toBeGreaterThan(0);
      for (const direction of Object.keys(room.exits) as Direction[]) {
        const exit = room.exits[direction];
        if (exit === undefined) {
          continue;
        }
        expect(Object.keys(WORLD.rooms)).toContain(exit.room);
        if (exit.kind === "door") {
          expect(Object.keys(WORLD.doors)).toContain(exit.door);
        }
      }
    }
    expect(WORLD.doors.hatch.key).toBe("key");
  });

  it("matches the declared starting arrangement", () => {
    expect(INITIAL_STATE.location).toBe("cell");
    expect(INITIAL_STATE.moves).toBe(0);
    expect(INITIAL_STATE.items.lamp).toEqual({
      kind: "lamp",
      placement: { kind: "carried" },
      lit: true,
    });
    expect(INITIAL_STATE.items.key).toEqual({
      kind: "plain",
      placement: { kind: "room", room: "cell" },
    });
    expect(INITIAL_STATE.items.notebook).toEqual({
      kind: "plain",
      placement: { kind: "carried" },
    });
    expect(INITIAL_STATE.doors.hatch).toBe("locked");
    expect(WORLD.rooms.cell.dark).toBe(false);
    expect(WORLD.rooms.corridor.dark).toBe(true);
    expect(WORLD.rooms.vault.dark).toBe(false);
  });
});

const DARK_CORRIDOR = play([
  { kind: "go", direction: "north" },
  { kind: "lamp", lit: false },
]);

describe("items, hatch, and darkness", () => {
  it("plays the key-and-hatch walkthrough into the vault and back", () => {
    const commands: readonly Command[] = [
      { kind: "look" },
      { kind: "take", noun: "key" },
      { kind: "go", direction: "north" },
      { kind: "open", noun: "hatch" },
      { kind: "go", direction: "east" },
      { kind: "look" },
      { kind: "go", direction: "west" },
      { kind: "go", direction: "south" },
      { kind: "inventory" },
    ];

    expect(play(commands.slice(0, 5)).location).toBe("vault");
    const final = play(commands);
    expect(final.location).toBe("cell");
    expect(final.moves).toBe(6);
    expect(final.doors.hatch).toBe("open");
    expect(final.items.key.placement).toEqual({ kind: "carried" });
  });

  it("lights and extinguishes the lamp, and darkness follows the light", () => {
    const litCorridor = play([{ kind: "go", direction: "north" }]);
    expect(runTurn(litCorridor, { kind: "look" }).output.join(" ")).toContain("Corridor");

    const dark = runTurn(litCorridor, { kind: "lamp", lit: false }).state;
    const look = runTurn(dark, { kind: "look" });
    expect(look.refused).toBe(false);
    expect(look.state).toBe(dark);
    expect(look.output.join(" ")).toContain("dark");

    expect(runTurn(dark, { kind: "inventory" }).refused).toBe(false);
    expect(runTurn(dark, { kind: "wait" }).refused).toBe(false);

    const relit = runTurn(dark, { kind: "lamp", lit: true });
    expect(relit.refused).toBe(false);
    expect(runTurn(relit.state, { kind: "look" }).output.join(" ")).toContain("Corridor");
  });

  it("refuses every world-changing command in a dark room", () => {
    const darkCommand: fc.Arbitrary<Command> = fc.oneof(
      fc
        .constantFrom<Direction>("north", "south", "east", "west")
        .map((direction): Command => ({ kind: "go", direction })),
      fc.constantFrom("key", "lamp", "notebook", "hatch").map((noun): Command => ({ kind: "take", noun })),
      fc.constantFrom("key", "lamp", "notebook", "hatch").map((noun): Command => ({ kind: "drop", noun })),
      fc.constantFrom("key", "lamp", "notebook", "hatch").map((noun): Command => ({ kind: "open", noun })),
    );

    fc.assert(
      fc.property(darkCommand, (command) => {
        const result = runTurn(DARK_CORRIDOR, command);
        expect(result.refused).toBe(true);
        expect(result.state).toBe(DARK_CORRIDOR);
        expect(result.state.moves).toBe(2);
      }),
    );
  });

  it("refuses to open the hatch without the key, changing nothing", () => {
    const corridor = play([{ kind: "go", direction: "north" }]);
    const result = runTurn(corridor, { kind: "open", noun: "hatch" });
    expect(result.refused).toBe(true);
    expect(result.state).toBe(corridor);
    expect(result.state.doors.hatch).toBe("locked");
    expect(result.state.moves).toBe(corridor.moves);
  });

  it("only opens the hatch while the key is carried", () => {
    fc.assert(
      fc.property(commandSequence, (commands) => {
        let state: Snapshot = INITIAL_STATE;
        for (const command of commands) {
          const result = runTurn(state, command);
          const opened =
            command.kind === "open" &&
            command.noun === "hatch" &&
            state.doors.hatch === "locked" &&
            result.state.doors.hatch === "open";
          if (opened) {
            expect(state.items.key.placement.kind).toBe("carried");
          }
          state = result.state;
        }
      }),
    );
  });

  it("never reaches the vault through a locked hatch", () => {
    fc.assert(
      fc.property(commandSequence, (commands) => {
        const finalState = trace(commands);
        if (finalState.location === "vault") {
          expect(finalState.doors.hatch).toBe("open");
        }
      }),
    );
  });

  it("treats accepted no-ops as immobile and refusal-inert", () => {
    const lightAgain = runTurn(INITIAL_STATE, { kind: "lamp", lit: true });
    expect(lightAgain.refused).toBe(true);
    expect(lightAgain.state).toBe(INITIAL_STATE);

    const takeCarried = runTurn(INITIAL_STATE, { kind: "take", noun: "notebook" });
    expect(takeCarried.refused).toBe(true);
    expect(takeCarried.state).toBe(INITIAL_STATE);
    expect(takeCarried.state.moves).toBe(0);
  });
});
