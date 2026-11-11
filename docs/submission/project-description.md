# Devpost 项目描述

## 中文版

**LLM 说话,Z-machine 持有真相。**

1979 年的 Z-machine 让文字冒险成为可能:一段文本描述一个世界,玩家用动词改变它。
今天我们把 LLM 接到同一台引擎前面,却拒绝把世界交给它。

问题很具体:LLM 讲故事的代价是会编。它记得你拿了钥匙,其实你没拿;它说你到了走廊,
其实门还锁着。玩家一旦发现叙述不可信,沉浸感就没了。反向的失败同样致命:模型每次
重述都略有不同,同一局游戏无法复现,也没法回滚。

我们的做法是把「理解」和「事实」拆开。LLM 只做前端:把「点灯,然后往北」翻译成
解释器认得的命令。Z-machine 解释器是唯一的状态权威,每次输入产生一次确定性回合,
输出新状态与转写行。模型说错了,解释器直接拒绝,屏幕上的世界不变。因为没有时钟、
没有随机、没有 I/O,同样的快照加同样的命令序列必然得到同样的结果,重放与撤销都成立。

演示里,玩家可以故意诱使模型说「你已经穿过门了」;界面上的位置仍是原来的格子,
解释器只回一句「门锁着」。这就是主张的证据:叙述可以流畅,事实不能漂移。

Kiro 在这里不是装饰。状态边界写成 steering 约束,需求写成 EARS 规格,
解释器改动触发 hook 跑门禁,性质测试用 fast-check 断言「同序列同结果」。
规格、实现与验收共用同一套约束,换一个会话也不会把边界改掉。

复活不是怀旧,是把一个四十六年前就被证明可靠的架构,交给今天的自然语言界面。

## English version

**The LLM speaks. The Z-machine owns the truth.**

In 1979 the Z-machine made text adventure possible: a world described in prose,
changed by verbs. We put an LLM in front of that engine — and refuse to hand it
the world.

The failure is concrete. An LLM that narrates will invent: it remembers a key
you never took, or reports a corridor you never reached. Once narration stops
being trustworthy, immersion is gone. The opposite failure is just as fatal:
every retelling differs slightly, so a session cannot be reproduced or rewound.

Our split is simple. The model is only a front end: it turns "light the lamp,
then go north" into commands the interpreter understands. The Z-machine
interpreter is the sole state authority. Every input produces one deterministic
turn with a new state and a transcript. When the model is wrong, the interpreter
refuses and the screen does not move. With no clock, no randomness, and no I/O,
the same snapshot plus the same command sequence always yields the same result —
so replay and undo are real, not decorative.

In the demo, a player tries to talk the model into "you already went through the
door." The location on screen is unchanged; the interpreter answers that the
door is locked. That is the claim made visible: prose may flow, facts may not
drift.

Kiro is load-bearing here. The state boundary lives in steering, requirements
are written as EARS specs, interpreter edits trigger the gate hook, and
property-based tests assert "same sequence, same result." Spec, implementation,
and acceptance share one set of constraints, so a fresh session cannot quietly
rewrite the boundary.

Resurrection is not nostalgia. It is handing a 46-year-old architecture that was
already proven reliable to today's natural-language interface.
