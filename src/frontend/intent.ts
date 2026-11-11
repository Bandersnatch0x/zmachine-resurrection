import { MAX_NOUN_LENGTH, normalizeNoun, validateCommand } from "../zmachine/protocol";
import type { Command } from "../zmachine/protocol";

export const MAX_INTENTS = 8;
export const MAX_RAW_INTENT_LENGTH = 200;
export const MAX_CLAIM_LENGTH = 160;

export interface Intent {
  readonly commands: readonly Command[];
  readonly claims: readonly string[];
}

export type CompileResult =
  | { readonly ok: true; readonly intent: Intent }
  | { readonly ok: false; readonly reason: string };

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function truncate(text: string, limit: number): string {
  return text.length <= limit ? text : `${text.slice(0, limit - 1)}…`;
}

function readClaim(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const text = truncate(value.trim().replace(/\s+/g, " "), MAX_CLAIM_LENGTH);
  return text.length > 0 ? text : null;
}

function readCommands(value: unknown): readonly Command[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  if (value.length === 0 || value.length > MAX_INTENTS) {
    return null;
  }
  const commands: Command[] = [];
  for (const candidate of value) {
    const command = validateCommand(candidate);
    if (command === null) {
      return null;
    }
    commands.push(command);
  }
  return commands;
}

function readClaims(payload: Readonly<Record<string, unknown>>): readonly string[] {
  const claims: string[] = [];
  for (const key of ["claim", "claims", "narration"]) {
    const raw = payload[key];
    if (typeof raw === "string") {
      const claim = readClaim(raw);
      if (claim !== null) {
        claims.push(claim);
      }
      continue;
    }
    if (Array.isArray(raw)) {
      for (const entry of raw) {
        const claim = readClaim(entry);
        if (claim !== null) {
          claims.push(claim);
        }
      }
    }
  }
  return claims;
}

/**
 * Untrusted payload in, trusted commands out. All-or-nothing: one malformed
 * command rejects the whole payload, and no raw object is spread through.
 */
export function compileIntent(raw: unknown): CompileResult {
  if (!isRecord(raw)) {
    return { ok: false, reason: "intent is not an object" };
  }

  const commands = readCommands(raw.commands);
  if (commands === null) {
    return { ok: false, reason: "intent commands are malformed" };
  }

  return { ok: true, intent: { commands, claims: readClaims(raw) } };
}

export function intentText(intent: Intent): string {
  return intent.commands
    .map((command) => {
      switch (command.kind) {
        case "go":
          return `go ${command.direction}`;
        case "take":
          return `take ${command.noun}`;
        case "drop":
          return `drop ${command.noun}`;
        case "open":
          return `open ${command.noun}`;
        case "lamp":
          return command.lit ? "light lamp" : "extinguish lamp";
        default:
          return command.kind;
      }
    })
    .join(", ");
}

export function isNounLike(value: string): boolean {
  const noun = normalizeNoun(value);
  return noun.length > 0 && noun.length <= MAX_NOUN_LENGTH;
}
