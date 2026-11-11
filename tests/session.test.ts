import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { parseRuleIntent } from "../src/frontend/sources";
import { createSession } from "../src/session/session";
import type { SessionEntry } from "../src/session/session";
import { INITIAL_STATE, replay, sameState } from "../src/zmachine";
import type { Command } from "../src/zmachine";

const COMMANDS: readonly Command[] = [
  { kind: "look" },
  { kind: "inventory" },
  { kind: "wait" },
  { kind: "go", direction: "north" },
  { kind: "go", direction: "south" },
  { kind: "take", noun: "key" },
  { kind: "drop", noun: "key" },
  { kind: "lamp", lit: false },
  { kind: "lamp", lit: true },
  { kind: "open", noun: "hatch" },
];

const entryArbitrary = fc
  .array(fc.constantFrom(...COMMANDS), { minLength: 1, maxLength: 3 })
  .map((commands): SessionEntry => ({ input: commands.map((command) => command.kind).join(" "), commands }));

const logArbitrary = fc.array(entryArbitrary, { maxLength: 12 });

describe("session log and checkpoint", () => {
  it("replays the same commands as a direct replay", () => {
    fc.assert(
      fc.property(logArbitrary, (entries) => {
        const session = createSession();
        for (const entry of entries) {
          session.commit(entry);
        }
        const commands = entries.flatMap((entry) => entry.commands);
        expect(sameState(session.state, replay(commands))).toBe(true);
      }),
    );
  });

  it("truncates the log to the checkpoint on restore", () => {
    const session = createSession();
    session.commit({ input: "north", commands: [{ kind: "go", direction: "north" }] });
    session.save();
    session.commit({ input: "south", commands: [{ kind: "go", direction: "south" }] });
    session.commit({ input: "wait", commands: [{ kind: "wait" }] });

    expect(session.view().logLength).toBe(3);
    const restored = session.restore();
    expect(session.view().logLength).toBe(1);
    expect(restored.state.location).toBe("corridor");
    expect(restored.state.moves).toBe(1);
  });

  it("leaves the session untouched when restoring without a checkpoint", () => {
    const session = createSession();
    session.commit({ input: "north", commands: [{ kind: "go", direction: "north" }] });
    const before = session.state;
    session.restore();
    expect(session.state).toBe(before);
    expect(session.view().logLength).toBe(1);
  });

  it("restores to exactly the saved snapshot even after a refusal", () => {
    const session = createSession();
    session.commit({ input: "take key", commands: [{ kind: "take", noun: "key" }] });
    session.save();
    const saved = session.state;

    session.commit({ input: "open hatch", commands: [{ kind: "open", noun: "hatch" }] });
    expect(session.state).toBe(saved);

    session.restore();
    expect(session.state).toBe(saved);
  });

  it("replays from the start snapshot, not the current one", () => {
    const session = createSession();
    session.commit({ input: "north", commands: [{ kind: "go", direction: "north" }] });
    session.commit({ input: "south", commands: [{ kind: "go", direction: "south" }] });
    session.save();
    session.commit({ input: "wait", commands: [{ kind: "wait" }] });

    const turns = session.replayAll();
    expect(turns.length).toBe(3);
    expect(session.state.location).toBe("cell");
    expect(session.state.moves).toBe(3);
    expect(sameState(session.state, replay([
      { kind: "go", direction: "north" },
      { kind: "go", direction: "south" },
      { kind: "wait" },
    ]))).toBe(true);
  });

  it("keeps a natural-language entry replayable through its compiled commands", () => {
    const commands = parseRuleIntent("take the key and go north");
    const session = createSession();
    const result = session.commit({ input: "take the key and go north", commands });
    expect(result.turns.every((turn) => !turn.refused)).toBe(true);
    expect(session.state.location).toBe("corridor");
    expect(session.state.items.key.placement).toEqual({ kind: "carried" });
    expect(session.log[0]?.commands).toEqual(commands);
    expect(session.log[0]?.input).toContain("take the key");
  });

  it("reports whether a checkpoint exists, including one saved at input 0", () => {
    const session = createSession();
    expect(session.view().hasCheckpoint).toBe(false);

    session.save();
    expect(session.view().hasCheckpoint).toBe(true);
    expect(session.view().logLength).toBe(0);

    session.restore();
    expect(session.state).toBe(INITIAL_STATE);
  });

  it("replays from the start snapshot it was created with", () => {
    const start = replay([{ kind: "go", direction: "north" }]);
    const session = createSession(start);
    session.commit({ input: "south", commands: [{ kind: "go", direction: "south" }] });

    const turns = session.replayAll();
    expect(turns.length).toBe(1);
    expect(session.state.location).toBe("cell");
    expect(session.state.moves).toBe(2);
  });

  it("starts from the shared initial snapshot", () => {
    const session = createSession();
    expect(session.state).toBe(INITIAL_STATE);
  });
});
