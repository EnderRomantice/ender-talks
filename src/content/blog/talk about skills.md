---
title: '聊聊最近很火的skill!'
description: 'first try skill'
pubDate: '1 30 2026'
language: 'Chinese'
---

聊聊最近很火的skill!

这个出现还蛮早的，我比较早的了解到但一直没有去接触过。

因为实习的关系我接触了很多AI相关的有趣项目，加上最近我最敬佩的古法编程匠人antfu也新建了自己的skill仓库，我开始对这个充满兴趣，决定去认真玩一下。

正好我的朋友@yaoandyan在小红书上有做AI相关的扫盲视频，快速了解了一下skill做了什么事情，然后就去直接和GLM聊天+直接写自己的第一个skill了！

> 顺便推荐一下@yaoandyan的小红书 id: 打电脑蛮操心 都是很优质用心的时下AI热点科普，对于我这种在快速发展中害怕掉队又不想花太多时间入手了解的人非常有帮助！

```
translate-skills/
└── SKILL.md
```

这就是skill最简单的形态，一段纯提示词，类似告诉ChatGPT你是一袋猫粮，区别是包含了一些元数据，便于agent知道这个skill是什么，该何时使用。

```
---
name: 中文翻译
description: 将任何语言翻译为中文
---
你是一个专业翻译官，你需要将任何非中文文本翻译为中文并以markdown格式输出
注意翻译时结合上下文，确保语义完整传达，尽可能精炼的同时保持表达能力。


```

> 因为这篇文章的标签是chinese所以内部我用的是中文，但正常开发最好是用英文规范一些!

这是我们的翻译skill，必须包含的是name和description, 如果你用过Astro想必看到这个格式会非常眼熟🤭
这就是一个最简单的skill了，蛮有趣的，简单又莫名有效的感觉。

我们现在来用一下这个skill!

通常主流的AI coding tools都支持skill，我以我最常用的opencode举例，下面是docs的原文

```
Place files
Create one folder per skill name and put a SKILL.md inside it. OpenCode searches these locations:

Project config: .opencode/skills/<name>/SKILL.md
Global config: ~/.config/opencode/skills/<name>/SKILL.md
Project Claude-compatible: .claude/skills/<name>/SKILL.md
Global Claude-compatible: ~/.claude/skills/<name>/SKILL.md
```

可以看到使用方式非常简单

- 如果是项目内使用，在根目录新建一个.opencode(这个名字可以根据实际情况替换成你使用的工具，通常格式差不多）， 然后再新建一个skills, 就可以直接把你的skill项目拖进去了!
- 如果是全局使用, 操作类似，找到用户目录下的.config/opencode，然后同上

目前主流的AI工具应该都是会主动去跟进标准和新技术的，所以不用担心用不了/不方便的问题（如果用不了那就尽早换产品吧:P)

就是这样，Thanks for you time！
免责声明：实际生产中的skill会比这个复杂许多，我希望这篇文章能提起你的兴趣能去看看，仅此而已😊
