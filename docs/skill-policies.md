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

## 登録

ユーザーが共通Skillの登録を依頼したときだけ、[link-skills.ps1](../scripts/link-skills.ps1)を使う。

```powershell
pwsh -NoProfile -File scripts/link-skills.ps1
```

- skillsの各Skillを`C:\Users\docha\.codex\skills`へディレクトリのシンボリックリンクで登録する。
- .agents/skillsの保守Skillは共通環境へ登録しない。
- 同名の既存Skillを上書きしない。同じ正本へのリンクは再利用する。
- Windowsが管理者権限を要求する場合は停止する。ユーザーが代替を選んだ場合だけ、`-LinkType Junction`でディレクトリジャンクションを作成する。
- 追加・削除・改名後のリンク変更も明示依頼の範囲で扱い、自律保守では登録先を変更しない。
- `skills/list`のforceReloadで全Skillの認識を確認し、別の読み取り専用Codex実行で方針Skillの使用を確認する。

共通Skill間の相対リンクは同じskills階層を前提とする。正本はrepo内の実体であり、共通環境には本文を複製しない。
