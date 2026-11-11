import { compileIntent } from "../src/frontend/intent";
import type { Command } from "../src/zmachine/protocol";
import { isInterpretRequestBody } from "./contract";
import type { InterpretRequestBody, InterpretResponse } from "./contract";
import { callProvider, readProviderConfig } from "./provider";
import type { ProviderEnv } from "./provider";

export interface HandlerOptions {
  readonly env: ProviderEnv;
  readonly fetchImpl?: typeof fetch | undefined;
}

export async function handleInterpret(
  body: unknown,
  options: HandlerOptions,
): Promise<InterpretResponse> {
  if (!isInterpretRequestBody(body)) {
    return { status: 400, body: { error: "expected a single input string" } };
  }
  const request: InterpretRequestBody = body;

  const config = readProviderConfig(options.env);
  if (config === null) {
    return { status: 503, body: { error: "model not configured" } };
  }

  try {
    const payload = await callProvider(config, request.input, options.fetchImpl ?? fetch);
    const compiled = compileIntent(payload);
    if (!compiled.ok) {
      return { status: 422, body: { error: compiled.reason } };
    }
    const commands: readonly Command[] = compiled.intent.commands;
    return {
      status: 200,
      body: {
        commands,
        ...(compiled.intent.claims.length > 0 ? { claims: compiled.intent.claims } : {}),
      },
    };
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : "provider failed";
    return { status: 502, body: { error: detail } };
  }
}
