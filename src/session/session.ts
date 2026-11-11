import type { Locale } from "../i18n";
import { observe } from "../zmachine/observe";
import { runTurn } from "../zmachine/interpreter";
import type { Command } from "../zmachine/protocol";
import type { RoomId, Snapshot } from "../zmachine/types";
import { INITIAL_STATE } from "../zmachine/world";

export interface SessionEntry {
  readonly input: string;
  readonly commands: readonly Command[];
}

export interface TurnSummary {
  readonly output: readonly string[];
  readonly refused: boolean;
}

export interface CommitResult {
  readonly state: Snapshot;
  readonly turns: readonly TurnSummary[];
}

export interface SessionView {
  readonly room: RoomId;
  readonly moves: number;
  readonly logLength: number;
  readonly hasCheckpoint: boolean;
}

export interface Session {
  readonly state: Snapshot;
  readonly log: readonly SessionEntry[];
  view(): SessionView;
  describe(locale?: Locale): readonly string[];
  commit(entry: SessionEntry, locale?: Locale): CommitResult;
  save(): void;
  restore(): CommitResult;
  replayAll(locale?: Locale): readonly TurnSummary[];
}

function run(
  state: Snapshot,
  commands: readonly Command[],
  locale: Locale,
): CommitResult {
  let current = state;
  const turns: TurnSummary[] = [];
  for (const command of commands) {
    const result = runTurn(current, command, locale);
    current = result.state;
    turns.push({ output: result.output, refused: result.refused });
  }
  return { state: current, turns };
}

/**
 * The session owns the command log and one in-memory checkpoint. Replay is
 * always snapshot plus commands, never natural language and never model text.
 */
export function createSession(start: Snapshot = INITIAL_STATE): Session {
  const origin = start;
  let state = start;
  let log: SessionEntry[] = [];
  let checkpoint: { readonly at: number; readonly state: Snapshot } | null = null;

  return {
    get state() {
      return state;
    },
    get log() {
      return log;
    },
    view(): SessionView {
      return {
        room: observe(state).room.id,
        moves: state.moves,
        logLength: log.length,
        hasCheckpoint: checkpoint !== null,
      };
    },
    describe(locale: Locale = "en"): readonly string[] {
      return runTurn(state, { kind: "look" }, locale).output;
    },
    commit(entry: SessionEntry, locale: Locale = "en"): CommitResult {
      log = [...log, entry];
      const result = run(state, entry.commands, locale);
      state = result.state;
      return result;
    },
    save(): void {
      checkpoint = { at: log.length, state };
    },
    restore(): CommitResult {
      if (checkpoint === null) {
        return { state, turns: [] };
      }
      log = log.slice(0, checkpoint.at);
      state = checkpoint.state;
      return { state, turns: [] };
    },
    replayAll(locale: Locale = "en"): readonly TurnSummary[] {
      let current = origin;
      const turns: TurnSummary[] = [];
      for (const entry of log) {
        const result = run(current, entry.commands, locale);
        current = result.state;
        turns.push(...result.turns);
      }
      state = current;
      return turns;
    },
  };
}
