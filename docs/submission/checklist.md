# 提交清单

截止:2026-12-04 14:00 PT / 2026-12-05 06:00(北京时间)。状态只有四种:
已完成、进行中、待办、未验证。

| 交付物 | 要求 | 位置 | 状态 |
| --- | --- | --- | --- |
| 公开 GitHub 仓库 | 公开可访问 | 远端仓库 | 待办(尚未 push) |
| 开源许可 | About 区可见 LICENSE | `LICENSE`(MIT) | 已完成(本地) |
| 新建时间 | 2026-10-30 之后创建 | 首个提交 `c8fe2f3` | 已完成 |
| `.kiro` 目录 | 含 specs / hooks / steering,且未被忽略 | `.kiro/` | 已完成 |
| 可运行应用 | 提交可访问的 app URL | 待部署 | 待办 |
| 本地可运行 | `npm install && npm run dev` | `README.md` | 已完成 |
| 门禁 | `npm run check` 全绿 | `package.json` | 已完成 |
| 构建 | `npm run build` 通过 | `dist/` | 已完成 |
| 可玩回合 | 三个房间、灯与黑暗、钥匙与 hatch、SAVE/RESTORE/REPLAY | `src/` | 已完成 |
| 模型前端 | 规则解析器可用;模型经 `/api/interpret` 或外部代理 | `src/frontend/`, `api/` | 已完成(模型需配 key) |
| 项目描述 | Devpost 文本,中英各一版,≤500 词 | `docs/submission/project-description.md` | 进行中 |
| Kiro 使用说明 | 覆盖 8 个提示,逐节作答 | `docs/submission/kiro-usage.md` | 进行中(部分待证据) |
| 演示视频 | 公开 YouTube,≤3 分钟 | 待录制 | 待办 |
| 标语 | ≤140 字符 | `docs/submission/tagline.txt` | 已完成 |
| 架构说明 | 前端 / 解释器 / 状态边界 | `README.md` | 已完成 |
| Kiro 实机证据 | 在 Kiro 内完成的工作记录 | 待补 | 未验证 |

## 提交前复核

1. 在 Kiro 内重跑一次规格 → 实现 → 验收,留下可引用的会话或提交证据。
2. 部署应用并把 URL 填进 Devpost 与 `README.md`。
3. 录 3 分钟以内视频:问题 → 状态边界 → 现场演示(含一次幻觉被解释器拒绝)→ 重放。
4. 确认 GitHub About 展示 MIT,`.kiro/` 未被 `.gitignore` 命中。
5. 演示脚本:依次输入 `north`、`south`、`look`、`xyzzy`,状态栏应显示
   `state: cell · moves: 2`;再输入 `take the key and go north`、`SAVE`、`go east`
   (被 hatch 拒绝)、`RESTORE`、`REPLAY`。
