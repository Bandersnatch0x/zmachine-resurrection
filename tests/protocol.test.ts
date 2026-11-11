import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { hasClauseSeparator, parseCommand } from "../src/zmachine/parse";
import {
  DIRECTIONS,
  formatCommand,
  validateCommand,
} from "../src/zmachine/protocol";
import type { Command, Direction } from "../src/zmachine/protocol";

const NOUNS = ["key", "lamp", "brass lamp", "notebook", "hatch", "door"];

const commandArbitrary: fc.Arbitrary<Command> = fc.oneof(
  fc.constant<Command>({ kind: "look" }),
  fc.constant<Command>({ kind: "inventory" }),
  fc.constant<Command>({ kind: "wait" }),
  fc
    .constantFrom<Direction>(...DIRECTIONS)
    .map((direction): Command => ({ kind: "go", direction })),
  fc.constantFrom(...NOUNS).map((noun): Command => ({ kind: "take", noun })),
  fc.constantFrom(...NOUNS).map((noun): Command => ({ kind: "drop", noun })),
  fc.constantFrom(...NOUNS).map((noun): Command => ({ kind: "open", noun })),
  fc.boolean().map((lit): Command => ({ kind: "lamp", lit })),
);

describe("command protocol", () => {
  it("round-trips every canonical command through text", () => {
    fc.assert(
      fc.property(commandArbitrary, (command) => {
        expect(parseCommand(formatCommand(command))).toEqual(command);
      }),
    );
  });

  it("accepts every well-formed command and rejects state-like extras", () => {
    fc.assert(
      fc.property(commandArbitrary, (command) => {
        expect(validateCommand(command)).toEqual(command);
      }),
    );

    expect(validateCommand({ kind: "look", moves: 1 })).toBeNull();
    expect(validateCommand({ kind: "go", direction: "north", location: "vault" })).toBeNull();
    expect(validateCommand({ kind: "go", direction: "up" })).toBeNull();
    expect(validateCommand({ kind: "take", noun: "  " })).toBeNull();
    expect(validateCommand({ kind: "lamp", lit: "yes" })).toBeNull();
    expect(validateCommand(null)).toBeNull();
    expect(validateCommand([])).toBeNull();
  });

  it("parses canonical single commands", () => {
    expect(parseCommand("  NORTH ")).toEqual({ kind: "go", direction: "north" });
    expect(parseCommand("take brass lamp")).toEqual({ kind: "take", noun: "brass lamp" });
    expect(parseCommand("pick up key")).toEqual({ kind: "take", noun: "key" });
    expect(parseCommand("light lamp")).toEqual({ kind: "lamp", lit: true });
    expect(parseCommand("put out the lamp")).toEqual({ kind: "lamp", lit: false });
    expect(parseCommand("xyzzy")).toBeNull();
    expect(parseCommand("")).toBeNull();
  });

  it("refuses to parse anything containing a clause separator", () => {
    for (const input of ["take key and go north", "look, inventory", "wait; look", "go north then look"]) {
      expect(hasClauseSeparator(input)).toBe(true);
      expect(parseCommand(input)).toBeNull();
    }
    expect(hasClauseSeparator("pick up the brass lamp")).toBe(false);
  });
});
