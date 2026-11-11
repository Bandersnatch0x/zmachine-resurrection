import { parseCommand } from "../zmachine/parse";
import type { Command } from "../zmachine/protocol";
import { compileIntent } from "./intent";
import type { Intent } from "./intent";
import { parseRuleIntent } from "./sources";
import type { IntentSource } from "./sources";

export interface Notice {
  readonly kind: "fallback" | "claim" | "refusal";
  readonly text: string;
}

export type InterpretOutcome =
  | {
      readonly ok: true;
      readonly intent: Intent;
      readonly via: "typed" | "model" | "rules";
      readonly notices: readonly Notice[];
    }
  | {
      readonly ok: false;
      readonly notices: readonly Notice[];
    };

function accepted(
  intent: Intent,
  via: "typed" | "model" | "rules",
  notices: readonly Notice[],
): InterpretOutcome {
  return { ok: true, intent, via, notices };
}

function rejected(notices: readonly Notice[]): InterpretOutcome {
  return { ok: false, notices };
}

function claimsToNotices(intent: Intent): readonly Notice[] {
  return intent.claims.map((claim) => ({
    kind: "claim" as const,
    text: `ignored model claim: ${claim}`,
  }));
}

/**
 * Typed fast path first, then the model, then the deterministic rules. The
 * model is never in the replay path, and every fallback leaves a notice.
 */
export async function interpret(
  raw: string,
  model: IntentSource | null,
): Promise<InterpretOutcome> {
  const typed: Command | null = parseCommand(raw);
  if (typed !== null) {
    return accepted({ commands: [typed], claims: [] }, "typed", []);
  }

  const notices: Notice[] = [];
  if (model === null) {
    notices.push({ kind: "fallback", text: "no model configured; using the rule parser" });
  } else {
    try {
      const payload = await model.interpret(raw);
      const compiled = compileIntent(payload);
      if (compiled.ok && compiled.intent.commands.length > 0) {
        return accepted(compiled.intent, "model", claimsToNotices(compiled.intent));
      }
      notices.push({
        kind: "fallback",
        text: compiled.ok
          ? "the model returned no command; using the rule parser"
          : `the model intent was rejected (${compiled.reason}); using the rule parser`,
      });
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : "unknown error";
      notices.push({
        kind: "fallback",
        text: `the model is unavailable (${detail}); using the rule parser`,
      });
    }
  }

  const commands = parseRuleIntent(raw);
  if (commands.length === 0) {
    notices.push({ kind: "refusal", text: `I cannot turn "${raw.trim()}" into a command.` });
    return rejected(notices);
  }

  return accepted({ commands, claims: [] }, "rules", notices);
}
