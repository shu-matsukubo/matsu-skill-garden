---
name: design-agent-workflows
description: AIワークフローや定期処理、IssueからTaskへの設計、AIへの設計依頼・作業記録・再開・チャット切替を構成するとき、前提、役割、実行境界を整理する。
---

## 概要

実行契機、制御、能力、共有知識を分け、必要な実行構成を設計する。

## 制約

- 現在の依頼とワークスペース固有の要件を優先し、上位指示と権限の制約を守る。
- 外部サービスへの書き込み・送信・公開の実行手順は、対象ワークスペースで扱う。
- 日本語の出力では[japanese-output-policy](../japanese-output-policy/SKILL.md)を使う。

## フロー

1. Workflowの構成・処理順・停止条件・共通検証を定めるときや変更するときは[実行構成の方針](references/guidance.md#実行の構成)に従う。起動方法や実行プロンプトを準備するときは[起動構成の方針](references/guidance.md#起動の構成)に従う。
2. 計画レビューを設計するときは[計画の役割の方針](references/guidance.md#計画の役割)に従う。
3. AIへの設計依頼を準備するときは[依頼の前提の方針](references/guidance.md#設計依頼の前提)に従う。
4. 依頼と実装結果の記録を構成するときは[作業記録の方針](references/guidance.md#作業記録の構成)に従う。
5. 実装の委譲を設計するときは[実装の役割の方針](references/guidance.md#実装の役割)と[実行主体の選択の方針](references/guidance.md#実行主体の選択)に従う。
6. 並列度を決めるときは[並列度の方針](references/guidance.md#並列度の選択)に従う。
7. モデルを選ぶときは[モデル選択の方針](references/guidance.md#モデルの選択)に従う。
8. 作業再開の状態を設計するときは[再開構成の方針](references/guidance.md#再開の構成)に従う。
9. チャットを切り替えるときは[チャット切替の方針](references/guidance.md#チャットの切替)に従う。
10. 改善点の観測と対応を設計するときは[観測と改善の方針](references/guidance.md#観測と改善の構成)に従う。
11. 改善候補を処理するときやIssueからTaskへ進むときは[現在状態の照合の方針](references/guidance.md#改善候補とissueの照合)に従う。
12. 承認を設計するときは[承認境界の方針](references/guidance.md#承認の構成)に従う。
13. 操作の制約を設計するときは[実行境界の方針](references/guidance.md#実行境界の設計)に従う。
14. 効果を比べるときは[評価の方針](references/guidance.md#効果の評価)に従う。
15. 根拠の確認が必要なときは[出典](references/sources.md)を確認する。
