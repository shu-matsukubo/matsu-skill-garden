---
name: simplify-design
description: 設計や開発の仕組みを簡素化するとき、維持ルールと判断負荷を減らし、現在の責務と変更理由から抽象化・状態管理を選ぶ。
---

## 概要

必要な保証を保ち、維持ルールと判断負荷を減らす構成を選ぶ。

## 制約

- 現在の依頼とワークスペース固有の要件を優先し、上位指示と権限の制約を守る。
- 外部サービスへの書き込み・送信・公開の実行手順は、対象ワークスペースで扱う。
- 日本語の出力では[japanese-output-policy](../japanese-output-policy/SKILL.md)を使う。

## フロー

1. 判断と手順は[simplify-designの方針](references/guidance.md)に従う。
2. 根拠の確認が必要なときは[出典](references/sources.md)を確認する。
