# Steering: product and state authority

## What this product is

A 1979 Z-machine text adventure, resurrected. The LLM is the natural-language
front end. The deterministic interpreter owns every fact about the world.

## Non-negotiable boundary

- The LLM may propose an intent. It must never write world state directly.
- Only `src/zmachine/` produces or mutates `WorldState`. UI code reads state and
  renders it; it does not compute game truth.
- Every transcript line shown to a player must be traceable to an interpreter
  turn (or to an explicit, labelled UI notice).
- A refused or unparsed command must leave state untouched. "I did not understand"
  is never allowed to move the player, consume an item, or advance time.

## Product rule

If a demo beat requires the LLM to be right about game state, that beat is
designed wrong. Rewrite it so the interpreter answers and the LLM only phrases
the answer.
