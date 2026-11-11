import {
  ENDPOINT_QUERY_KEY,
  ENDPOINT_STORAGE_KEY,
  httpUrl,
  pickEndpoint,
} from "./frontend/endpoint";
import { interpret } from "./frontend/interpret";
import type { Notice } from "./frontend/interpret";
import { sourceFromEndpoint } from "./frontend/sources";
import type { IntentSource } from "./frontend/sources";
import { createSession } from "./session/session";
import type { Session } from "./session/session";
import {
  commandLine,
  errorLine,
  metaLine,
  noticeLine,
  outputLine,
  renderTranscript,
  statusText,
  systemLine,
} from "./ui/render";
import type { Line } from "./ui/render";
import "./styles.css";

const TRANSCRIPT_LIMIT = 400;

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Terminal shell markup is missing: ${selector}`);
  }
  return element;
}

const screen = requireElement<HTMLElement>("#screen");
const form = requireElement<HTMLFormElement>("#prompt-form");
const input = requireElement<HTMLInputElement>("#command");
const status = requireElement<HTMLElement>("#status");

function storedEndpoint(): string | null {
  try {
    return localStorage.getItem(ENDPOINT_STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeEndpoint(endpoint: string): boolean {
  try {
    localStorage.setItem(ENDPOINT_STORAGE_KEY, endpoint);
    return true;
  } catch {
    return false;
  }
}

const pageUrl = location.href;
const resolution = pickEndpoint(
  [
    { origin: "query", value: new URLSearchParams(location.search).get(ENDPOINT_QUERY_KEY) },
    { origin: "storage", value: storedEndpoint() },
    { origin: "env", value: import.meta.env.VITE_INTERPRET_ENDPOINT },
  ],
  pageUrl,
);
const model: IntentSource | null =
  resolution.endpoint === null ? null : sourceFromEndpoint(resolution.endpoint);
const sourceLabel = model === null ? "rule parser" : model.label;

const session: Session = createSession();
const lines: Line[] = [];
const history: string[] = [];
const announced = new Set<string>();
let historyIndex = 0;

function push(...added: readonly Line[]): void {
  lines.push(...added);
}

function paint(): void {
  screen.replaceChildren();
  for (const line of renderTranscript(lines, TRANSCRIPT_LIMIT)) {
    const element = document.createElement("div");
    element.className = `line line--${line.kind}`;
    element.textContent = line.text;
    screen.append(element);
  }
  screen.scrollTop = screen.scrollHeight;

  const view = session.view();
  status.textContent = statusText(view.room, view.moves, sourceLabel);
}

function showNotices(notices: readonly Notice[]): void {
  for (const notice of notices) {
    if (notice.kind === "fallback") {
      if (announced.has(notice.text)) {
        continue;
      }
      announced.add(notice.text);
    }
    push(notice.kind === "claim" ? noticeLine(notice.text) : errorLine(notice.text));
  }
}

function showTurns(turns: readonly { output: readonly string[]; refused: boolean }[]): void {
  for (const turn of turns) {
    for (const text of turn.output) {
      push(turn.refused ? errorLine(text) : outputLine(text));
    }
  }
}

function showRoom(): void {
  showTurns([{ output: session.describe(), refused: false }]);
}

function runMetaCommand(command: string): boolean {
  const verb = command.toLowerCase().split(/\s+/)[0] ?? "";

  switch (verb) {
    case "help":
    case "?": {
      push(metaLine("HELP"));
      push(
        systemLine(
          "Typed commands: LOOK, INVENTORY, WAIT, NORTH/SOUTH/EAST/WEST, TAKE <thing>, DROP <thing>, LIGHT LAMP, EXTINGUISH LAMP, OPEN <thing>.",
        ),
        systemLine('Natural language works too: "take the key and go north".'),
        systemLine("Meta: SAVE, RESTORE, REPLAY, ENDPOINT [url]. These are handled before the front end."),
      );
      return true;
    }
    case "save": {
      session.save();
      push(metaLine(`SAVE · checkpoint at input ${session.view().logLength}`));
      return true;
    }
    case "restore": {
      const before = session.view();
      const result = session.restore();
      const after = session.view();
      push(
        metaLine(
          before.checkpointLength === 0
            ? "RESTORE · no checkpoint saved yet"
            : `RESTORE · truncated ${before.logLength - after.logLength} input(s) back to the checkpoint`,
        ),
      );
      showTurns(result.turns);
      return true;
    }
    case "endpoint": {
      const argument = command.trim().slice("endpoint".length).trim();
      if (argument === "") {
        push(
          metaLine(
            resolution.endpoint === null
              ? "ENDPOINT · none (rule parser)"
              : `ENDPOINT · ${resolution.endpoint} (${resolution.origin})`,
          ),
        );
        return true;
      }
      const endpoint = httpUrl(argument, pageUrl);
      if (endpoint === null) {
        push(errorLine(`ENDPOINT · not an http(s) URL: ${argument}`));
        return true;
      }
      if (!storeEndpoint(endpoint)) {
        push(errorLine("ENDPOINT · localStorage is unavailable; the value was not stored"));
        return true;
      }
      push(metaLine(`ENDPOINT · stored ${endpoint}; reloading`));
      paint();
      location.reload();
      return true;
    }
    case "replay": {
      const turns = session.replayAll();
      push(metaLine(`REPLAY · ${session.log.length} logged input(s) from the start snapshot`));
      showTurns(turns);
      return true;
    }
    default:
      return false;
  }
}

async function submit(raw: string): Promise<void> {
  const command = raw.trim();
  if (command === "") {
    return;
  }

  push(commandLine(command));

  if (runMetaCommand(command)) {
    paint();
    return;
  }

  const outcome = await interpret(command, model);
  if (!outcome.ok) {
    showNotices(outcome.notices);
    paint();
    return;
  }

  showNotices(outcome.notices);
  const result = session.commit({ input: command, commands: outcome.intent.commands });
  showTurns(result.turns);
  paint();
}

push(
  systemLine("Z-MACHINE RESURRECTION — build 0.1.0"),
  systemLine(`The interpreter owns the world. Input: ${sourceLabel}. Type HELP.`),
);
if (resolution.invalid !== null) {
  push(
    errorLine(
      `interpret endpoint ignored (not an http(s) URL): ${resolution.invalid}; using the rule parser`,
    ),
  );
}
showRoom();
paint();

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const raw = input.value;
  input.value = "";
  if (raw.trim() !== "") {
    history.push(raw);
    historyIndex = history.length;
  }
  void submit(raw);
});

input.addEventListener("keydown", (event) => {
  if (event.key !== "ArrowUp" && event.key !== "ArrowDown") {
    return;
  }
  event.preventDefault();
  if (history.length === 0) {
    return;
  }
  historyIndex =
    event.key === "ArrowUp"
      ? Math.max(0, historyIndex - 1)
      : Math.min(history.length, historyIndex + 1);
  input.value = history[historyIndex] ?? "";
});
