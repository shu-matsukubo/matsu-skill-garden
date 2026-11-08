---
name: share-task-policies
description: AIワークフローで作業対象ごとの方針を登録するとき、生成とレビューが参照する正本と、適用範囲・更新の扱いを決める。
---

# 生成とレビューで作業方針を共有する

1. API実装や画面実装など、作業対象ごとに方針を用意する。生成担当は指示として使い、レビュー担当は同じ方針で成果物を確かめる。
2. 一つのタスクに適用する登録方針は最大一件とする。タスクの分割は作業のまとまりで判断する。方針を適用する都合だけで、まとまりのあるタスクを分けない。登録総数は必要な対象に応じて決める。
3. 計画承認があるWorkflowでは、提示前に適用候補を取得し、使う方針とリビジョンを確定して適用条件を計画に記載する。承認後はその条件を生成とレビューで共有する。記載漏れが分かったら適用方針の確認に戻り、利用者が方針を無効にしたと解釈しない。
4. 会話から再利用できる判断を抽出し、似た登録があれば更新する。永続保存の承認を得て、リビジョンが競合した場合は更新を中止して報告する。

## 出典

- [生成とレビューで作業対象ごとの登録方針を共有する](https://github.com/shu-matsukubo/matsu-second-brain/blob/b6490b31a45a0d36ccef0582a6e8f4ff338695c4/knowledge/principles/development-process/k-5cab5edadf27210f.md)
- [計画の承認を求める前に適用方針とリビジョンを確定する](https://github.com/shu-matsukubo/matsu-second-brain/blob/b6490b31a45a0d36ccef0582a6e8f4ff338695c4/knowledge/principles/development-process/k-553191f6db254b55.md)
