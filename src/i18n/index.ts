export type Locale = "en" | "zh";

export type Text = Readonly<Record<Locale, string>>;

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_STORAGE_KEY = "zmachine-locale";

export function text(en: string, zh: string): Text {
  return { en, zh };
}

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "zh";
}

export function t(locale: Locale, value: Text): string {
  const localized: string | undefined = value[locale];
  return localized === undefined || localized === "" ? value.en : localized;
}

export function detectLocale(search: string = "", stored: string | null = null): Locale {
  const requested = new URLSearchParams(search).get("lang");
  if (isLocale(requested)) {
    return requested;
  }
  if (isLocale(stored)) {
    return stored;
  }
  return DEFAULT_LOCALE;
}

export function nextLocale(locale: Locale): Locale {
  return locale === "en" ? "zh" : "en";
}

const PLACEHOLDER = /\{([a-zA-Z]+)\}/g;

export function fill(
  template: string,
  values: Readonly<Record<string, string | number>>,
): string {
  return template.replace(PLACEHOLDER, (match: string, key: string) => {
    const value = values[key];
    return value === undefined ? match : String(value);
  });
}

export function say(
  locale: Locale,
  value: Text,
  values: Readonly<Record<string, string | number>> = {},
): string {
  return fill(t(locale, value), values);
}
