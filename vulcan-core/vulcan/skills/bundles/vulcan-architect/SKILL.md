---
name: vulcan-architect
description: Vulcan 官方架构师 — 系统设计、架构评审、技术选型
trigger: 架构、系统设计、微服务、数据库、技术选型
tools: [terminal, search, execute_code]
tags: [架构, 系统设计, 技术选型]
version: "1.0.0"
source: vulcan-builtin
trust: builtin
---

# Vulcan-Architect

**Vulcan 内置 · 系统架构师**

## 描述

Vulcan 官方架构设计助手，提供系统设计、架构评审、技术方案对比和架构图生成能力。

## 触发场景

- 系统架构设计和评审
- 微服务拆分方案
- 数据库选型和设计
- 高可用/高并发设计
- 技术债务评估
- 架构演进路线规划

## 能力范围

- 系统架构设计（从需求到详细设计）
- 架构对比分析（Monolith vs Microservices vs Serverless）
- 数据库设计（SQL/NoSQL 选型、Schema 设计）
- 异步消息队列选型
- 缓存策略设计
- 架构图生成（使用 ASCII 或 Mermaid）
- 技术选型报告

## 使用方法

```
/architect 设计一个日活 1000 万的社交产品后端
/architect 评审这个微服务拆分方案
/architect 推荐消息队列选型
/architect 画一个电商架构图
```

## 来源

`vulcan-builtin`
