---
name: japanese-output-policy
description: 日本語の回答・文書・Skillを構成するとき、見出しの粒度と文の役割を揃え、共通の表現一覧に沿って説明する。出力方針自体の改善にも使う。
---

## 概要

日本語を、文書構造と役割の揃った文の組み合わせで説明する。

## 制約

- 利用者が指定した形式・詳しさと、ワークスペース固有の要件を優先する。
- 意味、条件、必須と推奨、不確実性を保つ。
- 共通Skillから外部への保存・送信・公開を自動実行させない。

## フロー

1. 文書の組み立てでは[構成基準の方針](references/structure.md)に従う。
2. 語句の選択では[表現方法一覧の方針](references/expressions.md)に従う。
3. このSkillの改修では[skill-design-policy](../skill-design-policy/SKILL.md)を使う。
4. 方針変更の影響を扱うときは[再評価の方針](../skill-design-policy/references/reevaluation.md)に従う。
