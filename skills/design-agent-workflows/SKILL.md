---
name: design-agent-workflows
description: AIワークフローや定期処理を設計するとき、責務、計画レビュー、実行境界を整理し、必要なエージェントとモデルを選ぶ。
---

# Agent workflowを設計する

## 実行の構成

- 実行契機、実行可否、処理順と停止条件、各工程の能力、共有する判断知識を分ける。処理内容が同じなら手動と定期実行で同じWorkflowを使い、起動方法に固有の判断は起動側に置く。上位Workflowは既存の手順を呼び出し、両方の入口に必要な検証を担う。
- 進捗はPR・branch・commit・作業記録から導き、要求・設計・コードなどの永続状態から再開する。追加で保存する状態は安全な非同期の引き継ぎに必要なものに絞る。承認は既存の境界に従い、現行の状態で扱える承認のために工程ごとの待機状態を増やさない。

## 起動と引き継ぎ

- スケジューラを含む実行プロンプトは、目的、呼び出すSkill、作業場所、今回の指定に絞る。繰り返し使う手順と判断条件はSkillかその参照資料に置く。Skillを参照できない環境では、実行に必要な手順と接続先をプロンプトに含める。認証情報の扱いは既存の権限と保管方法に従う。
- 本人の個人運用でAgentの交代や別セッションへの引き継ぎを設計するときは、個人用の運用ガイドを用意し、引き継ぎに必要な記憶・成果物・SkillをNotionの承認済みの共有先で参照できるようにする。

## 計画と役割

- 計画をレビューする構成では、親Agentが既存コードと要求を確認し、ユーザーとの対話を持ったまま仕様をタスクへ分ける。独立Reviewerには仕様の具体性、要求の網羅、粒度、依存と競合を確認してもらう。親Agentが修正・追加質問・計画提示を担当する。
- 親・Worker・Reviewerに分ける構成では、親Agentが重要な設計判断と実装に必要な情報をタスクに残す。明確になった実装は原則Workerに任せ、親Agentが統合し、Reviewerが独立して成果物を確認する。会話履歴を前提とせず引き継げる記述にする。独立したタスクは並行でき、Workerには必要な品質を満たす範囲で低コストのモデルを選べる。軽微な変更は直接実装も比較し、実行時間、利用枠、品質、手戻りで委譲の効果を測る。
- 専門知識は、まずSkillや判断基準として既存Agentに渡せるか検討する。独立した文脈やレビュー、並列化、権限や環境の分離による利点を、引き継ぎ、同期、実行時間、トークン、責務管理、統合の負担と比べて実行主体を分ける。
- モデルはタスクの難しさと必要な品質から選ぶ。判断や曖昧な設計には推論力を、手順が明確な反復作業には品質を満たす範囲で速度とコストを重視する。独立レビューは正確性、相談は問題に応じた推論力を重視する。Workflowは必要な能力を指定し、具体的なモデルはAgent設定か実行時に選ぶ。明示指定ができない環境では既定設定を使う。エスカレーションでは、選んだモデル名と選定理由を記録する。明示指定ができなければ、既定設定を継承したこととその理由を記録する。

## 実行境界と評価

- Policyで変更対象、実行前の条件、承認範囲、禁止する結果を定める。危険な操作はどの手段でも共通の経路で対象・権限・操作内容を事前検証し、重要な制約を実行時にも強制する。外部公開では、フック、Git側の権限、公開前の秘密情報検査などを組み合わせ、経路を変えた場合も制約が効くか確かめる。
- 効果は成果物の品質、探索量、やり直し、完了時間で見る。Workflowの有無を比べるときは同じモデルと推論条件、同じ初期状態を使い、複数の小課題で確かめる。

## 出典

- [AIフローでは能力・制御・判断知識を分離する](https://github.com/shu-matsukubo/matsu-second-brain/blob/15141ff0f69bc38a1923141a1b645a4c358c11cb/knowledge/principles/development-process/k-1c336721577e40fb.md)
- [Workflowの状態は既存成果物から導出する](https://github.com/shu-matsukubo/matsu-second-brain/blob/15141ff0f69bc38a1923141a1b645a4c358c11cb/knowledge/principles/development-process/k-0befd2ddf54d4781.md)
- [Agentは必要最小限にし専門性は知識で拡張する](https://github.com/shu-matsukubo/matsu-second-brain/blob/15141ff0f69bc38a1923141a1b645a4c358c11cb/knowledge/principles/development-process/k-3953b9c0e4266be4.md)
- [Workflowは実行契機から独立させる](https://github.com/shu-matsukubo/matsu-second-brain/blob/15141ff0f69bc38a1923141a1b645a4c358c11cb/knowledge/principles/development-process/k-cfb0bb408a84ca5f.md)
- [エージェントのモデルは責務に応じて選ぶ](https://github.com/shu-matsukubo/matsu-second-brain/blob/15141ff0f69bc38a1923141a1b645a4c358c11cb/knowledge/principles/development-process/k-f1b6da308d1daaf7.md)
- [AIチャットは永続状態の更新境界で切り替える](https://github.com/shu-matsukubo/matsu-second-brain/blob/15141ff0f69bc38a1923141a1b645a4c358c11cb/knowledge/principles/development-process/k-ed9431132a1300be.md)
- [AI Workflowは探索量と完了時間で評価する](https://github.com/shu-matsukubo/matsu-second-brain/blob/15141ff0f69bc38a1923141a1b645a4c358c11cb/knowledge/principles/development-process/k-cb4b907775bc93a7.md)
- [仕様理解とタスク分解は親Agentが担当し計画を独立レビューする](https://github.com/shu-matsukubo/matsu-second-brain/blob/15141ff0f69bc38a1923141a1b645a4c358c11cb/knowledge/principles/development-process/k-259092392aa4081c.md)
- [AIの操作制約はPolicyで結果を制限する](https://github.com/shu-matsukubo/matsu-second-brain/blob/15141ff0f69bc38a1923141a1b645a4c358c11cb/knowledge/principles/development-process/k-c7312886320ad33f.md)
- [親Agentの判断をタスクに残し実装をWorkerに委譲する](https://github.com/shu-matsukubo/matsu-second-brain/blob/15141ff0f69bc38a1923141a1b645a4c358c11cb/knowledge/principles/development-process/k-5466f5c53ed15e3d.md)
- [実行プロンプトは簡潔にし、継続的な手順はSkillに置く](https://github.com/shu-matsukubo/matsu-second-brain/blob/15141ff0f69bc38a1923141a1b645a4c358c11cb/knowledge/principles/development-process/k-a44acbf0d76b5cf8.md)
- [エージェント間の作業引き継ぎにNotionを使う](https://github.com/shu-matsukubo/matsu-second-brain/blob/15141ff0f69bc38a1923141a1b645a4c358c11cb/knowledge/principles/development-process/k-035d85d9659d8d5b.md)
