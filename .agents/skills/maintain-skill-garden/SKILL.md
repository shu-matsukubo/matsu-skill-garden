---
name: maintain-skill-garden
description: matsu-skill-gardenで上流knowledgeの思想を取り込み、生成Skillsと改善reportを保守し、独立レビューとCIを通したPR公開を進める。手動保守と承認済みの日次運用に使う。
---

# Skill gardenを育てる

作業場所はこのリポジトリ。生成対象 `skills/` と、この制御Skillを区別する。本人の現在のprincipleを利用場面ごとの判断基準にし、思想を網羅するためだけにSkillを増やさない。

[保守手順](../../../docs/maintenance.md) を読み、CLIが返す一つの次動作を処理する。意味判断には [レビュー観点](../../../docs/review-perspectives.md) を使う。変更を公開するときは [公開手順](../../../docs/publishing.md) を読む。

判断と生成には、その日に利用可能な高性能モデルとhigh程度の推論を選ぶ。公開前には生成と別の実行主体による相当の独立レビューを行う。具体的モデル名をWorkflowに固定しない。

この保守は承認済みの自律運用。毎回の計画承認を加える成果物生成Workflowを呼び出さない。既存の権限範囲で進め、認証失敗、競合、解消できないCI失敗、必要な責任境界の変更は根拠と再開位置を残して停止する。
