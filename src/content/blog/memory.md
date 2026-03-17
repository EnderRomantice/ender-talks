---
title: '所谓Memory和Context Engineering'
description: 'thinking...'
pubDate: '3 17 2026'
language: 'Chinese'
---

## 所谓Memory和Context Engineering

最近在工作中学到许多成体系的Agent相关知识，在mentor的教导下也是从Agent练气散修突破到了筑基，狠狠记录一下。

### 旧时的理解

之前我对memory和context的理解很模糊。我简单的将memory理解为short-term+long-term, context则是模型在一次会话中的上下文.

在我之前的视角中，他们是并列关系，后面也是纠正了这个错误思维。

实际上, LLM本质上只有一个输入: **Context**

```sh
tokens -> model -> tokens
```

所以memory和context的关系实际上是:

```sh
Context
│
├── System Prompt
├── Tool Specification
├── Retrieved Knowledge (RAG)
├── Memory
├── Chat History
└── User Input
```

memory是context engineering的一部分.

### 概念明晰

```py
System Prompt = "模型的基础信息，思想钢印, 控制定位，人设等"
Memory = "可复用上下文"
Tools = "模型可用工具"
```

### 真实存在的需求

Memory这东西听着还是蛮有用的，但具体是如何体现的呢？

你是不是会发现在ChatGPT和Gemini中，他们会记住你以前的一些重要信息:

```python
user: "我在做开源"
bot: "噢，那你还挺牛的"
-> 此刻bot偷偷记住了你做过开源
-> 若干天后
user: "我去这个git pull咋老有冲突啊，快帮我解决下"
-> 思考的过程中联想到开源
bot: "你做开源的这都不懂？"
user: "?下个月退订了"
```

前文提到过Memory是*可复用上下文*, 大体分为short-term + long-term组成。

而这里就是用到了long-term!

那么模型是如何发现哪个记忆应该被存起来，又是如何实施存储的呢？

### 实施方案

```python
system prompt = """ 
                你是一个聊天机器人，你要做的事情就是把用户哄高兴了。
                tools:
                如果用户说了什么你认为有价值，需要保存的信息，使用save_memory
                """
```

是不是非常简单，加一条prompt让LLM自己判断记不记住，再写点配套tools让agent操作存进向量数据库, 美美实现一个最简Memory管理！

虽然基本的实现非常简单，然而这种设计可能出现这种情况:

```python
user: "我最喜欢TypeScript, 现代类型系统，生态繁荣好用"
bot: "行，记住了"
-> db: user最喜欢TypeScript
-> 若干天后
user: "我最喜欢Python, 我勒个英语写代码啊"
-> db: user最喜欢Python
-> 若干天后
user: "想写个链表，你用我最喜欢的语言写吧，"
-> db: 自动召回 最喜欢的语言两个结果?
bot: "呃..我记得你最喜欢的语言有两个, rust和python"
user: "你疯了吗？最喜欢怎么会有两个"
```

用户总是无理取闹的，所以我们需要一开始就设计好。

我们通常有两个还不错的方案:

1. 给每条记忆打上时间戳

```python
   [2026-3-17] user最喜欢ts
   [2026-3-20] user最喜欢py
   
   agent get 最喜欢语言 -> 两个结果
   [bot] 看上去py新一点，拿py吧!
```

2. 加一步检查, 专门用一个agent review

```python
   [2026-3-20] user最喜欢py
   [2026-3-17] user最喜欢ts
   [memory_admin] 这个冲突了吧？结合user之前的记录，看上去他用py多些，存py吧
   [bot] 行
   [2026-3-17] user最喜欢py
```

### 小结

memory相关差不多就这些，等后面我学到新技巧再来更新！