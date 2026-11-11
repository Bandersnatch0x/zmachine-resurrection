# Spec: Z-machine Resurrection

## Goal

Demonstrate that a language model can front a text adventure without ever being
the authority on the world.

## Requirements

### R1 — Terminal shell

WHEN the page loads, THE SYSTEM SHALL render a terminal-style transcript and a
command input that keeps focus after every submission.

### R2 — Deterministic turn

WHEN the same `Snapshot` and the same `Command[]` are replayed, THE SYSTEM SHALL
yield the same resulting `Snapshot` and the same output lines.

### R3 — Bounded transitions

WHEN a command is unknown or a movement has no exit, THE SYSTEM SHALL return the
unchanged `Snapshot` and an explanatory line.

### R4 — Single state owner

THE SYSTEM SHALL expose world state only through the `Snapshot` type and the
session view, and SHALL NOT let UI code construct a `WorldState` literal.

### R5 — Replay and restore

WHEN a snapshot is restored, THE SYSTEM SHALL continue from exactly that state,
with no hidden counters carried over.

### R6 — Gate

WHEN `npm run check` runs, THE SYSTEM SHALL fail on any type error or failing
property test.

## Acceptance

- `npm run check` green.
- `npm run build` produces `dist/`.
- Manual smoke: `north`, `south`, `look`, `xyzzy` in that order ends in `cell`
  with `moves: 2`.
- The key: it starts in the cell, `take key` carries it, and only a carried key
  opens the hatch.
- The locked hatch: `open hatch` without the key is refused, the snapshot is
  returned by reference, and the vault stays unreachable until the hatch opens.
- Lamp states: the lamp starts carried and lit, `extinguish` darkens the
  corridor, a dark room refuses every world-changing command, and relighting
  restores the view.
- Natural-language compound input: `take the key and go north` parses into two
  commands and replays from the compiled `Command[]`, never from the sentence.
- False-premise refusal: a model claim such as "you are already in the vault"
  is rendered as an ignored claim, and the interpreter's refusal stands.
- Restore and replay: `SAVE` at input 0 leaves a checkpoint that `RESTORE`
  finds, `RESTORE` reprints the room, and `REPLAY` runs the log from the
  session's start snapshot.
