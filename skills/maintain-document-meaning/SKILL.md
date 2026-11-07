---
name: maintain-document-meaning
description: 開発文書の更新や推敲で意味と判断条件を保つ。AI向け指示書では、責務、正本、参照先、読む時点を整理する。
---

# 意味を保って文書を保守する

## 内容と表現

- 文書変更の目的を確かめる。仕様や手順の更新では実装との整合、情報の最新性、判断条件の正確性を維持する。
- 推敲では条件、対象、例外、必須と推奨、時点、不確実性を変更前後で照合する。矛盾の箇所は、仕様上の判断が必要な点として切り出す。
- 仕様の更新と読みやすさの改善は、今回の依頼に必要な範囲で進める。改善が大きい場合は保守サイクルを分ける。

## AI向け指示書の構造

- AGENTS.mdには常に必要な原則と入口を置く。読む工程が限られる情報は、その工程から参照できる場所に置く。
- SKILL.mdは概要、適用条件、制約、番号付きのフローを基本とする。Skill固有の詳細はreferences、複数Skillで共有する規約の正本はdocsへ置く。テンプレートは使う役割が持つ。
- AGENTS.mdとSKILL.mdの操作指示は、原則として相対リンクで示したSkillを使うか、リンク先の方針に従う形にする。概要は通常の文章で書く。同じルールの正本は一箇所に置き、情報を探して直す負担が減る単位で分ける。工程に必要な参照先を選び、構造を辿って変更箇所が分かるようにする。

## 出典

- [文書の正確性と読みやすさは別々に保守する](https://github.com/shu-matsukubo/matsu-second-brain/blob/94370a51c5e856ceffb68afdc8a3b48fdfb813d9/knowledge/principles/development-process/k-59ebcac46c07180e.md)
- [AI向けドキュメントは責務と参照構造で説明する](https://github.com/shu-matsukubo/matsu-second-brain/blob/94370a51c5e856ceffb68afdc8a3b48fdfb813d9/knowledge/principles/development-process/k-838e51960661c08f.md)
