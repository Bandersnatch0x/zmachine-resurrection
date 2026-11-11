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
 * A query-string endpoint is attacker-controllable: a crafted link could send
 * every player input to an arbitrary host. Only the page origin and explicitly
 * listed hosts are accepted from that source.
 */
export function isAllowedEndpoint(
  value: string,
  base: string,
  allowedHosts: ReadonlySet<string> = new Set(),
): string | null {
  const resolved = httpUrl(value, base);
  if (resolved === null) {
    return null;
  }
  const url = new URL(resolved);
  if (url.origin === new URL(base).origin) {
    return url.href;
  }
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  return allowedHosts.has(host) ? url.href : null;
}

/**
 * Runtime endpoint resolution. The first usable candidate wins. A rejected
 * query value is reported and skipped, so storage, env, or the rule source
 * still apply.
 */
export function pickEndpoint(
  candidates: readonly EndpointCandidate[],
  base: string,
  allowedHosts: ReadonlySet<string> = new Set(),
): EndpointResolution {
  let invalid: string | null = null;
  for (const candidate of candidates) {
    const raw = candidate.value?.trim() ?? "";
    if (raw === "") {
      continue;
    }
    const endpoint =
      candidate.origin === "query"
        ? isAllowedEndpoint(raw, base, allowedHosts)
        : httpUrl(raw, base);
    if (endpoint === null) {
      invalid ??= raw;
      continue;
    }
    return { endpoint, origin: candidate.origin, invalid };
  }
  return { endpoint: null, origin: "none", invalid };
}
