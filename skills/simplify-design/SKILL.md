---
name: simplify-design
description: 設計や開発の仕組みを簡素化するとき、維持ルールと判断負荷を減らし、現在必要な責務から抽象化・状態管理を選ぶ。
---

# 設計を簡素化する

設計変更や仕組みの整理を頼まれたときに使う。必要な責務と維持すべき保証、現在の運用体制・担当範囲・移行計画を明らかにしてから案を比べる。

コード量やファイル数だけで簡素化を判断しない。コードを文書や人の確認へ移しても同じ例外処理が残るなら、維持ルールと判断負荷は減っていない。既存ツールが担える責務を重ねて実装していないか確認する。

将来の再利用だけを理由に共通基盤を先取りせず、まず小さい具体例を成立させる。次の実装が現れたら実際の共通責務、重複の削減、共通化の制約を比べる。

状態管理は今必要なデータ量・同時実行性・検索性・整合性・更新頻度から最小の方式を選ぶ。後の変更には永続化と利用側の境界で備える。単純化で必要な保証を失う案は採用せず、残る複雑さと理由を示す。

## 出典

現在のprincipleを利用場面へまとめた派生Skill。固定commitの出典：

- [簡素化では複雑さの移動でなくルールと判断負荷を減らす](https://github.com/shu-matsukubo/matsu-second-brain/blob/6442627beba656db0c30953263150099ea8d161b/knowledge/principles/development-process/k-094d1e9c150747ec.md)
- [抽象化は複数の具体例から行う](https://github.com/shu-matsukubo/matsu-second-brain/blob/6442627beba656db0c30953263150099ea8d161b/knowledge/principles/development-process/k-c8c18cc4a6746b87.md)
- [状態管理方式は現在の不変条件で選ぶ](https://github.com/shu-matsukubo/matsu-second-brain/blob/6442627beba656db0c30953263150099ea8d161b/knowledge/principles/development-process/k-dd48dc1f30a5dbac.md)
- [設計では技術以外の制約条件も明示する](https://github.com/shu-matsukubo/matsu-second-brain/blob/6442627beba656db0c30953263150099ea8d161b/knowledge/principles/development-process/k-18612ffa4bd0558c.md)
