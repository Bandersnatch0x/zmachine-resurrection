export const ENDPOINT_STORAGE_KEY = "interpret-endpoint";
export const ENDPOINT_QUERY_KEY = "endpoint";

export type EndpointOrigin = "query" | "storage" | "env" | "none";

export interface EndpointCandidate {
  readonly origin: Exclude<EndpointOrigin, "none">;
  readonly value: string | null | undefined;
}

export interface EndpointResolution {
  readonly endpoint: string | null;
  readonly origin: EndpointOrigin;
  readonly invalid: string | null;
}

/**
 * Resolve a value to an absolute http(s) URL. Relative paths resolve against
 * the page origin, which keeps the dev middleware route usable.
 */
export function httpUrl(value: string, base: string): string | null {
  try {
    const url = new URL(value, base);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

/**
 * Runtime endpoint resolution. The first non-blank candidate wins; if it is
 * not an http(s) URL the caller falls back to the rule source and reports it.
 */
export function pickEndpoint(
  candidates: readonly EndpointCandidate[],
  base: string,
): EndpointResolution {
  for (const candidate of candidates) {
    const raw = candidate.value?.trim() ?? "";
    if (raw === "") {
      continue;
    }
    const endpoint = httpUrl(raw, base);
    if (endpoint === null) {
      return { endpoint: null, origin: candidate.origin, invalid: raw };
    }
    return { endpoint, origin: candidate.origin, invalid: null };
  }
  return { endpoint: null, origin: "none", invalid: null };
}
