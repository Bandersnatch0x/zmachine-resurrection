export interface ProviderConfig {
  readonly url: string;
  readonly key: string;
  readonly model: string;
}

export interface ProviderEnv {
  readonly LLM_API_KEY?: string | undefined;
  readonly LLM_API_URL?: string | undefined;
  readonly LLM_MODEL?: string | undefined;
}

const DEFAULT_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o-mini";

export function readProviderConfig(env: ProviderEnv): ProviderConfig | null {
  const key = env.LLM_API_KEY?.trim();
  if (key === undefined || key === "") {
    return null;
  }
  return {
    url: env.LLM_API_URL?.trim() || DEFAULT_URL,
    key,
    model: env.LLM_MODEL?.trim() || DEFAULT_MODEL,
  };
}

const SYSTEM_PROMPT = [
  "You translate a player's text-adventure input into commands.",
  "Reply with JSON only: {\"commands\": [...]}.",
  "Allowed commands:",
  '{"kind":"look"}, {"kind":"inventory"}, {"kind":"wait"},',
  '{"kind":"go","direction":"north|south|east|west"},',
  '{"kind":"take","noun":"..."}, {"kind":"drop","noun":"..."},',
  '{"kind":"open","noun":"..."}, {"kind":"lamp","lit":true|false}.',
  "You may add a \"claim\" string, but it is discarded and never shown as narration.",
  "Never describe state, rooms, or inventory. The interpreter owns all of it.",
].join("\n");

/**
 * Pulls the first balanced JSON object out of model prose. Models wrap JSON in
 * fences and chatter often enough that a bare JSON.parse is not reliable.
 */
export function extractJsonObject(text: string): unknown {
  const start = text.indexOf("{");
  if (start === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === "{") {
      depth += 1;
      continue;
    }
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, index + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function readMessageText(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }
  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    return null;
  }
  const message = (choices[0] as { message?: unknown } | undefined)?.message;
  if (typeof message !== "object" || message === null) {
    return null;
  }
  const content = (message as { content?: unknown }).content;
  return typeof content === "string" ? content : null;
}

export async function callProvider(
  config: ProviderConfig,
  input: string,
  fetchImpl: typeof fetch = fetch,
): Promise<unknown> {
  const response = await fetchImpl(config.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.key}`,
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: input },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`provider returned ${response.status}`);
  }

  const payload: unknown = await response.json();
  const text = readMessageText(payload);
  if (text === null) {
    throw new Error("provider reply carried no message");
  }

  const extracted = extractJsonObject(text);
  if (extracted === null) {
    throw new Error("provider reply carried no JSON object");
  }
  return extracted;
}
