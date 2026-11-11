---
name: skill-design-policy
description: Skillを作成・改修するとき、段階的な参照構造、操作と方針参照の表現、スクリプトによる保証を設計する。設計方針自体の改善にも使う。
---

## 概要

必要な情報へ必要な時点で辿れるSkillを設計する。

## 制約

- ワークスペース固有の要件を優先し、上位指示と権限の制約を守る。
- 共通Skillには、外部サービスへの書き込み・送信・公開を自動実行させる指示を含めない。

## フロー

1. 作成・改修時は[設計基準の方針](references/design.md)に従う。
2. 参照を記述するときは[参照動詞の方針](references/verbs.md)に従う。
3. 日本語の本文を整えるときは[japanese-output-policy](../japanese-output-policy/SKILL.md)を使う。
4. 方針を変更するときは[再評価の方針](references/reevaluation.md)に従う。
