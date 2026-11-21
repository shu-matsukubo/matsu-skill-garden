---
name: design-agent-workflows
description: AIワークフロー・定期処理の設計、AIへの設計依頼、依頼タスクと実装結果の記録を構成するとき、前提、役割、実行境界を整理する。
---

## 概要

実行契機、制御、能力、共有知識を分け、必要な実行構成を設計する。

## 制約

- 現在の依頼とワークスペース固有の要件を優先し、上位指示と権限の制約を守る。
- 外部サービスへの書き込み・送信・公開の実行手順は、対象ワークスペースで扱う。
- 日本語の出力では[japanese-output-policy](../japanese-output-policy/SKILL.md)を使う。

## フロー

1. Workflowや定期処理の設計では[構成・役割・実行境界の方針](references/guidance.md)に従う。
2. AIへの設計依頼を準備するときは[依頼の前提の方針](references/guidance.md#設計依頼の前提)に従う。
3. 依頼と実装結果の記録を構成するときは[作業記録の方針](references/guidance.md#作業記録の構成)に従う。
4. 根拠の確認が必要なときは[出典](references/sources.md)を確認する。
