---
name: design-agent-workflows
description: AI workflowや定期処理を設計・見直すとき、能力・制御・判断知識を分離し、既存成果物から再開できる薄い運用を組み立てる。
---

# Agent workflowを設計する

新しいAI運用や定期処理では、実行契機、実行可否の判断、処理順と停止条件、各工程の実行能力、共有する判断知識を分ける。上位Workflowへ既存の実装・レビュー手順を複製せず、手動と定期実行で同じ処理を使う。

専門性はまずSkill・Reference・レビュー観点として既存Agentへ渡せるか考える。別の実行主体が必要な場合だけAgentを増やし、選択・同期・統合コストも比べる。判断や曖昧な設計には高性能モデル、明確な反復作業には必要な能力を満たす軽量モデルを検討する。具体的モデル名はWorkflowへ固定せず実行環境の対応付けに置く。

進捗はPR・branch・commit・作業記録から導出し、同じ状態のラベルを重ねない。会話自体を正本にせず、要求・設計・コード等の有効な永続状態から再開できるようにする。工程をすべて状態機械にせず、非同期の引継ぎに必要な状態だけ保存する。既存の承認境界は尊重し、新しい承認状態を慣習で増やさない。

効果は成果物の品質に加え、探索量・やり直し・完了時間で見る。Workflowの有無を比べるときは同じモデルと推論条件、同じ初期状態を使い、複数の小課題で確かめる。少数の結果を普遍的な性能差として断定しない。

## 出典

現在のprincipleを利用場面へまとめた派生Skill。固定commitの出典：

- [AIフローでは能力・制御・判断知識を分離する](https://github.com/shu-matsukubo/matsu-second-brain/blob/6442627beba656db0c30953263150099ea8d161b/knowledge/principles/development-process/k-1c336721577e40fb.md)
- [Workflowの状態は既存成果物から導出する](https://github.com/shu-matsukubo/matsu-second-brain/blob/6442627beba656db0c30953263150099ea8d161b/knowledge/principles/development-process/k-0befd2ddf54d4781.md)
- [Agentは必要最小限にし専門性は知識で拡張する](https://github.com/shu-matsukubo/matsu-second-brain/blob/6442627beba656db0c30953263150099ea8d161b/knowledge/principles/development-process/k-3953b9c0e4266be4.md)
- [Workflowは実行契機から独立させる](https://github.com/shu-matsukubo/matsu-second-brain/blob/6442627beba656db0c30953263150099ea8d161b/knowledge/principles/development-process/k-cfb0bb408a84ca5f.md)
- [エージェントのモデルは責務に応じて選ぶ](https://github.com/shu-matsukubo/matsu-second-brain/blob/6442627beba656db0c30953263150099ea8d161b/knowledge/principles/development-process/k-f1b6da308d1daaf7.md)
- [AIチャットは永続状態の更新境界で切り替える](https://github.com/shu-matsukubo/matsu-second-brain/blob/6442627beba656db0c30953263150099ea8d161b/knowledge/principles/development-process/k-ed9431132a1300be.md)
- [AI Workflowは探索量と完了時間で評価する](https://github.com/shu-matsukubo/matsu-second-brain/blob/6442627beba656db0c30953263150099ea8d161b/knowledge/principles/development-process/k-cb4b907775bc93a7.md)
