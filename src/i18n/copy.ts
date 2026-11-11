import { text } from "./index";

export const copy = {
  pageTitle: text("Z-Machine Resurrection", "Z-Machine 复活"),
  title: text("Z-MACHINE // RESURRECTION", "Z-MACHINE // 复活"),
  subtitle: text(
    "A text adventure where the model cannot lie about the world.",
    "模型负责说话，解释器负责事实。",
  ),
  pitch: text(
    "A 1979 Z-machine text adventure. A language model proposes intent, and the interpreter owns every fact.",
    "1979 年的 Z-machine 文字冒险。语言模型提出意图，解释器掌管每一个事实。",
  ),
  introGoal: text(
    "You wake in a cell. Find the brass key, open the hatch, reach the vault.",
    "你在牢房中醒来。找到黄铜钥匙，打开舱门，抵达金库。",
  ),
  introHelp: text(
    "Type HELP for the full command reference.",
    "输入 HELP 打开完整命令手册。",
  ),
  goalReach: text("Goal: reach the vault", "目标：抵达金库"),
  goalComplete: text("Goal: complete", "目标：完成"),
  goalStatusReach: text("reach the vault", "抵达金库"),
  goalStatusComplete: text("complete", "完成"),
  localeButton: text("中文", "EN"),
  localeSwitch: text("Switch to Chinese", "切换到英文"),
  helpButton: text("Help", "帮助"),
  helpTitle: text("Command reference", "命令手册"),
  helpClose: text("Close", "关闭"),
  status: text(
    "{room} · {moves} moves · goal: {goal} · input: {source}",
    "{room} · {moves} 步 · 目标：{goal} · 输入：{source}",
  ),
  sourceModel: text("language model", "语言模型"),
  sourceRules: text("rule parser", "规则解析器"),
  origin: {
    query: text("query", "查询参数"),
    storage: text("storage", "本地存储"),
    env: text("env", "环境变量"),
  },
  meta: {
    save: text("SAVE · checkpoint at input {at}", "SAVE · 检查点位于第 {at} 条输入"),
    restoreNone: text("RESTORE · no checkpoint saved yet", "RESTORE · 尚未保存检查点"),
    restoreTruncated: text(
      "RESTORE · truncated {count} input(s) back to the checkpoint",
      "RESTORE · 已回退到检查点，丢弃 {count} 条输入",
    ),
    endpointNone: text("ENDPOINT · none (rule parser)", "ENDPOINT · 未配置（规则解析器）"),
    endpointConfigured: text("ENDPOINT · {endpoint} ({origin})", "ENDPOINT · {endpoint}（{origin}）"),
    endpointInvalid: text(
      "ENDPOINT · not an http(s) URL: {value}",
      "ENDPOINT · 不是 http(s) 地址：{value}",
    ),
    endpointStoreFailed: text(
      "ENDPOINT · localStorage is unavailable; the value was not stored",
      "ENDPOINT · localStorage 不可用，值未保存",
    ),
    endpointStored: text(
      "ENDPOINT · stored {endpoint}; reloading",
      "ENDPOINT · 已保存 {endpoint}，正在重新加载",
    ),
    replay: text(
      "REPLAY · {count} logged input(s) from the start snapshot",
      "REPLAY · 从起始快照重放 {count} 条输入",
    ),
    submissionFailed: text("submission failed: {detail}", "提交失败：{detail}"),
    endpointIgnored: text(
      "interpret endpoint ignored (not an http(s) URL): {value}; using the rule parser",
      "已忽略模型端点（不是 http(s) 地址）：{value}；改用规则解析器",
    ),
  },
  notices: {
    noModel: text("no model configured; using the rule parser", "未配置模型；改用规则解析器"),
    noCommand: text(
      "the model returned no command; using the rule parser",
      "模型没有返回命令；改用规则解析器",
    ),
    rejected: text(
      "the model intent was rejected ({reason}); using the rule parser",
      "模型意图被拒绝（{reason}）；改用规则解析器",
    ),
    unavailable: text(
      "the model is unavailable ({detail}); using the rule parser",
      "模型不可用（{detail}）；改用规则解析器",
    ),
    unparsed: text('I cannot turn "{raw}" into a command.', "无法把「{raw}」变成命令。"),
    ignoredClaim: text("ignored model claim: {claim}", "已忽略模型声明：{claim}"),
  },
  help: {
    whatTitle: text("What this is", "这是什么"),
    whatBody: text(
      "A 1979 Z-machine text adventure. A language model proposes intent, and the interpreter owns every fact.",
      "1979 年的 Z-machine 文字冒险。语言模型提出意图，解释器掌管每一个事实。",
    ),
    goalTitle: text("Goal", "目标"),
    goalBody: text(
      "Find the brass key in the cell, go north, open the hatch, go east, reach the vault.",
      "在牢房里找到黄铜钥匙，向北走，打开舱门，向东走，抵达金库。",
    ),
    commandsTitle: text("Typed commands", "键入命令"),
    look: text("Describe the current room.", "查看当前房间。"),
    inventory: text("List what you carry.", "列出随身物品。"),
    wait: text("Let one turn pass.", "等待一回合。"),
    directions: text("Move one room.", "向一个方向移动。"),
    take: text("Pick up an item.", "拿起物品。"),
    drop: text("Put down an item.", "放下物品。"),
    light: text("Light the brass lamp.", "点亮黄铜灯。"),
    extinguish: text("Put the lamp out.", "熄灭灯。"),
    open: text("Open the hatch with the key.", "用钥匙打开舱门。"),
    naturalTitle: text("Natural language", "自然语言"),
    naturalBody: text(
      "Type a phrase and the interpreter splits it into commands. The deterministic parser reads English verbs.",
      "输入一句话，解释器会把它拆成命令。确定性解析器目前只识别英文动词。",
    ),
    naturalTakeKey: text("Take the key, then go north.", "拿起钥匙，然后向北走。"),
    naturalPutOut: text("Extinguish the lamp.", "熄灭灯。"),
    naturalUnlock: text("Open the hatch with the key.", "用钥匙打开舱门。"),
    metaTitle: text("Meta commands", "元命令"),
    metaBody: text(
      "The shell handles these before the interpreter.",
      "这些命令由外壳在解释器之前处理。",
    ),
    save: text("Store a checkpoint at the current input.", "在当前输入处保存检查点。"),
    restore: text("Rewind the log to the checkpoint.", "把日志回退到检查点。"),
    replay: text("Replay every logged command from the start.", "从起点重放全部已记录命令。"),
    help: text("Toggle this command reference.", "打开或关闭本命令手册。"),
    endpoint: text("Show or set the model endpoint.", "查看或设置模型端点。"),
    boundaryTitle: text("Why the model cannot cheat", "模型为什么不能作弊"),
    boundaryBody: text(
      "The model only proposes commands. The interpreter applies them to the world, and the shell discards every model claim before it reaches the transcript.",
      "模型只能提出命令。解释器把命令应用到世界上，外壳会在模型声明进入记录之前将其丢弃。",
    ),
  },
} as const;
