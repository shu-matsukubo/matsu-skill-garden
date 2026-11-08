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

常に必要な原則と作業の入口を示し、特定の工程で読む情報はその工程から辿れるようにする。ルールの正本は一箇所に置き、変更する責務や適用条件を構造から読み取れるようにする。情報は探して直す負担が減る単位で分ける。

Skillを設計するときは、認知負債と判断負担を減らす、責務を明確にする、必要な段階で情報を読む、機械的な検証を優先する、といった原則を、ファイル配置、検証スクリプト、プラグイン制約など環境ごとの規約から分ける。原則の正本は再利用に必要な構成から決める。

出典のAI向け文書構成を採用する環境では、次の配置と書式を使う。

- AGENTS.mdには常に必要な原則と入口を置く。読む工程が限られる情報は、その工程から参照できる場所に置く。
- SKILL.mdは概要、適用条件、制約、番号付きのフローを基本とする。Skill固有の詳細はreferences、複数Skillで共有する規約の正本はdocsへ置く。テンプレートは使う役割が持つ。
- AGENTS.mdとSKILL.mdの操作指示は、原則として相対リンクで示したSkillを使うか、リンク先の方針に従う形にする。概要は通常の文章で書く。工程に必要な参照先を選ぶ。

## 出典

- [文書の正確性と読みやすさは別々に保守する](https://github.com/shu-matsukubo/matsu-second-brain/blob/b6490b31a45a0d36ccef0582a6e8f4ff338695c4/knowledge/principles/development-process/k-59ebcac46c07180e.md)
- [AI向けドキュメントは責務と参照構造で説明する](https://github.com/shu-matsukubo/matsu-second-brain/blob/b6490b31a45a0d36ccef0582a6e8f4ff338695c4/knowledge/principles/development-process/k-838e51960661c08f.md)
- [Skillの設計原則はツール固有の実装規約から分ける](https://github.com/shu-matsukubo/matsu-second-brain/blob/b6490b31a45a0d36ccef0582a6e8f4ff338695c4/knowledge/principles/development-process/k-93b112cfea83692e.md)
