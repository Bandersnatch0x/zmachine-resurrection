import { t } from "../i18n";
import type { Locale } from "../i18n";
import { gameText } from "../i18n/game";
import type { ItemId, RoomId, WorldState } from "./types";
import { WORLD } from "./world";

export interface WorldView {
  readonly room: { readonly id: RoomId; readonly title: string; readonly dark: boolean };
  readonly visibleItems: readonly string[];
  readonly carriedItems: readonly string[];
  readonly exits: readonly string[];
  readonly doors: readonly { readonly id: string; readonly state: string }[];
}

function carriedLampLit(state: WorldState): boolean {
  const lamp = state.items.lamp;
  if (lamp.kind !== "lamp") {
    return false;
  }
  return lamp.placement.kind === "carried" && lamp.lit;
}

function roomLampLit(state: WorldState, room: RoomId): boolean {
  const lamp = state.items.lamp;
  if (lamp.kind !== "lamp") {
    return false;
  }
  return lamp.placement.kind === "room" && lamp.placement.room === room && lamp.lit;
}

export function isDarkIn(state: WorldState, room: RoomId): boolean {
  return WORLD.rooms[room].dark && !carriedLampLit(state) && !roomLampLit(state, room);
}

export function isDark(state: WorldState): boolean {
  return isDarkIn(state, state.location);
}

export function observe(state: WorldState, locale: Locale = "en"): WorldView {
  const dark = isDark(state);
  const room = WORLD.rooms[state.location];

  const visibleItems = dark
    ? []
    : (Object.keys(state.items) as ItemId[])
        .filter((id) => {
          const placement = state.items[id].placement;
          return placement.kind === "room" && placement.room === state.location;
        })
        .map((id) => t(locale, WORLD.items[id].name));

  const carriedItems = (Object.keys(state.items) as ItemId[])
    .filter((id) => state.items[id].placement.kind === "carried")
    .map((id) => {
      const item = state.items[id];
      const name = t(locale, WORLD.items[id].name);
      return item.kind === "lamp" && item.lit
        ? `${name}${t(locale, gameText.messages.lit)}`
        : name;
    });

  const exits = dark ? [] : Object.keys(room.exits);

  return {
    room: { id: state.location, title: t(locale, room.title), dark },
    visibleItems,
    carriedItems,
    exits,
    doors: (Object.keys(state.doors) as (keyof typeof state.doors)[]).map((id) => {
      const opened = state.doors[id] === "open";
      return {
        id,
        state: t(locale, opened ? gameText.messages.doorOpen : gameText.messages.doorLocked),
      };
    }),
  };
}
