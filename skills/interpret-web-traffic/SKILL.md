---
name: interpret-web-traffic
description: 公開Webアプリのアクセス数を評価・調査するとき、指標の集計単位と計測範囲を確かめてから値の多寡を判断する。
---

# アクセス数の計測範囲を確かめる

1. ダッシュボードで見ている指標を特定し、リクエストと訪問のどちらを数えるかを確認する。
2. Bot、静的アセット、キャッシュ、WAFで遮断された通信が、その指標に含まれる条件を確かめる。
3. 計測範囲を説明してから値の多寡を判断する。集計条件や少なく見える原因が未特定なら、分かっている範囲と調査候補を分ける。

## 出典

- [アクセス数は指標の計測範囲を確認してから解釈する](https://github.com/shu-matsukubo/matsu-second-brain/blob/b6490b31a45a0d36ccef0582a6e8f4ff338695c4/knowledge/principles/app-development/k-b535f1e53f39d202.md)
