---
name: review-by-risk
description: 変更の検証方法や品質ゲートを設計するとき、リスクと追加の検出価値から検証強度を決め、機械・AI・人の判断を分担する。
---

# リスクから検証を選ぶ

変更対象の重要度、影響範囲、失敗時の損失、検証で得る価値、時間と認知資源から必要な強度を決める。開発用の仕組みでも破壊や漏えいにつながる操作は高リスクとして扱う。

高コストな品質保証が必要かは入口で決める。品質保証付きWorkflowを選んだら必要な工程を進め、工程ごとに同じ人間確認を繰り返さない。このSkillの利用自体を、新たな独立レビューや承認ゲートの一律追加の理由にはしない。

決定的に判定できる不具合は静的検査やテストへ、推論が要る整合性はAIへ、仕様の意図や期待結果は責任を持つ人の判断へ対応付ける。重要なセキュリティ領域は複数の手段で確かめる。分担しても検証責任は残る。

独立レビューを使う場合、作者は先に自分で確認できる破損・不足を直す。別の実行主体は作者が見落としやすい要求・scope・品質を調べ、同じ確認をただ重ねない。

追加ゲートは既存の保証で検出できない失敗と増分価値を説明できるときに選ぶ。指摘がなくなるまで無条件に反復しない。試作の少数試行は傾向として示し、正式リリースでは必要な強度を改めて判断する。CIは変更した責務と影響範囲に対応させる。

## 出典

現在のprincipleを利用場面へまとめた派生Skill。固定commitの出典：

- [品質ゲートは追加価値で増やす](https://github.com/shu-matsukubo/matsu-second-brain/blob/6442627beba656db0c30953263150099ea8d161b/knowledge/principles/development-process/k-18cd4b4f19159d05.md)
- [品質保証レベルは入口で選ぶ](https://github.com/shu-matsukubo/matsu-second-brain/blob/6442627beba656db0c30953263150099ea8d161b/knowledge/principles/development-process/k-1fd2110eaa47e4f6.md)
- [自己レビューと独立レビューで異なる失敗を検出する](https://github.com/shu-matsukubo/matsu-second-brain/blob/6442627beba656db0c30953263150099ea8d161b/knowledge/principles/development-process/k-12584bf597c40b01.md)
- [品質保証は人間のレビュー対象から設計する](https://github.com/shu-matsukubo/matsu-second-brain/blob/6442627beba656db0c30953263150099ea8d161b/knowledge/principles/development-process/k-5caa30903bcc5de2.md)
