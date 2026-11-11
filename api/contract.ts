export const MAX_INPUT_LENGTH = 200;

export interface InterpretRequestBody {
  readonly input: string;
}

export interface InterpretSuccessBody {
  readonly commands: readonly unknown[];
  readonly claim?: string;
  readonly claims?: readonly string[];
  readonly narration?: string;
}

export interface InterpretErrorBody {
  readonly error: string;
}

export type InterpretResponseBody = InterpretSuccessBody | InterpretErrorBody;

export interface InterpretResponse {
  readonly status: number;
  readonly body: InterpretResponseBody;
}

export function isInterpretRequestBody(value: unknown): value is InterpretRequestBody {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Readonly<Record<string, unknown>>;
  const keys = Object.keys(record);
  if (keys.length !== 1 || keys[0] !== "input") {
    return false;
  }
  const input = record.input;
  return typeof input === "string" && input.trim().length > 0 && input.length <= MAX_INPUT_LENGTH;
}
