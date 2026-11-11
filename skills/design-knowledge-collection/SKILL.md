---
name: design-knowledge-collection
description: ナレッジの自動収集を設計・見直すときや、開発会話から候補を拾うときに使う。取得漏れの許容範囲、安全な保存と既存データの保全、後続整理、継続コスト、発言の確度を確認する。
---

## 概要

取得漏れの許容範囲と既存データの保全から、継続できる収集構成を設計する。

## 制約

- 現在の依頼とワークスペース固有の要件を優先し、上位指示と権限の制約を守る。
- 外部サービスへの書き込み・送信・公開の実行手順は、対象ワークスペースで扱う。
- 日本語の出力では[japanese-output-policy](../japanese-output-policy/SKILL.md)を使う。

## フロー

1. 判断と手順は[design-knowledge-collectionの方針](references/guidance.md)に従う。
2. 根拠の確認が必要なときは[出典](references/sources.md)を確認する。
