import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  INITIAL_STATE,
  createZMachine,
  observe,
  replay,
  runTurn,
  sameState,
} from "../src/zmachine";
import type { Command, Snapshot } from "../src/zmachine";

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
  { kind: "open", noun: "hatch" },
];

const commandSequence = fc.array(fc.constantFrom(...COMMANDS), { maxLength: 30 });

describe("typed machine API", () => {
  it("exposes a machine whose state tracks accepted turns", () => {
    const machine = createZMachine();
    expect(machine.state).toBe(INITIAL_STATE);

    machine.execute({ kind: "go", direction: "north" });
    expect(machine.state.location).toBe("corridor");
    expect(machine.state.moves).toBe(1);

    machine.execute({ kind: "go", direction: "west" });
    expect(machine.state.location).toBe("corridor");
    expect(machine.state.moves).toBe(1);
  });

  it("restores to exactly the snapshot it was handed", () => {
    const checkpoint = replay([{ kind: "go", direction: "north" }]);
    const machine = createZMachine();
    machine.execute({ kind: "wait" });
    machine.execute({ kind: "wait" });

    machine.restore(checkpoint);
    expect(machine.state).toBe(checkpoint);
    expect(machine.state.moves).toBe(1);
  });

  it("keeps restore plus suffix equal to the unsplit run", () => {
    fc.assert(
      fc.property(commandSequence, fc.nat(), (commands, split) => {
        const cut = split % (commands.length + 1);
        const checkpoint = replay(commands.slice(0, cut));
        const restored = replay(commands.slice(cut), checkpoint);
        expect(sameState(restored, replay(commands))).toBe(true);
      }),
    );
  });

  it("replays to the same state as a live machine", () => {
    fc.assert(
      fc.property(commandSequence, (commands) => {
        const machine = createZMachine();
        for (const command of commands) {
          machine.execute(command);
        }
        expect(sameState(machine.state, replay(commands))).toBe(true);
      }),
    );
  });

  it("projects a read-only view without leaking mutable state", () => {
    const view = observe(INITIAL_STATE);
    expect(view.room).toEqual({ id: "cell", title: "Cell", dark: false });
    expect(view.visibleItems).toEqual(["brass key"]);
    expect(view.carriedItems).toEqual(["brass lamp (lit)", "notebook"]);
    expect(view.exits).toEqual(["north"]);
    expect(view.doors).toEqual([{ id: "hatch", state: "locked" }]);
  });

  it("hides the room contents and exits while the room is dark", () => {
    const dark = replay([
      { kind: "go", direction: "north" },
      { kind: "lamp", lit: false },
    ]);
    const view = observe(dark);
    expect(view.room.dark).toBe(true);
    expect(view.visibleItems).toEqual([]);
    expect(view.exits).toEqual([]);
    expect(view.carriedItems).toEqual(["brass lamp", "notebook"]);
  });

  it("is deterministic over the whole machine surface", () => {
    fc.assert(
      fc.property(commandSequence, (commands) => {
        const first = createZMachine();
        const second = createZMachine();
        const firstTranscript = commands.map((command) => first.execute(command).output);
        const secondTranscript = commands.map((command) => second.execute(command).output);
        expect(secondTranscript).toEqual(firstTranscript);
        expect(sameState(first.state, second.state)).toBe(true);
      }),
    );
  });

  it("never mutates the state it was given", () => {
    const start = replay([{ kind: "go", direction: "north" }]);
    const before = structuredClone(start) as Snapshot;
    runTurn(start, { kind: "open", noun: "hatch" });
    runTurn(start, { kind: "look" });
    expect(structuredClone(start)).toEqual(before);
  });
});
