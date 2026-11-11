import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { compileIntent } from "../src/frontend/intent";
import { interpret } from "../src/frontend/interpret";
import type { IntentSource } from "../src/frontend/sources";
import {
  createHttpSource,
  createRuleSource,
  parseRuleIntent,
  sourceFromEndpoint,
} from "../src/frontend/sources";

const junk: fc.Arbitrary<unknown> = fc.oneof(
  fc.constant(null),
  fc.constant(undefined),
  fc.constant(0),
  fc.string(),
  fc.array(fc.string()),
  fc.dictionary(fc.string(), fc.anything()),
  fc.record({ commands: fc.anything() }),
  fc.record({ commands: fc.array(fc.anything()) }),
);

function modelReturning(payload: unknown): IntentSource {
  return { id: "fake", label: "fake model", interpret: () => Promise.resolve(payload) };
}

function modelThrowing(message: string): IntentSource {
  return {
    id: "fake",
    label: "fake model",
    interpret: () => Promise.reject(new Error(message)),
  };
}

describe("compileIntent", () => {
  it("never throws on arbitrary payloads", () => {
    fc.assert(
      fc.property(junk, (payload) => {
        expect(() => compileIntent(payload)).not.toThrow();
      }),
    );
  });

  it("is all-or-nothing across the command list", () => {
    const good = { kind: "look" };
    const bad = { kind: "go", direction: "sideways" };
    expect(compileIntent({ commands: [good, bad] }).ok).toBe(false);
    expect(compileIntent({ commands: [good, { kind: "wait" }] }).ok).toBe(true);
  });

  it("never spreads state-like fields into the commands", () => {
    const result = compileIntent({
      commands: [{ kind: "look", moves: 99, location: "vault" }],
      moves: 99,
      location: "vault",
    });
    expect(result.ok).toBe(false);

    const clean = compileIntent({ commands: [{ kind: "look" }], moves: 99 });
    expect(clean).toEqual({ ok: true, intent: { commands: [{ kind: "look" }], claims: [] } });
  });

  it("collects and truncates every claim-shaped field", () => {
    const result = compileIntent({
      commands: [{ kind: "wait" }],
      claim: "you are already in the vault",
      claims: ["the hatch is open", 42],
      narration: "The door swings wide.",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.intent.claims).toEqual([
      "you are already in the vault",
      "the hatch is open",
      "The door swings wide.",
    ]);

    const long = compileIntent({ commands: [{ kind: "wait" }], claim: "x".repeat(500) });
    if (long.ok) {
      expect(long.intent.claims[0]?.length).toBeLessThanOrEqual(160);
    }
  });

  it("rejects empty and oversized command lists", () => {
    expect(compileIntent({ commands: [] }).ok).toBe(false);
    expect(compileIntent({ commands: Array.from({ length: 9 }, () => ({ kind: "look" })) }).ok).toBe(
      false,
    );
  });
});

describe("rule source", () => {
  it("parses every verb family the brief names", () => {
    expect(parseRuleIntent("take the key")).toEqual([{ kind: "take", noun: "key" }]);
    expect(parseRuleIntent("pick up the lamp")).toEqual([{ kind: "take", noun: "lamp" }]);
    expect(parseRuleIntent("grab notebook")).toEqual([{ kind: "take", noun: "notebook" }]);
    expect(parseRuleIntent("get key")).toEqual([{ kind: "take", noun: "key" }]);
    expect(parseRuleIntent("drop the key")).toEqual([{ kind: "drop", noun: "key" }]);
    expect(parseRuleIntent("walk east")).toEqual([{ kind: "go", direction: "east" }]);
    expect(parseRuleIntent("head west")).toEqual([{ kind: "go", direction: "west" }]);
    expect(parseRuleIntent("move north")).toEqual([{ kind: "go", direction: "north" }]);
    expect(parseRuleIntent("south")).toEqual([{ kind: "go", direction: "south" }]);
    expect(parseRuleIntent("light the lamp")).toEqual([{ kind: "lamp", lit: true }]);
    expect(parseRuleIntent("ignite lamp")).toEqual([{ kind: "lamp", lit: true }]);
    expect(parseRuleIntent("extinguish the lamp")).toEqual([{ kind: "lamp", lit: false }]);
    expect(parseRuleIntent("put out the lamp")).toEqual([{ kind: "lamp", lit: false }]);
    expect(parseRuleIntent("douse the lamp")).toEqual([{ kind: "lamp", lit: false }]);
    expect(parseRuleIntent("unlock the hatch")).toEqual([{ kind: "open", noun: "hatch" }]);
    expect(parseRuleIntent("open hatch")).toEqual([{ kind: "open", noun: "hatch" }]);
    expect(parseRuleIntent("look")).toEqual([{ kind: "look" }]);
    expect(parseRuleIntent("inventory")).toEqual([{ kind: "inventory" }]);
    expect(parseRuleIntent("wait")).toEqual([{ kind: "wait" }]);
  });

  it("splits compound clauses on and, then, commas, and semicolons", () => {
    const expected = [
      { kind: "take", noun: "key" },
      { kind: "go", direction: "north" },
    ];
    for (const input of [
      "take the key and go north",
      "take the key, go north",
      "take the key; go north",
      "take the key then go north",
      "take the key and then go north",
    ]) {
      expect(parseRuleIntent(input)).toEqual(expected);
    }
  });

  it("returns nothing for input it cannot parse", () => {
    expect(parseRuleIntent("xyzzy")).toEqual([]);
    expect(parseRuleIntent("")).toEqual([]);
    expect(parseRuleIntent("look and xyzzy")).toEqual([]);
  });

  it("returns a payload that compiles cleanly", async () => {
    const source = createRuleSource();
    const payload = await source.interpret("light the lamp and go north");
    const compiled = compileIntent(payload);
    expect(compiled.ok).toBe(true);
  });
});

describe("HTTP source", () => {
  it("posts the raw input and returns the parsed payload", async () => {
    let seenUrl = "";
    let seenBody: unknown = null;
    const fakeFetch: typeof fetch = (url, init) => {
      seenUrl = String(url);
      seenBody = JSON.parse(String(init?.body));
      expect(init?.method).toBe("POST");
      expect(new Headers(init?.headers).get("Content-Type")).toBe("application/json");
      return Promise.resolve(
        new Response(JSON.stringify({ commands: [{ kind: "look" }] }), { status: 200 }),
      );
    };

    const source = createHttpSource("/api/interpret", fakeFetch);
    const payload = await source.interpret("take the key and go north");

    expect(seenUrl).toBe("/api/interpret");
    expect(seenBody).toEqual({ input: "take the key and go north" });
    expect(payload).toEqual({ commands: [{ kind: "look" }] });
    expect(compileIntent(payload).ok).toBe(true);
  });

  it("throws on a non-2xx reply so the orchestrator can fall back", async () => {
    const source = createHttpSource("/api/interpret", () =>
      Promise.resolve(new Response("{}", { status: 503 })),
    );
    await expect(source.interpret("go north")).rejects.toThrow("503");

    const outcome = await interpret("walk north", source);
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.via).toBe("rules");
      expect(outcome.notices[0]?.text).toContain("503");
    }
  });

  it("only builds an HTTP source when an endpoint is set", () => {
    expect(sourceFromEndpoint(undefined).id).toBe("rules");
    expect(sourceFromEndpoint("   ").id).toBe("rules");
    expect(sourceFromEndpoint("/api/interpret").id).toBe("http");
  });
});

