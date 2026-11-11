import { isDirection } from "../zmachine/protocol";
import type { Command, Direction } from "../zmachine/protocol";

export interface IntentSource {
  readonly id: string;
  readonly label: string;
  interpret(raw: string): Promise<unknown>;
}

const CLAUSE_SPLIT = /\s*[,;]\s*|\s+(?:and then|then|and)\s+/i;

const DIRECTION_WORDS: Readonly<Record<string, Direction>> = {
  north: "north",
  n: "north",
  south: "south",
  s: "south",
  east: "east",
  e: "east",
  west: "west",
  w: "west",
};

function stripArticles(text: string): string {
  return text.replace(/^(?:the|a|an)\s+/, "").trim();
}

function directionOf(word: string): Direction | null {
  const normalized = word.toLowerCase();
  return DIRECTION_WORDS[normalized] ?? null;
}

function parseClause(clause: string): Command | null {
  const words = clause
    .toLowerCase()
    .replace(/[.!?]+$/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const verb = words[0];
  if (verb === undefined) {
    return null;
  }
  const rest = words.slice(1);
  const noun = stripArticles(rest.join(" "));

  switch (verb) {
    case "look":
    case "l":
    case "examine":
      return rest.length === 0 ? { kind: "look" } : null;
    case "inventory":
    case "inv":
    case "i":
      return rest.length === 0 ? { kind: "inventory" } : null;
    case "wait":
    case "z":
      return rest.length === 0 ? { kind: "wait" } : null;
    case "take":
    case "get":
    case "grab":
      return noun.length > 0 ? { kind: "take", noun } : null;
    case "pick":
      return rest[0] === "up" && stripArticles(rest.slice(1).join(" ")).length > 0
        ? { kind: "take", noun: stripArticles(rest.slice(1).join(" ")) }
        : null;
    case "drop":
      return noun.length > 0 ? { kind: "drop", noun } : null;
    case "open":
    case "unlock":
      return noun.length > 0 ? { kind: "open", noun } : null;
    case "go":
    case "walk":
    case "head":
    case "move": {
      const direction = rest.length === 1 ? directionOf(rest[0] ?? "") : null;
      return direction === null ? null : { kind: "go", direction };
    }
    case "light":
    case "ignite":
      return { kind: "lamp", lit: true };
    case "extinguish":
    case "douse":
      return { kind: "lamp", lit: false };
    case "put":
      return rest[0] === "out" ? { kind: "lamp", lit: false } : null;
    case "turn":
      if (rest[0] === "on") {
        return { kind: "lamp", lit: true };
      }
      return rest[0] === "off" ? { kind: "lamp", lit: false } : null;
    default: {
      const direction = directionOf(verb);
      return direction !== null && rest.length === 0 ? { kind: "go", direction } : null;
    }
  }
}

/**
 * Deterministic natural-language front end. It is a real parser, not a mock,
 * so the demo works with no model and no key at all.
 */
export function parseRuleIntent(raw: string): readonly Command[] {
  const clauses = raw
    .split(CLAUSE_SPLIT)
    .map((clause) => clause.trim())
    .filter((clause) => clause.length > 0);

  const commands: Command[] = [];
  for (const clause of clauses) {
    const command = parseClause(clause);
    if (command === null) {
      return [];
    }
    commands.push(command);
  }
  return commands;
}

export function createRuleSource(): IntentSource {
  return {
    id: "rules",
    label: "rule parser",
    interpret(raw: string): Promise<unknown> {
      return Promise.resolve({ commands: parseRuleIntent(raw), source: "rules" });
    },
  };
}

export function createHttpSource(endpoint: string, fetchImpl: typeof fetch = fetch): IntentSource {
  return {
    id: "http",
    label: "language model",
    async interpret(raw: string): Promise<unknown> {
      const response = await fetchImpl(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: raw }),
      });
      if (!response.ok) {
        throw new Error(`interpret endpoint returned ${response.status}`);
      }
      return response.json();
    },
  };
}

export function sourceFromEndpoint(
  endpoint: string | undefined,
  fetchImpl: typeof fetch = fetch,
): IntentSource {
  if (endpoint === undefined || endpoint.trim() === "") {
    return createRuleSource();
  }
  return createHttpSource(endpoint, fetchImpl);
}

export { isDirection };
