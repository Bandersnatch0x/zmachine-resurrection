import { describe, expect, it } from "vitest";
import { interpret } from "../src/frontend/interpret";
import type { IntentSource } from "../src/frontend/sources";
import { createSession } from "../src/session/session";
import { parseCommand, runTurn } from "../src/zmachine";
import type { Command, Snapshot } from "../src/zmachine";

function modelReturning(payload: unknown): IntentSource {
  return { id: "fake", label: "fake model", interpret: () => Promise.resolve(payload) };
}

function play(inputs: readonly string[]): { state: Snapshot; transcript: readonly string[] } {
  let state: Snapshot = createSession().state;
  const transcript: string[] = [];
  for (const input of inputs) {
    const command = parseCommand(input);
    if (command === null) {
      continue;
    }
    const result = runTurn(state, command);
    state = result.state;
    transcript.push(...result.output);
  }
  return { state, transcript };
}

describe("golden walkthrough", () => {
  it("reaches the vault and returns, counting only accepted state changes", () => {
    const { state, transcript } = play([
      "look",
      "take key",
      "north",
      "open hatch",
      "east",
      "look",
      "west",
      "south",
      "inventory",
    ]);

    expect(state.location).toBe("cell");
    expect(state.moves).toBe(6);
    expect(state.doors.hatch).toBe("open");
    expect(state.items.key.placement).toEqual({ kind: "carried" });
    expect(transcript.join(" ")).toContain("Vault");
  });
});

describe("hallucination refusal", () => {
  it("refuses a fixed wrong intent and leaves the snapshot untouched by reference", async () => {
    const session = createSession();
    session.commit({ input: "north", commands: [{ kind: "go", direction: "north" }] });
    const before: Snapshot = session.state;

    const wrongIntent: unknown = {
      commands: [{ kind: "go", direction: "east" }],
      claim: "You are already inside the vault, standing among the dead terminals.",
    };

    const outcome = await interpret("I walk east into the vault", modelReturning(wrongIntent));
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }

    const result = session.commit({ input: "I walk east into the vault", commands: outcome.intent.commands });

    expect(result.turns[0]?.refused).toBe(true);
    expect(result.turns[0]?.output.join(" ")).toContain("locked");
    expect(session.state).toBe(before);
    expect(session.state.moves).toBe(1);
    expect(session.state.location).toBe("corridor");
    expect(session.state.doors.hatch).toBe("locked");

    expect(outcome.notices).toEqual([
      { kind: "claim", text: "ignored model claim: You are already inside the vault, standing among the dead terminals." },
    ]);
    expect(result.turns[0]?.output.join(" ")).not.toContain("vault");
  });

  it("does not let a claim become narration even when the command is accepted", async () => {
    const session = createSession();
    const outcome = await interpret(
      "pick the key up",
      modelReturning({
        commands: [{ kind: "take", noun: "key" } satisfies Command],
        narration: "The key was never on the floor; you have carried it all along.",
      }),
    );
    if (!outcome.ok) {
      throw new Error("expected an intent");
    }

    expect(outcome.via).toBe("model");
    const result = session.commit({ input: "pick the key up", commands: outcome.intent.commands });

    const transcript = result.turns.flatMap((turn) => turn.output);
    expect(transcript).toEqual(["Taken: brass key."]);
    expect(outcome.notices).toEqual([
      {
        kind: "claim",
        text: "ignored model claim: The key was never on the floor; you have carried it all along.",
      },
    ]);
  });
});
