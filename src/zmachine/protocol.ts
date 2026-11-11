export type Direction = "north" | "south" | "east" | "west";

export type Command =
  | { readonly kind: "look" }
  | { readonly kind: "go"; readonly direction: Direction }
  | { readonly kind: "take"; readonly noun: string }
  | { readonly kind: "drop"; readonly noun: string }
  | { readonly kind: "inventory" }
  | { readonly kind: "lamp"; readonly lit: boolean }
  | { readonly kind: "open"; readonly noun: string }
  | { readonly kind: "wait" };

export const DIRECTIONS: readonly Direction[] = ["north", "south", "east", "west"];

export const MAX_NOUN_LENGTH = 40;

export function isDirection(value: unknown): value is Direction {
  return value === "north" || value === "south" || value === "east" || value === "west";
}

export function normalizeNoun(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function formatCommand(command: Command): string {
  switch (command.kind) {
    case "look":
      return "look";
    case "go":
      return `go ${command.direction}`;
    case "take":
      return `take ${command.noun}`;
    case "drop":
      return `drop ${command.noun}`;
    case "inventory":
      return "inventory";
    case "lamp":
      return command.lit ? "light lamp" : "extinguish lamp";
    case "open":
      return `open ${command.noun}`;
    case "wait":
      return "wait";
  }
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Readonly<Record<string, unknown>>, allowed: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === allowed.length && allowed.every((key) => keys.includes(key));
}

function readNoun(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const noun = normalizeNoun(value);
  if (noun.length === 0 || noun.length > MAX_NOUN_LENGTH) {
    return null;
  }
  if (/[\u0000-\u001f]/.test(noun)) {
    return null;
  }
  return noun;
}

export function validateCommand(value: unknown): Command | null {
  if (!isRecord(value)) {
    return null;
  }

  switch (value.kind) {
    case "look":
      return hasOnlyKeys(value, ["kind"]) ? { kind: "look" } : null;
    case "inventory":
      return hasOnlyKeys(value, ["kind"]) ? { kind: "inventory" } : null;
    case "wait":
      return hasOnlyKeys(value, ["kind"]) ? { kind: "wait" } : null;
    case "go": {
      if (!hasOnlyKeys(value, ["kind", "direction"]) || !isDirection(value.direction)) {
        return null;
      }
      return { kind: "go", direction: value.direction };
    }
    case "take":
    case "drop":
    case "open": {
      if (!hasOnlyKeys(value, ["kind", "noun"])) {
        return null;
      }
      const noun = readNoun(value.noun);
      if (noun === null) {
        return null;
      }
      switch (value.kind) {
        case "take":
          return { kind: "take", noun };
        case "drop":
          return { kind: "drop", noun };
        case "open":
          return { kind: "open", noun };
      }
      return null;
    }
    case "lamp": {
      if (!hasOnlyKeys(value, ["kind", "lit"]) || typeof value.lit !== "boolean") {
        return null;
      }
      return { kind: "lamp", lit: value.lit };
    }
    default:
      return null;
  }
}
