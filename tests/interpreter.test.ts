import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { INITIAL_STATE, runTurn } from "../src/zmachine";
import type { WorldState } from "../src/zmachine";

const COMMANDS = ["look", "north", "south", "inventory", "wait", "xyzzy", "", "  NORTH  "];

const commandSequence = fc.array(fc.constantFrom(...COMMANDS), { maxLength: 40 });

function replay(commands: readonly string[]): WorldState {
  return commands.reduce<WorldState>((state, command) => runTurn(state, command).state, INITIAL_STATE);
}

describe("Z-machine deterministic core", () => {
  it("produces identical state and transcript for the same command sequence", () => {
    fc.assert(
      fc.property(commandSequence, (commands) => {
        const first = commands.map((command) => runTurn(INITIAL_STATE, command));
        const second = commands.map((command) => runTurn(INITIAL_STATE, command));
        expect(second).toEqual(first);
      }),
    );
  });

  it("never moves the player through a wall, regardless of replay order", () => {
    fc.assert(
      fc.property(commandSequence, (commands) => {
        const finalState = replay(commands);
        expect(["cell", "corridor"]).toContain(finalState.location);
        expect(finalState.moves).toBeGreaterThanOrEqual(0);
        expect(finalState.moves).toBeLessThanOrEqual(commands.length);
      }),
    );
  });

  it("keeps every turn reversible by replaying the prefix", () => {
    fc.assert(
      fc.property(commandSequence, fc.nat(), (commands, split) => {
        const cut = split % (commands.length + 1);
        const prefix = commands.slice(0, cut);
        const suffix = commands.slice(cut);
        expect(replay([...prefix, ...suffix])).toEqual(replay(commands));
      }),
    );
  });
});
