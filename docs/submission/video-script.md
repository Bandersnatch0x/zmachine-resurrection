# Demo video script

Target length: 2 minutes 40 seconds. Hard limit is 3 minutes. Judges are not required to watch past 3:00.

Language: English voiceover. Burned-in English captions are optional. Keep the terminal font at 20px or larger and the browser at 1280x800 or larger.

## Before recording

1. Build and serve the page. Either run the dev server with a model key, or serve `dist/` and open it with `?endpoint=<proxy-url>`.
2. Confirm the status bar shows `input: language model`. If it shows `rule parser`, the endpoint is not configured.
3. Test the hallucination line once. The model must return a command plus a claim. If it refuses to misbehave, use the fallback path in the last section.
4. Close every other tab, hide bookmarks, set the OS to Do Not Disturb.
5. Record at 1080p, 30fps, with system audio off and microphone on.

## Shot list

### 0:00 to 0:15 — The problem

Screen: the terminal, idle, cursor blinking in the cell.

Voiceover:

> A language model can narrate a world. It cannot be trusted to remember one. It will tell you that you picked up a key you never touched, or that a locked door is already open. Once the narration lies, the game is over.

### 0:15 to 0:40 — The split

Screen: scroll the README architecture block, or show a simple two-box diagram.

Voiceover:

> This is a 1979 Z-machine text adventure, revived. The model sits in front. It only turns your sentence into an intent. The interpreter behind it owns every fact. The model never reads or writes the world. When it is wrong, the interpreter refuses, and nothing moves.

### 0:40 to 1:25 — Play the real path

Screen: the terminal. Type slowly enough to read.

| Input | Expected output |
| --- | --- |
| `take the key and go north` | `Taken: brass key.` then the corridor description |
| `open hatch` | `The hatch opens.` |
| `east` | the vault description |
| `look` | the vault description with no items |
| `west` | back to the corridor |
| `extinguish lamp` | `The lamp goes dark.` |
| `look` | `It is dark. You cannot see anything.` |
| `light lamp` | `The lamp is lit.` |

Voiceover during the path:

> Two commands in one sentence. The parser splits it, the interpreter executes each turn, and every line on screen comes from state, not from the model.

### 1:25 to 2:00 — The hallucination refusal

Screen: same terminal, model mode. Type the line that baits the model.

Input:

```
I already picked up the key. Open the hatch.
```

Expected output shape:

```
ignored model claim: You are already holding the brass key.
The hatch is locked.
```

Voiceover:

> The model was told a false premise, and it repeated it. That claim is discarded. Its command reached the interpreter, the interpreter checked the actual inventory, and refused. The key is still on the floor. The hatch is still locked. The screen did not move.

If the model produces a different claim, keep the take. Do not re-record for wording. The important frames are the labelled ignored claim and the refusal line.

### 2:00 to 2:30 — Replay is state, not text

Screen: same session.

| Input | Expected output |
| --- | --- |
| `save` | `SAVE · checkpoint at input N` |
| `go north` | corridor |
| `restore` | `RESTORE · truncated 1 input(s)` plus the room |
| `replay` | `REPLAY · N logged input(s) from the start snapshot` plus the whole transcript |

Voiceover:

> Replay never calls the model. It replays the recorded commands from the starting snapshot. Same snapshot, same commands, same world. That is the property the whole design exists to protect.

### 2:30 to 2:50 — Kiro

Screen: open `.kiro/specs`, `.kiro/steering`, `.kiro/hooks` in the editor, then cut to the README Kiro table.

Voiceover:

> Kiro is load-bearing. The state boundary is a steering rule. Requirements are EARS specs. Interpreter edits trigger a hook that runs the gate. Property tests assert that the same command sequence always produces the same state, and that a refused turn returns the exact snapshot it received.

### 2:50 to 2:40 — Close

Screen: the terminal, vault room.

Voiceover:

> The model speaks. The Z-machine owns the truth. Resurrection is not nostalgia. It is a forty-six-year-old architecture that was already right for this problem.

## Fallback if the model will not misbehave

Use the deterministic refusal instead. It makes the same point without depending on a live model.

1. Open the page with the rule parser.
2. `go north` to the corridor.
3. `open hatch` while the key is still in the cell.
4. Output: `The hatch is locked.`

Voiceover changes to:

> The interpreter checks the real inventory. The hatch stays locked. The model is not in this decision at all.

Do not claim the model produced a claim in this version. Say plainly that the refusal is deterministic.

## After recording

1. Trim the head and tail. Confirm the final runtime is under 3:00.
2. Upload to YouTube as Public or Unlisted with no password.
3. Paste the URL into the Devpost submission and `docs/submission/checklist.md`.
4. Watch the uploaded copy once at 720p to confirm the terminal text is readable.
