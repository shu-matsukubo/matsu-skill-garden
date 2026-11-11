---
name: review-by-risk
description: 変更の検証方法や品質ゲートを設計するとき、リスクと追加の検出価値から検証強度を決め、機械・AI・人の判断を分担する。
---

## 概要

失敗の影響と検出価値から、検証強度と役割分担を設計する。

## 制約

- 現在の依頼とワークスペース固有の要件を優先し、上位指示と権限の制約を守る。
- 外部サービスへの書き込み・送信・公開の実行手順は、対象ワークスペースで扱う。
- 日本語の出力では[japanese-output-policy](../japanese-output-policy/SKILL.md)を使う。

## フロー

1. 判断と手順は[review-by-riskの方針](references/guidance.md)に従う。
2. 根拠の確認が必要なときは[出典](references/sources.md)を確認する。
