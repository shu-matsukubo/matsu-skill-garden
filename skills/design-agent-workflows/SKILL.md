---
name: design-agent-workflows
description: AIワークフローや定期処理を設計するとき、責務、計画レビュー、実行境界を整理し、必要なエージェントとモデルを選ぶ。
---

## 概要

実行契機、制御、能力、共有知識を分け、必要な実行構成を設計する。

## 制約

- 現在の依頼とワークスペース固有の要件を優先し、上位指示と権限の制約を守る。
- 外部サービスへの書き込み・送信・公開の実行手順は、対象ワークスペースで扱う。
- 日本語の出力では[japanese-output-policy](../japanese-output-policy/SKILL.md)を使う。

## フロー

1. 判断と手順は[design-agent-workflowsの方針](references/guidance.md)に従う。
2. 根拠の確認が必要なときは[出典](references/sources.md)を確認する。
