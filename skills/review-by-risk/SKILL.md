---
name: review-by-risk
description: 変更の検証方法や品質ゲート、バージョンアップ後の試験を設計するとき、リスクと追加の検出価値から検証強度を決め、機械・AI・人の判断を分担する。
---

## 概要

失敗の影響と検出価値から、検証強度と役割分担を設計する。

## 制約

- 現在の依頼とワークスペース固有の要件を優先し、上位指示と権限の制約を守る。
- 外部サービスへの書き込み・送信・公開の実行手順は、対象ワークスペースで扱う。
- 日本語の出力では[japanese-output-policy](../japanese-output-policy/SKILL.md)を使う。

## フロー

1. 検証強度を選ぶときは[検証強度の方針](references/guidance.md#検証強度)に従う。
2. 機械・AI・人の判定を分担するときは[判定の分担の方針](references/guidance.md#判定の分担)に従う。
3. レビューと統合の単位、局所検証後の対象を選ぶときは[検証単位の方針](references/guidance.md#検証と統合の単位)に従う。
4. OSSのアップグレードやEOSL対応では[外部依存の調査の方針](references/guidance.md#外部依存の調査)に従う。更新後の試験は[バージョンアップ後の試験の方針](references/guidance.md#バージョンアップ後の試験)に従う。
5. 独立レビューを設計するときは[独立レビューの方針](references/guidance.md#独立レビュー)に従う。
6. 品質ゲートと見逃しへの対策を見直すときは[ゲート改善の方針](references/guidance.md#ゲートの改善)に従う。
7. PRのCI確認を設計するときは[PR検証の方針](references/guidance.md#pr検証の設計)に従う。
8. 根拠の確認が必要なときは[出典](references/sources.md)を確認する。
