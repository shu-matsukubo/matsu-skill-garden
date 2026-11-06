# matsu-skill-garden

[matsu-second-brain](https://github.com/shu-matsukubo/matsu-second-brain) の `knowledge` にある本人の思想から、利用場面ごとのSkillsを育てるリポジトリ。正本は上流の現在の `principle`。ここではその判断基準を小さく実用化し、変更・降格・撤回に追従する。

- [skills](skills/)：生成した思想Skills。リポジトリ内の成果物であり、インストール環境へ自動配置しない。
- [.agents/skills/maintain-skill-garden](.agents/skills/maintain-skill-garden/SKILL.md)：手動・日次共通の保守入口。
- [state/garden.json](state/garden.json)：固定snapshot、各ファイルの根拠、open/resolved report。本文の複製は持たない。
- [運用手順](docs/maintenance.md)、[レビュー観点](docs/review-perspectives.md)、[公開手順](docs/publishing.md)。

Node.js 22以上と認証済みGitHub CLIが必要。GitHubの参照・PR操作は利用可能なGitHubプラグインを優先し、不足する操作を `gh` で補う。取得失敗や認証失敗を「変更なし」に変換しない。

```sh
npm ci
npm test
npm run check
node scripts/garden.mjs snapshot --output .garden-cache/snapshot.json
node scripts/garden.mjs next --snapshot .garden-cache/snapshot.json
```

保守は `$maintain-skill-garden` を呼ぶ。優先順は未完了journalの再開、上流の全差分を一括取り込み、open report一件、全体評価。日次の取り込みは前回成功時から固定snapshotまでの全件を扱い、knowledge一件ずつには制限しない。課題がなくなればknowledge treeが変わるまで探索を休む。軽量確認では固定commitとtree/blobを比較し、変化した本文だけを取得する。

日次は07:40 Asia/Tokyoを想定する。[スケジューラ用prompt](prompts/maintain-skill-garden.md) は作業場所とSkill呼出しのみを持つ。ローカルPCとCodexアプリが実行可能な状態である必要があり、実行時刻の指定は常駐サーバーの保証ではない。上流の毎時整理とは一回ごとの固定snapshotで整合させる。

初期Skillsは思想の一部を扱う出発点。残候補をreportとして保ち、全思想を網羅済みとは扱わない。独立レビューと最新headのCI成功を経てPRをマージする。外部公開・スケジュール登録は運用担当が行う。
