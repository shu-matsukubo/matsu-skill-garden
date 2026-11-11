---
name: maintain-document-meaning
description: 開発文書の更新や推敲で意味と判断条件を保つ。AI向け指示書では、責務、正本、参照先、読む時点を整理する。
---

## 概要

条件と不確実性を保ち、文書の責務と参照構造を整理する。

## 制約

- 現在の依頼とワークスペース固有の要件を優先し、上位指示と権限の制約を守る。
- 外部サービスへの書き込み・送信・公開の実行手順は、対象ワークスペースで扱う。
- 日本語の出力では[japanese-output-policy](../japanese-output-policy/SKILL.md)を使う。

## フロー

1. 判断と手順は[maintain-document-meaningの方針](references/guidance.md)に従う。
2. 根拠の確認が必要なときは[出典](references/sources.md)を確認する。
