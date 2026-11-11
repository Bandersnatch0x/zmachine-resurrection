import { say } from "../i18n";
import type { Locale } from "../i18n";
import { copy } from "../i18n/copy";
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

function claimsToNotices(intent: Intent, locale: Locale): readonly Notice[] {
  return intent.claims.map((claim) => ({
    kind: "claim" as const,
    text: say(locale, copy.notices.ignoredClaim, { claim }),
  }));
}

/**
 * Typed fast path first, then the model, then the deterministic rules. The
 * model is never in the replay path, and every fallback leaves a notice.
 */
export async function interpret(
  raw: string,
  model: IntentSource | null,
  locale: Locale = "en",
): Promise<InterpretOutcome> {
  const typed: Command | null = parseCommand(raw);
  if (typed !== null) {
    return accepted({ commands: [typed], claims: [] }, "typed", []);
  }

  const notices: Notice[] = [];
  if (model === null) {
    notices.push({ kind: "fallback", text: say(locale, copy.notices.noModel) });
  } else {
    try {
      const payload = await model.interpret(raw);
      const compiled = compileIntent(payload);
      if (compiled.ok && compiled.intent.commands.length > 0) {
        return accepted(compiled.intent, "model", claimsToNotices(compiled.intent, locale));
      }
      notices.push({
        kind: "fallback",
        text: compiled.ok
          ? say(locale, copy.notices.noCommand)
          : say(locale, copy.notices.rejected, { reason: compiled.reason }),
      });
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : "unknown error";
      notices.push({
        kind: "fallback",
        text: say(locale, copy.notices.unavailable, { detail }),
      });
    }
  }

  const commands = parseRuleIntent(raw);
  if (commands.length === 0) {
    notices.push({
      kind: "refusal",
      text: say(locale, copy.notices.unparsed, { raw: raw.trim() }),
    });
    return rejected(notices);
  }

  return accepted({ commands, claims: [] }, "rules", notices);
}
