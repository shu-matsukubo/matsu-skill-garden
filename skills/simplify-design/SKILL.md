---
name: simplify-design
description: 設計や開発の仕組みを簡素化するとき、維持ルールと判断負荷を減らし、現在の責務と変更理由から抽象化・状態管理を選ぶ。
---

# 設計を簡素化する

設計変更や仕組みの整理を頼まれたときに使う。必要な責務と維持すべき保証、運用体制・担当範囲・移行計画を明らかにしてから案を比べる。

- 維持するルールと判断負荷が減るかを確認する。コードを文書や人の確認へ移す場合も、残る例外処理と既存ツールが担える責務を数える。
- 複数の具体的な利用が揃った段階で、共通責務、重複の削減、共通化の制約を比べる。Skillの工程が似ていても用途と変更理由が異なり、共通化で依存や判断が増えるなら、用途ごとの責務を保つ。
- 現在のデータ量・同時実行性・検索性・整合性・更新頻度に対して、必要な保証を満たす最小限の状態管理を選ぶ。永続化と利用側の境界を設け、保存方式を後から変更できるようにする。長期に維持するデータと運用ルールの正本を閲覧・編集用Clientから分離する。別の保存先で閲覧や検索を支える場合は、正本から参照用データを作る。

必要な保証を保ち、残る複雑さと理由を示す。

## 出典

- [簡素化では複雑さの移動でなくルールと判断負荷を減らす](https://github.com/shu-matsukubo/matsu-second-brain/blob/94370a51c5e856ceffb68afdc8a3b48fdfb813d9/knowledge/principles/development-process/k-094d1e9c150747ec.md)
- [抽象化は複数の具体例から行う](https://github.com/shu-matsukubo/matsu-second-brain/blob/94370a51c5e856ceffb68afdc8a3b48fdfb813d9/knowledge/principles/development-process/k-c8c18cc4a6746b87.md)
- [状態管理方式は現在の不変条件で選ぶ](https://github.com/shu-matsukubo/matsu-second-brain/blob/94370a51c5e856ceffb68afdc8a3b48fdfb813d9/knowledge/principles/development-process/k-dd48dc1f30a5dbac.md)
- [設計では技術以外の制約条件も明示する](https://github.com/shu-matsukubo/matsu-second-brain/blob/94370a51c5e856ceffb68afdc8a3b48fdfb813d9/knowledge/principles/development-process/k-18612ffa4bd0558c.md)
- [長寿命なCoreを短寿命なClientへ依存させない](https://github.com/shu-matsukubo/matsu-second-brain/blob/94370a51c5e856ceffb68afdc8a3b48fdfb813d9/knowledge/principles/development-process/k-3ddb79c59977a9f0.md)
- [Skillの共通化は用途と変更理由で判断する](https://github.com/shu-matsukubo/matsu-second-brain/blob/94370a51c5e856ceffb68afdc8a3b48fdfb813d9/knowledge/principles/development-process/k-8d290466ad5dbafa.md)
