import type { Command, Direction } from "./protocol";

const CLAUSE_SEPARATOR = /\s+(?:and|then)\s+|[,;]/i;

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

export function hasClauseSeparator(input: string): boolean {
  return CLAUSE_SEPARATOR.test(input);
}

function directionOf(word: string): Direction | null {
  return DIRECTION_WORDS[word] ?? null;
}

function nounFrom(words: readonly string[]): string | null {
  const noun = words.join(" ");
  return noun.length > 0 ? noun : null;
}

function isLampPhrase(words: readonly string[]): boolean {
  if (words.length === 0) {
    return true;
  }
  const phrase = words.join(" ");
  return (
    phrase === "lamp" ||
    phrase === "the lamp" ||
    phrase === "brass lamp" ||
    phrase === "the brass lamp"
  );
}

export function parseCommand(input: string): Command | null {
  if (hasClauseSeparator(input)) {
    return null;
  }

  const words = input.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const verb = words[0];
  if (verb === undefined) {
    return null;
  }
  const rest = words.slice(1);

  switch (verb) {
    case "look":
    case "l":
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
    case "grab": {
      const noun = nounFrom(rest);
      return noun === null ? null : { kind: "take", noun };
    }
    case "pick": {
      if (rest[0] !== "up") {
        return null;
      }
      const noun = nounFrom(rest.slice(1));
      return noun === null ? null : { kind: "take", noun };
    }
    case "drop": {
      const noun = nounFrom(rest);
      return noun === null ? null : { kind: "drop", noun };
    }
    case "open":
    case "unlock": {
      const noun = nounFrom(rest);
      return noun === null ? null : { kind: "open", noun };
    }
    case "go": {
      if (rest.length !== 1) {
        return null;
      }
      const direction = directionOf(rest[0] ?? "");
      return direction === null ? null : { kind: "go", direction };
    }
    case "light":
    case "ignite":
      return isLampPhrase(rest) ? { kind: "lamp", lit: true } : null;
    case "extinguish":
    case "douse":
      return isLampPhrase(rest) ? { kind: "lamp", lit: false } : null;
    case "put": {
      if (rest[0] !== "out") {
        return null;
      }
      return isLampPhrase(rest.slice(1)) ? { kind: "lamp", lit: false } : null;
    }
    default: {
      const direction = directionOf(verb);
      return direction !== null && rest.length === 0 ? { kind: "go", direction } : null;
    }
  }
}
