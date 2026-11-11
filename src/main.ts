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
import {
  LOCALE_STORAGE_KEY,
  detectLocale,
  nextLocale,
  say,
  t,
} from "./i18n";
import type { Locale } from "./i18n";
import { copy } from "./i18n/copy";
import { roomTitle } from "./i18n/game";
import { createSession } from "./session/session";
import type { Session } from "./session/session";
import { helpSections } from "./ui/help";
import {
  commandLine,
  errorLine,
  metaLine,
  noticeLine,
  outputLine,
  renderTranscript,
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

const shell = requireElement<HTMLElement>("#shell");
const screen = requireElement<HTMLElement>("#screen");
const form = requireElement<HTMLFormElement>("#prompt-form");
const input = requireElement<HTMLInputElement>("#command");
const inputMeasure = requireElement<HTMLElement>("#input-measure");
const inputCursor = requireElement<HTMLElement>("#input-cursor");
const status = requireElement<HTMLElement>("#status");
const title = requireElement<HTMLElement>("#title");
const subtitle = requireElement<HTMLElement>("#subtitle");
const goal = requireElement<HTMLElement>("#goal");
const localeToggle = requireElement<HTMLButtonElement>("#locale-toggle");
const helpToggle = requireElement<HTMLButtonElement>("#help-toggle");
const help = requireElement<HTMLElement>("#help");
const helpTitle = requireElement<HTMLElement>("#help-title");
const helpBody = requireElement<HTMLElement>("#help-body");
const helpClose = requireElement<HTMLButtonElement>("#help-close");

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

function storedLocale(): string | null {
  try {
    return localStorage.getItem(LOCALE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeLocale(value: Locale): void {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, value);
  } catch {
    // A blocked storage write leaves the in-memory locale in place.
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

let locale: Locale = detectLocale(location.search, storedLocale());

const session: Session = createSession();
const lines: Line[] = [];
const history: string[] = [];
const announced = new Set<string>();
let historyIndex = 0;
let queue: Promise<void> = Promise.resolve();

function sourceLabel(): string {
  return t(locale, model === null ? copy.sourceRules : copy.sourceModel);
}

function originLabel(origin: string): string {
  if (origin === "query") {
    return t(locale, copy.origin.query);
  }
  if (origin === "storage") {
    return t(locale, copy.origin.storage);
  }
  if (origin === "env") {
    return t(locale, copy.origin.env);
  }
  return origin;
}

function push(...added: readonly Line[]): void {
  lines.push(...added);
}

function updateChrome(): void {
  const view = session.view();
  const reached = view.room === "vault";
  goal.textContent = t(locale, reached ? copy.goalComplete : copy.goalReach);
  status.textContent = say(locale, copy.status, {
    room: roomTitle(locale, view.room),
    moves: view.moves,
    goal: t(locale, reached ? copy.goalStatusComplete : copy.goalStatusReach),
    source: sourceLabel(),
  });
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
  updateChrome();
}

function renderHelp(): void {
  helpTitle.textContent = t(locale, copy.helpTitle);
  helpBody.replaceChildren();
  for (const section of helpSections(locale)) {
    const block = document.createElement("section");
    block.className = "help__section";

    const heading = document.createElement("h3");
    heading.className = "help__heading";
    heading.textContent = section.title;
    block.append(heading);

    for (const paragraph of section.paragraphs) {
      const element = document.createElement("p");
      element.className = "help__text";
      element.textContent = paragraph;
      block.append(element);
    }

    if (section.rows.length > 0) {
      const table = document.createElement("table");
      table.className = "help__table";
      const body = document.createElement("tbody");
      for (const row of section.rows) {
        const tr = document.createElement("tr");
        const term = document.createElement("th");
        term.scope = "row";
        term.textContent = row.term;
        const description = document.createElement("td");
        description.textContent = row.description;
        tr.append(term, description);
        body.append(tr);
      }
      table.append(body);
      block.append(table);
    }

    helpBody.append(block);
  }
}

function applyLocale(): void {
  document.documentElement.lang = locale === "zh" ? "zh-Hans" : "en";
  document.title = t(locale, copy.pageTitle);
  shell.setAttribute("aria-label", t(locale, copy.shellLabel));
  screen.setAttribute("aria-label", t(locale, copy.transcriptLabel));
  input.setAttribute("aria-label", t(locale, copy.commandLabel));
  title.textContent = t(locale, copy.title);
  subtitle.textContent = t(locale, copy.subtitle);
  localeToggle.textContent = t(locale, copy.localeButton);
  localeToggle.lang = nextLocale(locale);
  localeToggle.setAttribute("aria-label", t(locale, copy.localeSwitch));
  helpToggle.setAttribute("aria-label", t(locale, copy.helpButton));
  help.setAttribute("aria-label", t(locale, copy.helpTitle));
  helpClose.textContent = t(locale, copy.helpClose);
  renderHelp();
}

function setHelpOpen(open: boolean): void {
  help.hidden = !open;
  helpToggle.setAttribute("aria-expanded", String(open));
  if (!open) {
    input.focus();
    placeCursor();
  }
}

function placeCursor(): void {
  const position = input.selectionStart ?? input.value.length;
  inputMeasure.textContent = input.value.slice(0, position);
  const width = inputMeasure.getBoundingClientRect().width;
  inputCursor.style.left = `${Math.max(0, width - input.scrollLeft)}px`;
}

function showNotices(notices: readonly Notice[]): void {
  for (const notice of notices) {
    if (notice.kind === "fallback") {
      if (announced.has(notice.text)) {
        continue;
      }
      announced.add(notice.text);
    }
    push(notice.kind === "refusal" ? errorLine(notice.text) : noticeLine(notice.text));
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
  showTurns([{ output: session.describe(locale), refused: false }]);
}

function pushIntro(): void {
  push(
    systemLine(t(locale, copy.pitch)),
    systemLine(t(locale, copy.introGoal)),
    systemLine(t(locale, copy.introHelp)),
  );
}

function rebuildTranscript(): void {
  lines.length = 0;
  announced.clear();
  pushIntro();
  if (resolution.invalid !== null) {
    push(errorLine(say(locale, copy.meta.endpointIgnored, { value: resolution.invalid })));
  }

  const turns = session.replayAll(locale);
  if (turns.length === 0) {
    showRoom();
    return;
  }

  let turnIndex = 0;
  for (const entry of session.log) {
    push(commandLine(entry.input));
    for (let index = 0; index < entry.commands.length; index += 1) {
      const turn = turns[turnIndex];
      turnIndex += 1;
      if (turn === undefined) {
        continue;
      }
      for (const text of turn.output) {
        push(turn.refused ? errorLine(text) : outputLine(text));
      }
    }
  }
}

function runMetaCommand(command: string): boolean {
  const verb = command.toLowerCase().split(/\s+/)[0] ?? "";

  switch (verb) {
    case "help":
    case "?": {
      setHelpOpen(help.hidden);
      return true;
    }
    case "save": {
      session.save();
      push(metaLine(say(locale, copy.meta.save, { at: session.view().logLength })));
      return true;
    }
    case "restore": {
      const before = session.view();
      const result = session.restore();
      const after = session.view();
      push(
        metaLine(
          !before.hasCheckpoint
            ? t(locale, copy.meta.restoreNone)
            : say(locale, copy.meta.restoreTruncated, {
                count: before.logLength - after.logLength,
              }),
        ),
      );
      showTurns(result.turns);
      showRoom();
      return true;
    }
    case "endpoint": {
      const argument = command.trim().slice("endpoint".length).trim();
      if (argument === "") {
        push(
          metaLine(
            resolution.endpoint === null
              ? t(locale, copy.meta.endpointNone)
              : say(locale, copy.meta.endpointConfigured, {
                  endpoint: resolution.endpoint,
                  origin: originLabel(resolution.origin),
                }),
          ),
        );
        return true;
      }
      const endpoint = httpUrl(argument, pageUrl);
      if (endpoint === null) {
        push(errorLine(say(locale, copy.meta.endpointInvalid, { value: argument })));
        return true;
      }
      if (!storeEndpoint(endpoint)) {
        push(errorLine(t(locale, copy.meta.endpointStoreFailed)));
        return true;
      }
      push(metaLine(say(locale, copy.meta.endpointStored, { endpoint })));
      paint();
      location.reload();
      return true;
    }
    case "replay": {
      const turns = session.replayAll(locale);
      push(metaLine(say(locale, copy.meta.replay, { count: session.log.length })));
      showTurns(turns);
      return true;
    }
    default:
      return false;
  }
}

async function submit(raw: string): Promise<void> {
  try {
    await deliver(raw);
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : "unknown error";
    push(errorLine(say(locale, copy.meta.submissionFailed, { detail })));
    paint();
  }
}

async function deliver(raw: string): Promise<void> {
  const command = raw.trim();
  if (command === "") {
    return;
  }

  push(commandLine(command));

  if (runMetaCommand(command)) {
    paint();
    return;
  }

  const outcome = await interpret(command, model, locale);
  if (!outcome.ok) {
    showNotices(outcome.notices);
    paint();
    return;
  }

  showNotices(outcome.notices);
  const result = session.commit(
    { input: command, commands: outcome.intent.commands },
    locale,
  );
  showTurns(result.turns);
  paint();
}

applyLocale();
rebuildTranscript();
paint();
input.focus();
placeCursor();

for (const eventName of [
  "input",
  "keyup",
  "click",
  "select",
  "focus",
  "scroll",
  "compositionend",
]) {
  input.addEventListener(eventName, placeCursor);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const raw = input.value;
  input.value = "";
  placeCursor();
  if (raw.trim() !== "") {
    history.push(raw);
    historyIndex = history.length;
  }
  queue = queue.then(() => submit(raw));
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
  placeCursor();
});

localeToggle.addEventListener("click", () => {
  locale = nextLocale(locale);
  storeLocale(locale);
  applyLocale();
  rebuildTranscript();
  paint();
  input.focus();
  placeCursor();
});

helpToggle.addEventListener("click", () => {
  setHelpOpen(help.hidden);
});

helpClose.addEventListener("click", () => {
  setHelpOpen(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !help.hidden) {
    event.preventDefault();
    setHelpOpen(false);
  }
});