describe("interpret orchestration", () => {
  it("takes the typed fast path without touching the model", async () => {
    let called = false;
    const spy: IntentSource = {
      id: "spy",
      label: "spy",
      interpret: () => {
        called = true;
        return Promise.resolve({ commands: [{ kind: "look" }] });
      },
    };
    const outcome = await interpret("look", spy);
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.via).toBe("typed");
      expect(outcome.notices).toEqual([]);
    }
    expect(called).toBe(false);
  });

  it("uses the model when it returns a valid intent and surfaces claims", async () => {
    const outcome = await interpret(
      "you are already in the vault",
      modelReturning({
        commands: [{ kind: "wait" }],
        narration: "You step through the hatch into the vault.",
      }),
    );
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.via).toBe("model");
      expect(outcome.intent.commands).toEqual([{ kind: "wait" }]);
      expect(outcome.notices).toEqual([
        { kind: "claim", text: "ignored model claim: You step through the hatch into the vault." },
      ]);
    }
  });

  it("falls back to the rules and says so when the model throws", async () => {
    const outcome = await interpret("walk north", modelThrowing("network down"));
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.via).toBe("rules");
      expect(outcome.notices[0]?.kind).toBe("fallback");
      expect(outcome.notices[0]?.text).toContain("network down");
    }
  });

  it("falls back when the model returns a malformed intent", async () => {
    const outcome = await interpret("walk east", modelReturning({ commands: [{ kind: "fly" }] }));
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.via).toBe("rules");
      expect(outcome.notices[0]?.text).toContain("rejected");
    }
  });

  it("says so when no model is configured", async () => {
    const outcome = await interpret("walk north", null);
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.via).toBe("rules");
      expect(outcome.notices).toEqual([
        { kind: "fallback", text: "no model configured; using the rule parser" },
      ]);
    }
  });

  it("refuses input neither the model nor the rules can read", async () => {
    const outcome = await interpret("xyzzy", null);
    expect(outcome.ok).toBe(false);
    expect(outcome.notices.at(-1)?.kind).toBe("refusal");
  });

  it("never lets a model command escape the protocol", async () => {
    const outcome = await interpret(
      "go east",
      modelReturning({
        commands: [{ kind: "go", direction: "east", doors: { hatch: "open" } }],
      }),
    );
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.intent.commands).toEqual([{ kind: "go", direction: "east" }]);
    }
  });
});
