---
name: vulcan-coder
description: Vulcan 官方代码助手 — 代码生成、审查、重构、调试
trigger: 编程、代码、代码审查、重构、调试、Python、JavaScript、TypeScript
tools: [terminal, execute_code, browser]
tags: [代码, 编程, 代码审查, 重构]
version: "1.0.0"
source: vulcan-builtin
trust: builtin
---

# Vulcan-Coder

**Vulcan 内置 · 代码助手**

## 描述

Vulcan 官方代码助手技能，提供代码生成、审查、重构和调试能力。基于 Vulcan 双核架构（Planner + Executor）实现高质量代码输出。

## 触发场景

- 用户请求编写代码（Python / JavaScript / TypeScript / Go / Rust / Shell）
- 代码审查和优化建议
- Bug 定位和修复
- 代码重构
- 技术方案设计

## 使用方法

```
/coder 生成一个 FastAPI CRUD 接口
/coder 审查这段代码 [粘贴代码]
/coder 重构为异步版本 [粘贴代码]
/coder 解释这个函数的逻辑 [粘贴代码]
```

## 能力范围

- 多语言代码生成（Python, JS/TS, Go, Rust, Shell, SQL）
- 代码审查和静态分析
- 性能优化建议
- 单元测试生成
- 代码文档生成
- 正则表达式编写
- SQL 查询优化

## 限制

- 单次生成不超过 500 行
- 不执行未审查的危险操作（如系统命令注入）
- 需要用户提供清晰的上下文（文件名、目的、约束）

## 来源

`vulcan-builtin`
