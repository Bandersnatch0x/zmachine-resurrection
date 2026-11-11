import { observe } from "../zmachine/observe";
import { runTurn } from "../zmachine/interpreter";
import type { Command } from "../zmachine/protocol";
import type { Snapshot } from "../zmachine/types";
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
  readonly room: string;
  readonly moves: number;
  readonly logLength: number;
  readonly hasCheckpoint: boolean;
}

export interface Session {
  readonly state: Snapshot;
  readonly log: readonly SessionEntry[];
  view(): SessionView;
  describe(): readonly string[];
  commit(entry: SessionEntry): CommitResult;
  save(): void;
  restore(): CommitResult;
  replayAll(): readonly TurnSummary[];
}

function run(state: Snapshot, commands: readonly Command[]): CommitResult {
  let current = state;
  const turns: TurnSummary[] = [];
  for (const command of commands) {
    const result = runTurn(current, command);
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
    describe(): readonly string[] {
      return runTurn(state, { kind: "look" }).output;
    },
    commit(entry: SessionEntry): CommitResult {
      log = [...log, entry];
      const result = run(state, entry.commands);
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
    replayAll(): readonly TurnSummary[] {
      let current = origin;
      const turns: TurnSummary[] = [];
      for (const entry of log) {
        const result = run(current, entry.commands);
        current = result.state;
        turns.push(...result.turns);
      }
      state = current;
      return turns;
    },
  };
}
