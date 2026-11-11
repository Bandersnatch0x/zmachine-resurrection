import type { DoorId, ItemId, RoomId } from "../zmachine/types";
import { t, text } from "./index";
import type { Locale, Text } from "./index";

interface RoomCopy {
  readonly title: Text;
  readonly description: Text;
}

export const gameText = {
  rooms: {
    cell: {
      title: text("Cell", "牢房"),
      description: text(
        "Cell. Cold stone, a narrow cot, and a barred door north.",
        "牢房。冰冷的石头，一张窄床，北面是一道铁栏门。",
      ),
    },
    corridor: {
      title: text("Corridor", "走廊"),
      description: text(
        "Corridor. Dust and a dead fluorescent. The cell lies south, and a hatch is set in the east wall.",
        "走廊。灰尘和一根熄灭的荧光灯。牢房在南面，东墙上嵌着一扇舱门。",
      ),
    },
    vault: {
      title: text("Vault", "金库"),
      description: text(
        "Vault. Shelves of dead terminals line the walls. A hatch opens west.",
        "金库。墙边排着一列早已停机的终端。舱门向西开着。",
      ),
    },
  } satisfies Record<RoomId, RoomCopy>,
  items: {
    lamp: text("brass lamp", "黄铜灯"),
    key: text("brass key", "黄铜钥匙"),
    notebook: text("notebook", "笔记本"),
  } satisfies Record<ItemId, Text>,
  doors: {
    hatch: text("hatch", "舱门"),
  } satisfies Record<DoorId, Text>,
  messages: {
    dark: text("It is dark. You cannot see anything.", "一片漆黑，你什么也看不见。"),
    seeItems: text("You see: {items}.", "你看见：{items}。"),
    lit: text(" (lit)", "（亮着）"),
    emptyHanded: text("You are empty-handed.", "你两手空空。"),
    carrying: text("You are carrying: {items}.", "你带着：{items}。"),
    listSeparator: text(", ", "、"),
    doorLocked: text("locked", "上锁"),
    doorOpen: text("open", "开启"),
    tooDarkToMove: text("It is too dark to move.", "太黑了，走不动。"),
    cannotGoThatWay: text("You cannot go that way.", "那边过不去。"),
    doorIsLocked: text("The {door} is locked.", "{door}是锁着的。"),
    tooDarkToGoThere: text("It is too dark to go there.", "那边太黑了，过不去。"),
    tooDarkToFindAnything: text("It is too dark to find anything.", "太黑了，什么也找不到。"),
    seeNoThingHere: text("You see no {thing} here.", "这里没有{thing}。"),
    doorCannotBePickedUp: text("The {door} cannot be picked up.", "{door}拿不起来。"),
    alreadyCarrying: text("You are already carrying the {item}.", "你已经带着{item}了。"),
    tooDarkToPutDown: text(
      "It is too dark to put anything down safely.",
      "太黑了，放下东西不安全。",
    ),
    notCarryingThing: text("You are not carrying a {thing}.", "你身上没有{thing}。"),
    doorFixed: text("The {door} is fixed in place.", "{door}是固定住的。"),
    notCarryingItem: text("You are not carrying the {item}.", "你没有带着{item}。"),
    noLamp: text("There is no lamp.", "这里没有灯。"),
    notCarryingLamp: text("You are not carrying the lamp.", "你没有带着灯。"),
    lampAlreadyLit: text("The lamp is already lit.", "灯已经亮着。"),
    lampAlreadyOut: text("The lamp is already out.", "灯已经熄了。"),
    lampLit: text("The lamp is lit.", "灯亮了。"),
    lampOut: text("The lamp goes dark.", "灯熄了。"),
    tooDarkToFindLatch: text("It is too dark to find the latch.", "太黑了，找不到门闩。"),
    noThingHere: text("There is no {thing} here.", "这里没有{thing}。"),
    cannotOpenItem: text("The {item} cannot be opened.", "{item}打不开。"),
    cannotReachDoor: text("You cannot reach the {door} from here.", "你从这里够不到{door}。"),
    doorAlreadyOpen: text("The {door} is already open.", "{door}已经开着了。"),
    doorOpens: text("The {door} opens.", "{door}打开了。"),
    timePasses: text("Time passes.", "时间流逝。"),
    taken: text("Taken: {item}.", "已拾取：{item}。"),
    dropped: text("Dropped: {item}.", "已放下：{item}。"),
    thingFallback: text("thing", "东西"),
  },
} as const;

export function roomTitle(locale: Locale, id: RoomId): string {
  return t(locale, gameText.rooms[id].title);
}
