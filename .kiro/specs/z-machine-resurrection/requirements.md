# Spec: Z-machine Resurrection

## Goal

Demonstrate that a language model can front a text adventure without ever being
the authority on the world.

## Requirements

### R1 — Terminal shell

WHEN the page loads, THE SYSTEM SHALL render a terminal-style transcript and a
command input that keeps focus after every submission.

### R2 — Deterministic turn

WHEN the same `WorldState` and the same input are passed to `runTurn`, THE
SYSTEM SHALL return the same next `WorldState` and the same output lines.

### R3 — Bounded transitions

WHEN a command is unknown or a movement has no exit, THE SYSTEM SHALL return the
unchanged `WorldState` and an explanatory line.

### R4 — Single state owner

THE SYSTEM SHALL expose world state only through the `ZMachine` interface, and
SHALL NOT let UI code construct a `WorldState` literal.

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
