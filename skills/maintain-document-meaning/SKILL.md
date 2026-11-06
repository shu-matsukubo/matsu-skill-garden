---
name: maintain-document-meaning
description: 開発文書の更新や推敲で、仕様・手順の正確性と読みやすさを分けて保守し、表現変更で意味や判断条件が変わることを防ぐ。
---

# 意味を保って文書を保守する

文書変更の目的が、仕様・手順の更新か、読みやすさの改善かを見極める。通常の開発では実装との整合、情報の最新性、手順と判断条件の正確性を維持する。

推敲では表現に集中し、意味や仕様を変えない。条件、対象、例外、必須と推奨、時点、不確実性を変更前後で照合する。表現を整える途中で内容の矛盾を見つけたら、その箇所を明らかにし、推敲に紛れ込ませて仕様を決めない。

すべての品質を一度に改善する必要はない。読みやすさの改善が大きい場合は正確性の更新と保守サイクルを分け、今回の依頼に必要な範囲を進める。

AI向けの指示書では、責務・情報の所在・階層・参照関係から、変更すべき場所を辿れるようにする。Plugin・Skill・Referenceの責務を分け、SKILL.mdの入口は概要・制約・フローを基本にする。詳細は担当するReferenceへ、テンプレートは使う役割へ置く。同じルールの正本は一箇所にし、工程は短い説明とリンクで示す。分割は、情報を探して変更する際の判断が減るかで選ぶ。

## 出典

現在のprincipleを利用場面へまとめた派生Skill。固定commitの出典：

- [文書の正確性と読みやすさは別々に保守する](https://github.com/shu-matsukubo/matsu-second-brain/blob/6442627beba656db0c30953263150099ea8d161b/knowledge/principles/development-process/k-59ebcac46c07180e.md)
- [AI向けドキュメントは責務と参照構造で説明する](https://github.com/shu-matsukubo/matsu-second-brain/blob/0488df05cd17624f946312f04d7ab3bcd1091b9a/knowledge/principles/development-process/k-838e51960661c08f.md)
