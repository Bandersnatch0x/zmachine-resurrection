import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { INITIAL_STATE, parseCommand, runTurn, WORLD } from "../src/zmachine";
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
