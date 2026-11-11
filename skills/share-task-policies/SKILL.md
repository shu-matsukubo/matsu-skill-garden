---
name: share-task-policies
description: AIワークフローで作業対象ごとの方針を登録するとき、生成とレビューが参照する正本と、適用範囲・更新の扱いを決める。
---

## 概要

生成担当とレビュー担当が、同じ作業方針とリビジョンを参照する構成を設計する。

## 制約

- 現在の依頼とワークスペース固有の要件を優先し、上位指示と権限の制約を守る。
- 外部サービスへの書き込み・送信・公開の実行手順は、対象ワークスペースで扱う。
- 日本語の出力では[japanese-output-policy](../japanese-output-policy/SKILL.md)を使う。

## フロー

1. 判断と手順は[share-task-policiesの方針](references/guidance.md)に従う。
2. 根拠の確認が必要なときは[出典](references/sources.md)を確認する。
