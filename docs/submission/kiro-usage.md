# Kiro 使用说明

本文按提交要求逐项作答。状态列区分「已落地」(仓库里有可检查的文件或命令)
与「待补」(设计已定,尚需在 Kiro 内完成并留下证据)。

| # | 提示 | 状态 |
| --- | --- | --- |
| 1 | 整体工作流 | 已落地(仓库结构),待补(Kiro 会话证据) |
| 2 | Custom agents | 待补 |
| 3 | Agent hooks | 已落地(文件),未在 Kiro 内实跑 |
| 4 | Spec-driven development | 已落地 |
| 5 | Steering docs | 已落地 |
| 6 | MCP | 待补 |
| 7 | Property-based testing | 已落地 |
| 8 | Kiro powers | 待补 |

## 1. 整体工作流

工作从规格开始,再进入票与实现,最后双轴验收(标准轴 / 规格轴)。
仓库内的 `.agents/skills/` 提供 `chart`、`drill`、`charter`、`slice`、`build`、
`gate`、`ship` 七个阶段技能,`.agents/skills/agent-workflow/` 是统一入口。
`AGENTS.md` 与 `docs/agents/dev-workflow.md` 规定阶段出口与门禁。

**待补**:用 Kiro 从头跑一遍「需求 → 规格 → 票 → 实现 → 验收」,把会话或提交
链接填进本节。当前仓库的骨架由辅助代理搭起,不能算作 Kiro 实机证据。

## 2. Custom agents

设计为两个边界代理:

- **解释器代理**:只改 `src/zmachine/`,必须同时提交性质测试。
- **前端代理**:只改 `src/main.ts` 与样式,禁止构造 `WorldState`。

依据是 `docs/agents/decisions/0001-state-authority.md`。

**待补**:在 Kiro 内创建这两个 custom agent,记录其指令与一次实际分工。

## 3. Agent hooks

`.kiro/hooks/gate-on-src-change.kiro.hook` 监听 `src/zmachine/**/*.ts` 与
`tests/**/*.ts`,变更后执行 `npm run check`。约束来源是
`.kiro/steering/engineering.md`:解释器改动必须先过类型检查与性质测试。

**未验证**:hook 文件已按 Kiro 的 hook 结构书写,但尚未在 Kiro 内触发过一次。
提交前需在 IDE 内改一行解释器代码,确认门禁自动运行。

## 4. Spec-driven development

`.kiro/specs/z-machine-resurrection/requirements.md` 用 EARS 句式写六条需求
(终端外壳、确定性回合、边界约束、单一状态所有者、重放恢复、门禁),
每条都有可判定的验收条件。

实现与规格的对应关系:`runTurn` 对应 R2/R3,`ZMachine` 接口对应 R4,
`restore` 对应 R5,`npm run check` 对应 R6。

## 5. Steering docs

`.kiro/steering/product.md` 写产品边界:LLM 只提意图,不写状态;拒绝的命令不改状态;
演示桥段不得依赖模型对状态正确。

`.kiro/steering/engineering.md` 写工程约束:`runTurn` 纯函数、新规则只进解释器、
新行为必须有 fast-check 性质测试、无 UI 框架、`.kiro/` 不得被忽略。

两份文件都是可执行的判据,不是背景介绍。

## 6. MCP

计划接入两类 MCP 服务:

- **检索类**:查 Z-machine 指令集与规范原文,避免凭记忆实现操作码。
- **浏览器类**:对部署后的页面做真实回归,验证终端交互与状态显示。

**待补**:尚未在 Kiro 内配置 MCP server,也没有调用记录。本节提交前必须换成
实际配置与一次真实调用结果。

## 7. Property-based testing

`tests/interpreter.test.ts` 用 `fast-check` 生成最多 40 步的命令序列,断言三件事:

1. 同一序列两次执行的状态与转写完全相同(R2)。
2. 位置永远只在合法房间内,回合数不越界(R3)。
3. 任意切分后重放整段序列,结果与一次跑完相同(R5)。

命令表包含 `""`、`xyzzy`、`  NORTH  ` 这类边界输入,用来证明「听不懂」不改变状态。

## 8. Kiro powers

计划把「规格评审」与「浏览器验证」做成两个可复用 power:前者检查需求是否仍满足
EARS 与状态边界,后者按固定剧本驱动页面并留存截图与断言结果。

**待补**:尚未创建 power。提交前要么给出实际 power 与使用记录,要么从本节删除
该主张,不保留无证据的描述。
