import { t } from "../i18n";
import type { Locale, Text } from "../i18n";
import { copy } from "../i18n/copy";

export interface HelpRow {
  readonly term: string;
  readonly description: string;
}

export interface HelpSection {
  readonly title: string;
  readonly paragraphs: readonly string[];
  readonly rows: readonly HelpRow[];
}

interface HelpEntry {
  readonly term: string;
  readonly description: Text;
}

const TYPED_COMMANDS: readonly HelpEntry[] = [
  { term: "LOOK", description: copy.help.look },
  { term: "INVENTORY", description: copy.help.inventory },
  { term: "WAIT", description: copy.help.wait },
  { term: "NORTH/SOUTH/EAST/WEST", description: copy.help.directions },
  { term: "TAKE", description: copy.help.take },
  { term: "DROP", description: copy.help.drop },
  { term: "LIGHT LAMP", description: copy.help.light },
  { term: "EXTINGUISH LAMP", description: copy.help.extinguish },
  { term: "OPEN", description: copy.help.open },
];

const NATURAL_EXAMPLES: readonly HelpEntry[] = [
  { term: "take the key and go north", description: copy.help.naturalTakeKey },
  { term: "put out the lamp", description: copy.help.naturalPutOut },
  { term: "unlock the hatch", description: copy.help.naturalUnlock },
];

const META_COMMANDS: readonly HelpEntry[] = [
  { term: "SAVE", description: copy.help.save },
  { term: "RESTORE", description: copy.help.restore },
  { term: "REPLAY", description: copy.help.replay },
  { term: "HELP", description: copy.help.help },
  { term: "ENDPOINT [url]", description: copy.help.endpoint },
];

function rows(locale: Locale, entries: readonly HelpEntry[]): readonly HelpRow[] {
  return entries.map((entry) => ({
    term: entry.term,
    description: t(locale, entry.description),
  }));
}

export function helpSections(locale: Locale): readonly HelpSection[] {
  return [
    {
      title: t(locale, copy.help.whatTitle),
      paragraphs: [t(locale, copy.help.whatBody)],
      rows: [],
    },
    {
      title: t(locale, copy.help.goalTitle),
      paragraphs: [t(locale, copy.help.goalBody)],
      rows: [],
    },
    {
      title: t(locale, copy.help.commandsTitle),
      paragraphs: [],
      rows: rows(locale, TYPED_COMMANDS),
    },
    {
      title: t(locale, copy.help.naturalTitle),
      paragraphs: [t(locale, copy.help.naturalBody)],
      rows: rows(locale, NATURAL_EXAMPLES),
    },
    {
      title: t(locale, copy.help.metaTitle),
      paragraphs: [t(locale, copy.help.metaBody)],
      rows: rows(locale, META_COMMANDS),
    },
    {
      title: t(locale, copy.help.boundaryTitle),
      paragraphs: [t(locale, copy.help.boundaryBody)],
      rows: [],
    },
  ];
}
