---
name: review-by-risk
description: 変更の検証方法や品質ゲートを設計するとき、リスクと追加の検出価値から検証強度を決め、機械・AI・人の判断を分担する。
---

# リスクから検証を選ぶ

変更対象の重要度、影響範囲、失敗時の損失、検証で得る価値、時間と認知資源から必要な強度を決める。開発用の仕組みでも破壊や漏えいにつながる操作は高リスクとして扱う。

高コストな品質保証が必要かは入口で決める。品質保証付きWorkflowを選んだら必要な工程を進め、工程ごとに同じ人間確認を繰り返さない。このSkillの利用自体を、新たな独立レビューや承認ゲートの一律追加の理由にはしない。

決定的に判定できる不具合は静的検査やテストへ、推論が要る整合性はAIへ、仕様の意図や期待結果は責任を持つ人の判断へ対応付ける。重要なセキュリティ領域は複数の手段で確かめる。分担しても検証責任は残る。

AI開発基盤では、型検査・Lint・Formatter・構成検査で再現できる判定を先に選び、次に責務と配置・参照関係で判断を助ける。仕様の解釈などには自然言語で判断基準を残す。必要な保証を満たす既存ツールを再利用し、独自検査やGit操作のラッパーは既存手段で埋まらない必要がある場合に絞る。

独立レビューを使う場合、作者は先に自分で確認できる破損・不足を直す。別の実行主体は作者が見落としやすい要求・scope・品質を調べ、同じ確認をただ重ねない。

読み取り専用の独立レビューでは、指示が求める行動、実行環境が防ぐ書き込み、前後の差分で事後に検出できる変更を分ける。標準のサブエージェントを使い、利用できる権限制御を優先する。専用Agentや隔離が任意なら、必要な保証を満たす範囲で続ける。厳格な隔離が必須で確保できない場合は保留し、未実施と報告する。

追加ゲートは既存の保証で検出できない失敗と増分価値を説明できるときに選ぶ。指摘がなくなるまで無条件に反復しない。試作の少数試行は傾向として示し、正式リリースでは必要な強度を改めて判断する。CIは変更した責務と影響範囲に対応させる。

許容できるリスクの範囲でリリースし、実利用の問題と、既存の検証で見逃した理由を集める。そこから必要な検証だけを追加・改善する。AIレビューの指摘がなくなったことを、不具合がない証明にはしない。利用者数や利用方法が変わったら、許容リスクと検証強度も見直す。

## PRを扱うAI開発Workflow

PRを作成・更新したら、GitHub CLIやAPIで最新HEAD SHAと必須CIの結果を照合し、全件の成功まで確認する。未起動・実行中の結果は待つ。失敗時はログから原因を調べ、検証を有効に保ったまま、作業範囲内で修正・検証してPRを更新し、新しいHEAD SHAで確認し直す。待機時間と修正回数に上限を置き、上限到達や復旧不能時は失敗箇所と未完了の状態を報告する。CI後のPRレビューとマージを人が担う開発Workflowでは、その引き継ぎを維持する。

第2の脳のナレッジ統合・メンテナンス・レポート作成でリポジトリを更新するときは、最新のmainから作業ブランチを作り、コミットしてブランチを公開する。main向けPRの最新コミットで必須CIの成功を確認してから、既存の権限と担当の範囲でマージする。

## 出典

- [品質ゲートは追加価値で増やす](https://github.com/shu-matsukubo/matsu-second-brain/blob/15141ff0f69bc38a1923141a1b645a4c358c11cb/knowledge/principles/development-process/k-18cd4b4f19159d05.md)
- [品質保証レベルは入口で選ぶ](https://github.com/shu-matsukubo/matsu-second-brain/blob/15141ff0f69bc38a1923141a1b645a4c358c11cb/knowledge/principles/development-process/k-1fd2110eaa47e4f6.md)
- [自己レビューと独立レビューで異なる失敗を検出する](https://github.com/shu-matsukubo/matsu-second-brain/blob/15141ff0f69bc38a1923141a1b645a4c358c11cb/knowledge/principles/development-process/k-12584bf597c40b01.md)
- [品質保証は人間のレビュー対象から設計する](https://github.com/shu-matsukubo/matsu-second-brain/blob/15141ff0f69bc38a1923141a1b645a4c358c11cb/knowledge/principles/development-process/k-5caa30903bcc5de2.md)
- [品質保証は実運用のフィードバックで調整する](https://github.com/shu-matsukubo/matsu-second-brain/blob/15141ff0f69bc38a1923141a1b645a4c358c11cb/knowledge/principles/development-process/k-2aa29c1ef3b94c4d.md)
- [独立レビューでは行動制約・権限制御・事後検証を区別する](https://github.com/shu-matsukubo/matsu-second-brain/blob/15141ff0f69bc38a1923141a1b645a4c358c11cb/knowledge/principles/development-process/k-23530f4699c05263.md)
- [AI開発基盤の品質保証は機械的な検証を優先する](https://github.com/shu-matsukubo/matsu-second-brain/blob/15141ff0f69bc38a1923141a1b645a4c358c11cb/knowledge/principles/development-process/k-35c3f7d87330d06e.md)
- [AI開発WorkflowはPRの最新コミットで必須CIの成功まで確認する](https://github.com/shu-matsukubo/matsu-second-brain/blob/15141ff0f69bc38a1923141a1b645a4c358c11cb/knowledge/principles/development-process/k-99d67a67388c3389.md)
- [第2の脳の改善は最新のmainから始め、CI成功後にマージする](https://github.com/shu-matsukubo/matsu-second-brain/blob/15141ff0f69bc38a1923141a1b645a4c358c11cb/knowledge/principles/development-process/k-49cf831818d8eefd.md)
