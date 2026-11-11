# Z-Machine Resurrection

**EN summary.** A 1979 Z-machine text adventure brought back to life, with an LLM
as the natural-language front end and a deterministic interpreter as the single
owner of world state. The model proposes intent; the Z-machine owns the truth.

**一句话**:把 1979 年的 Z-machine 文字冒险复活,LLM 只负责听懂人话,Z-machine 解释器独占世界状态。

## 它解决什么问题

LLM 驱动的游戏最容易坏在两处:模型编造世界状态,以及同一句话两次跑出不同结果。
本项目把两者切开:模型输出的是**意图**,解释器输出的是**事实**。任何一句剧情、
任何一个道具、任何一次移动,都能追溯到一次确定性回合;同样的快照加同样的命令序列,
必然得到同样的状态与输出,所以重放、撤销、对账都成立。

被拒绝的一回合按引用返回输入快照,`moves` 不变。引用相等就是「什么都没改」的机械证明。

## 架构

```
玩家输入 ──> 前端(类型化命令 → 模型 → 规则解析器)
                 │  Intent(不可信)
                 ▼
        compileIntent(全有或全无校验)
                 │  Command[](可信协议)
                 ▼
        Z-machine 解释器(唯一状态权威)
                 │
                 ├─> Snapshot(位置 / 道具 / 门 / 回合数)
                 └─> 转写行(玩家可见输出)
                 │
                 ▼
        Session(命令日志 + 检查点)──> 终端外壳(原生 DOM 渲染)
```

- **确定性核心**:`src/zmachine/` 是纯函数核心,`runTurn(snapshot, command)` 无时钟、无随机、无 I/O、无网络。
- **静态内容与可变事实分离**:房间、道具、门的文字与连接在 `world.ts` 的 `WORLD` 里;`WorldState` 只装可变事实。
- **协议边界**:`Command` 是可信协议,`Intent` 是不可信输入。`compileIntent` 逐字段重建命令,不把原始对象摊进状态,并拒绝多余的状态类字段。
- **状态权威边界**:只有解释器能产生 `Snapshot`;UI 只经 `Session` 读取视图与转写。
- **重放**:`Snapshot + Command[]`,永远不是自然语言,也不是模型输出。

## 玩法

| 房间 | 连接 | 说明 |
| --- | --- | --- |
| Cell | north → Corridor | 起点,有钥匙 |
| Corridor | south → Cell,east 经 hatch → Vault | 黑暗,需点灯 |
| Vault | west 经 hatch → Corridor | 有灯即可看见 |

灯初始已点、随身携带;钥匙在 Cell;hatch 上锁,钥匙是 `key`。

黑暗房间里只接受 `look`、`inventory`、`lamp`、`wait`;`go`、`take`、`drop`、`open` 在解析名词前就被拒绝。

`moves` 只在被接受且改变状态的一回合递增。`look`、`inventory`、被接受的无操作、以及全部拒绝都不递增。

## 前端

顺序是:类型化命令快路径 → 模型 → 规则解析器。每一级回退都在转写区留一行提示,
模型永远不在重放路径上。

- **规则解析器**是真正的确定性解析器,不是 mock。它认得 take / pick up / grab / get、
  drop、go / walk / head / move 与裸方向、light / ignite、extinguish / put out / douse、
  unlock / open、look、inventory、wait,并按 `and`、`then`、逗号、分号拆分复合子句。
- **模型输出**里任何 `claim`、`claims`、`narration` 字符串都会被收集、截断,渲染成
  「ignored model claim」提示。它永远不成为叙述,也永远不碰状态。

## 本地运行

```bash
npm install
npm run dev      # 本地终端外壳
npm run check    # tsc --noEmit && vitest run
npm run build    # 产出 dist/
```

打开页面后输入 `LOOK`、`NORTH`、`INVENTORY`,或直接说 `take the key and go north`。
`HELP` 列出命令。`SAVE`、`RESTORE`、`REPLAY` 是 UI 元命令,在前端之前被拦截,不会发给模型。

## 模型接入(可选)

客户端代码里没有 key。`src/**` 不含 `LLM_API_KEY`、`sk-` 或 `Authorization` 头。

- **本地开发**:Vite 开发中间件在 `/api/interpret` 读 `process.env.LLM_API_KEY`,
  由开发服务器转发给模型提供方。key 只存在于开发进程里。
- **生产**:把 `VITE_INTERPRET_ENDPOINT` 指向外部代理。
- **都不配**:规则解析器接管,状态栏写明 `input: rule parser`。

