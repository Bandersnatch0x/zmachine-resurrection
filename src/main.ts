import { createZMachine } from "./zmachine";
import type { TurnResult } from "./zmachine";
import "./styles.css";

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

const machine = createZMachine();
const history: string[] = [];
let historyIndex = 0;

function append(text: string, kind: "output" | "command" | "system" | "error" = "output"): void {
  const line = document.createElement("div");
  line.className = `line line--${kind}`;
  line.textContent = text;
  screen.append(line);
  screen.scrollTop = screen.scrollHeight;
}

function render(result: TurnResult): void {
  for (const paragraph of result.output) {
    append(paragraph);
  }
}

append("Z-MACHINE RESURRECTION — build 0.1.0", "system");
append("The interpreter owns the world. Type HELP or LOOK.", "system");
render(machine.execute("look"));

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const raw = input.value;
  const command = raw.trim();
  if (command === "") {
    return;
  }

  append(`> ${command}`, "command");
  input.value = "";
  history.push(command);
  historyIndex = history.length;

  if (command.toLowerCase() === "help" || command.toLowerCase() === "?") {
    append("Commands: LOOK, NORTH, SOUTH, INVENTORY, WAIT. State changes are reversible.", "system");
    return;
  }

  render(machine.execute(command));
  status.textContent = `state: ${machine.state.location} · moves: ${machine.state.moves}`;
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
