# Z-Machine Resurrection

**EN summary.** A 1979 Z-machine text adventure brought back to life, with an LLM
as the natural-language front end and a deterministic interpreter as the single
owner of world state. The model speaks; the Z-machine owns the truth.

**一句话**:把 1979 年的 Z-machine 文字冒险复活,LLM 只负责听懂人话,Z-machine 解释器独占世界状态。

## 它解决什么问题

LLM 驱动的游戏最容易坏在两处:模型编造世界状态,以及同一句话两次跑出不同结果。
本项目把两者切开:模型输出的是**意图**,解释器输出的是**事实**。任何一句剧情、
任何一个道具、任何一次移动,都能追溯到一次确定性回合;同样的快照加同样的命令序列,
必然得到同样的状态与输出,所以重放、撤销、对账都成立。

## 架构

```
玩家输入 ──> LLM 前端(自然语言 → 意图)
                 │
                 ▼
        Z-machine 解释器(唯一状态权威)
                 │
                 ├─> WorldState(位置 / 道具 / 回合数)
                 └─> 转写行(玩家可见输出)
                 │
                 ▼
           终端外壳(原生 DOM 渲染)
```

- **LLM 前端**:把「把灯点上然后往北走」这类说法转成解释器认得的命令。它不写状态。
- **确定性解释器**:`src/zmachine/` 是纯函数核心,`runTurn(state, input)` 无时钟、无随机、无 I/O。
- **状态权威边界**:只有 `ZMachine` 接口能产生或修改 `WorldState`;UI 只读、只渲染。

## 本地运行

```bash
npm install
npm run dev      # 本地终端外壳
npm run check    # tsc --noEmit && vitest run
npm run build    # 产出 dist/
```

打开页面后输入 `LOOK`、`NORTH`、`SOUTH`、`INVENTORY`、`WAIT`。`HELP` 列出当前命令。

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
