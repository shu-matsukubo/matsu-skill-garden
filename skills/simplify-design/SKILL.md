---
name: simplify-design
description: 設計や開発の仕組み、暫定対応、性能改善、派生値の不具合を検討するとき、必要な保証、責務、計算経路と運用制約を整理し、構成や改善への投資を判断する。
---

## 概要

必要な保証と運用上の制約を整理し、構成や改善への投資を判断する。

## 制約

- 現在の依頼とワークスペース固有の要件を優先し、上位指示と権限の制約を守る。
- 外部サービスへの書き込み・送信・公開の実行手順は、対象ワークスペースで扱う。
- 日本語の出力では[japanese-output-policy](../japanese-output-policy/SKILL.md)を使う。

## フロー

1. 設計案を比べるときは[前提条件の方針](references/guidance.md#前提の確認)と[簡素化の比較の方針](references/guidance.md#簡素化の比較)に従う。
2. 共通化を検討するときは[共通化の方針](references/guidance.md#共通化の判断)に従う。
3. 状態管理を選ぶときは[状態管理の方針](references/guidance.md#状態管理の選択)に従う。
4. 恒久対応が予定された暫定対応では[投資判断の方針](references/guidance.md#暫定対応の投資)に従う。
5. 性能改善の候補を比べるときは[優先順位の方針](references/guidance.md#性能改善の優先順位)に従う。
6. 正本データとViewer・Editorの依存関係を定めるときやClientを替えるときは[CoreとClientの方針](references/guidance.md#coreとclientの境界)に従う。
7. 標準と固有拡張を選ぶときは[相互運用性の方針](references/guidance.md#相互運用性の境界)に従う。
8. 案を不採用にするときや、その判断の前提が変わったときは[再評価の方針](references/guidance.md#不採用案の再評価)に従う。
9. 派生値の不具合を調べるときは[計算経路の方針](references/guidance.md#派生値の計算経路)に従う。
10. 設計原則やArchitecture Decisionを定めるときは[設計原則の継続検証の方針](references/guidance.md#設計原則の継続検証)に従う。
11. 根拠の確認が必要なときは[出典](references/sources.md)を確認する。