```bash
# PowerShell
$env:LLM_API_KEY = "..."
$env:LLM_API_URL  = "https://api.openai.com/v1/chat/completions"  # 可选
$env:LLM_MODEL    = "gpt-4o-mini"                                  # 可选
npm run dev
```

服务端只接受单个 `input` 字符串,长度上限 200。没有 key 时返回 503,
请求体不合法返回 400,模型不可用返回 502,模型意图不合法返回 422。

## 门禁与测试

`npm run check` 跑 `tsc --noEmit` 与 `vitest run`。测试覆盖:

- **fast-check 性质**:确定性、拒绝按引用不动、恢复加后缀等价、进 vault 必须先开 hatch、
  开 hatch 必须带钥匙、黑暗房间拒绝一切改变世界的命令、回合上界、`compileIntent` 不抛异常、
  意图全有或全无、命令文本往返、输入不可变。
- **示例测试**:黄金走通、固定错误意图的幻觉拒绝、灯与黑暗、内容完整性、意图校验、
  回退提示、恢复与重放、假 fetch 的 HTTP 适配器、服务端 handler、开发中间件。
- **边界扫描**:`src/zmachine/**` 不含 Date、Math.random、fetch、window、document、
  localStorage、performance.now、setTimeout;`src/**` 不含 key 或 Authorization 头;
  UI 代码不导入 `WorldState`、`INITIAL_STATE`、`runTurn`、`createZMachine`。

验收冒烟:依次输入 `north`、`south`、`look`、`xyzzy`,最终停在 `cell`,`moves: 2`。

## 目录

| 路径 | 职责 |
| --- | --- |
| `src/zmachine/protocol.ts` | `Command`、`Direction`、校验、规范文本 |
| `src/zmachine/types.ts` | `WorldState`、`Snapshot`、`TurnResult`、`ZMachine` |
| `src/zmachine/world.ts` | 静态房间/道具/门、`INITIAL_STATE`、内部封装 |
| `src/zmachine/interpreter.ts` | `runTurn`、命令处理、名词解析、光照规则 |
| `src/zmachine/parse.ts` | 单命令规范解析 |
| `src/zmachine/observe.ts` | 纯 `WorldView` 投影 |
| `src/zmachine/replay.ts` | `replay`、`sameState` |
| `src/zmachine/index.ts` | 公共出口,导出 `Snapshot` 而非 `WorldState` |
| `src/frontend/intent.ts` | `Intent`、`compileIntent`、上限 |
| `src/frontend/sources.ts` | `IntentSource`、HTTP 源、规则源 |
| `src/frontend/interpret.ts` | 类型化路径、模型/规则回退、`InterpretOutcome` |
| `src/session/session.ts` | 命令日志、检查点、恢复、重放 |
| `src/ui/render.ts` | 转写渲染、行类别 |
| `src/main.ts` | 接线、元命令、提交循环 |
| `api/contract.ts` | 线上类型 |
| `api/interpret.ts` | handler、环境变量、key 检查 |
| `api/provider.ts` | 提供方请求与 JSON 提取 |
| `vite.api-plugin.ts` | 开发中间件 |
| `tests/boundary.test.ts` | 纯净性与密钥泄漏的源码扫描 |

## Kiro 使用一览

| 能力 | 用法 |
| --- | --- |
| Steering | `.kiro/steering/` 固化「状态权威归解释器」与确定性工程约束。 |
| Spec-driven development | `.kiro/specs/z-machine-resurrection/requirements.md` 用 EARS 写需求与验收。 |
| Agent hooks | `.kiro/hooks/gate-on-src-change.kiro.hook` 在解释器或测试变更后跑 `npm run check`。 |
| Custom agents | 计划用独立代理分别守「解释器语义」与「前端不碰状态」两条边界。 |
| MCP | 计划接入检索与浏览器验证服务,用于规范查证与演示回归。 |
| Property-based testing | `tests/` 用 `fast-check` 断言确定性、边界与可重放。 |
| Kiro powers | 计划用 powers 复用规格与验证流程,减少每次从零搭上下文。 |
| 全流程 | 规格 → 票 → 实现 → 双轴验收,阶段技能在 `.agents/skills/`。 |

逐项证据与待补项见 `docs/submission/kiro-usage.md`;交付清单见
`docs/submission/checklist.md`。

## 赛事

AWS Kiroween 2026,Devpost,**Resurrection** 赛道。提交截止 **2026-12-04 14:00 PT**,
即 **2026-12-05 06:00(北京时间)**。

## 许可

MIT,见 `LICENSE`。
