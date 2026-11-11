# 共通方針の保守

## 正本

| 対象 | 正本 | 根拠・追跡 |
| --- | --- | --- |
| 設計方針 | [skill-design-policy](../skills/skill-design-policy/SKILL.md) | 2026-11-11のユーザー要求 |
| 日本語出力方針 | [japanese-output-policy](../skills/japanese-output-policy/SKILL.md) | 2026-11-11のユーザー要求 |
| 思想Skills | skills内の上記以外のSkill | 固定principleとstate/garden.json |
| ワークスペース運用 | .agents/skills、docs、scripts | Git差分・評価・独立レビュー・CI |

共通Skillはすべてskills内に置く。方針Skillの所在は[設定](../config/skill-policy.json)で宣言し、上流principle由来のprovenanceと区別する。既存のNotion Skillsと管理外のインストール済みSkillsは、この管理対象に含めない。

## 対象

- skillsと.agents/skillsの全Skillを、参照・scriptなどの付属ファイルごと評価する。
- 方針Skill自身も同じ対象一覧に含める。
- 保守機構を`@maintenance`として評価する。scripts、tests、docs、prompts、config、.github、.agents、AGENTS.md、README、package、Git設定を含む。
- stateは評価対象の入力に含めず、状態の整合性を既存のgarden検査で保証する。

## 更新検知

[policies.mjs](../scripts/policies.mjs)を使う。`status`は現行の方針・対象一覧・各対象のdigestと未評価対象を返す。

- 方針または対象一覧が変わった場合、全対象の評価を失効させる。
- 個別Skillまたは保守機構の内容が変わった場合、その対象の評価を失効させる。
- `garden next`は未完了journalの次に`policy`を返し、思想探索の休止中も方針変更を検知する。
- `npm run check`と`garden validate`は未評価を失敗にし、既存CIでも検出する。

## 評価

1. `node scripts/policies.mjs status`で対象とdigestを取得する。
2. 現行の2つの方針Skillを使い、各対象の構造、表現、実行境界、改善価値を確認する。
3. 必要なファイルだけ変更する。思想Skillsは`kind: "policy"`のplanを[保守手順の方針](maintenance.md#変更planと状態)に従って適用する。policy planはsnapshotを維持し、既存reportを解決しない。
4. 最終ファイルで再度statusを取得し、全対象の評価をcache内のJSONへ記録する。
5. `node scripts/policies.mjs record .garden-cache/assessment.json`で保存し、`node scripts/policies.mjs check`で読み戻す。
6. 検査と独立レビューは[公開手順の方針](publishing.md)に従う。

評価JSONは`schemaVersion: 1`、statusの`policyDigest`と`scopeDigest`、`evaluations`を持つ。各評価には対象の`path`と`digest`、`outcome: "updated" | "unchanged"`、具体的な`reason`を記録する。全対象を一回ずつ列挙する。記録だけで意味評価を完了したことにしない。

変更不要なら対象本文を書き換えない。評価後に内容が変われば再評価する。課題は既存reportへ統合し、課題がなければ探索を休止する。

## 同期の範囲

2026-11-11のユーザー要求により、保守中の追加・削除・改名に伴うジャンクション同期を自動実行する。[ローカル設定](../config/local-skills.json)は、正本ワークスペースと登録先を固定する。共通Skillへ同期や外部公開の実行指示を追加しない。

- 正本は`C:\work\10_second-brain\matsu-skill-garden\skills`、登録先は`C:\Users\docha\.codex\skills`とする。
- このWindowsワークスペースだけで同期し、CIや別checkoutでは実行しない。
- .agents/skillsの保守Skillは登録しない。
- 共通環境には本文を複製せず、共通Skill間の相対リンクを維持する。

## 同期の処理

[sync-local-skills.mjs](../scripts/sync-local-skills.mjs)を使う。既存の[link-skills.ps1](../scripts/link-skills.ps1)を使い、次の差分だけ反映する。

| 登録先の状態 | 処理 |
| --- | --- |
| 現行Skillへの正しいジャンクション | 維持する |
| 現行Skillの登録がない | 作成する |
| 廃止Skillの同名・正本直下へのジャンクション | リンクだけ解除する |
| 改名 | 新名を登録し、旧名の管理リンクを解除する |
| 現行名と衝突する通常ディレクトリ・管理外リンク | 変更前に失敗する |
| その他の管理外Skill・ディレクトリ・リンク | 変更しない |

解除対象は、リンク種別と登録先直下の絶対パスを読み直し、参照先が正本直下の同名パスと一致するものに限る。参照先がなくなったジャンクションも判定する。再帰削除は使わず、リンク先の本文は削除しない。正本や登録先がない場合は失敗し、空集合として解除しない。

## 同期の契機

- `garden next`は未完了journalがない場合、方針評価やskipの前に同期する。
- `garden apply`と`garden resume`は、journalの適用完了後に同期する。
- 手書き方針Skillの追加・削除・改名後と、公開後のmain追従後も同期する。
- 同期だけを再試行するときは、次を実行する。

```sh
node scripts/garden.mjs sync-skills
```

生成ファイルへの変更は同期失敗時も保全する。失敗を成功扱いせず、原因を直して同期を再試行する。未完了journalがある間はリンクを変更せず、先にresumeする。

## 認識の検証

同期ごとに[verify-local-skills.mjs](../scripts/verify-local-skills.mjs)を使う。リポジトリ外の一時作業場所を指定し、Codex app-serverの`skills/list`を`forceReload: true`で取得する。

- 現行Skillが名前・正本パス・user scope・有効状態で一致することを確認する。
- 廃止した正本Skillが一覧に残っていないことを確認する。
- 同名の別Skillで認識確認を代替しない。
- Codexの起動失敗・読み込み失敗・タイムアウトは未確認として失敗させる。

この検証はローカル一覧の取得だけを行い、モデルの実行や外部サービスへの書き込みを行わない。
