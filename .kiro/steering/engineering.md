# Steering: engineering constraints

## Determinism

- `runTurn(state, input)` in `src/zmachine/interpreter.ts` is pure: no clocks,
  no randomness, no I/O. Replay of the same command sequence from the same
  snapshot must produce byte-identical output.
- Any new game rule lands in the interpreter, never in `src/main.ts`.

## Tests

- `npm run check` is the delivery gate: `tsc --noEmit` then `vitest run`.
- New interpreter behaviour needs a property test in `tests/` using `fast-check`,
  not only an example-based test.
- Tests assert observable output and state, not private helpers.

## Scope

- No UI framework. Native DOM only.
- No runtime dependency may be added without a written reason in the PR or ticket.
- `.kiro/` is part of the submission and must stay out of `.gitignore`.
