# URASELA（ウラセラ）

「表だけじゃ、あなたはわからない。」

5つの占術と24問の深層質問から、16種類の表キャラと16種類の裏キャラを導き出す、登録不要・完全無料の自己分析Webアプリです。

## 機能

- 生年月日・出生地・任意の出生時間と、直感で選ぶカードを使う5占術
- 24問の深層質問と25%・50%・75%のクロス解析演出
- 選んで引く大アルカナ22枚の「過去・現在・近未来」タロット
- 表16タイプ × 裏16タイプ = 256通りの組み合わせ診断
- 16キャラ図鑑、恋愛・友達・仕事の相性診断、SNS共有用画像生成
- 16キャラの検索・SNS流入用URL（`/characters/<slug>/`）
- **2027年の表と裏の運勢**（`/2027/` と診断結果画面）: 数秘術の個人年数で「表のテーマ」、九星気学の2027年の年盤で「裏のテーマ」、個人月数で12ヶ月のリズムと勝負の月を出す。診断済みなら表キャラ・裏キャラの言葉も重ねる。運勢カード画像の保存・共有に対応
- 結果画面の目次（2027年・クロス解析・5つの占術・本質・相性へジャンプ）
- 法人・クリエイター向けの診断コンテンツ制作ページ（`/studio/`）
- 有料コンテンツ・月額会員・アフィリエイトの導線（URLを設定したときだけ表示）
- Web Share API・X・LINE・コピーに対応した結果共有
- GA4イベント計測、Cookie同意、AdSense広告枠の導入準備
- OGP・構造化データ・sitemap・robots・法務固定ページ
- iPhone Safariを含むレスポンシブ対応
- すべてブラウザ内で計算し、入力情報を外部送信しない

## 開発

```bash
npm run dev
npm test
npm run build
```

依存パッケージはありません。`npm run build` で `dist/` に静的サイトを生成します。

## Cloudflare Pages

- Framework preset: `None`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: 空欄（リポジトリ直下）
- Production branch: `main`

環境変数が未設定でもビルドと診断は正常に動作します。Google Analytics・広告は、正しいIDを設定した時だけ、ユーザーの同意後に読み込まれます。架空IDや審査前の広告は表示されません。

### アクセス解析

Cloudflare Pagesの「Settings → Environment variables」で次を設定し、再デプロイします。

| 変数 | 値 |
| --- | --- |
| `SITE_URL` | `https://urasela.pages.dev`（独自ドメイン移行時に変更） |
| `GA_MEASUREMENT_ID` | GA4ウェブストリームの測定ID（`G-`から始まる値） |

GA4では、診断開始・24問完了・5占術完了・結果表示・共有までをイベントで計測します。詳細分析には、GA4管理画面で次のイベントスコープのカスタムディメンションを必要なものだけ登録します。

- `screen_name`
- `method`
- `surface_type`
- `inner_type`
- `combination_code`
- `character_type`
- `mode`

生年月日、出生地、回答、自由記述などの診断入力は解析へ送信しません。

### 有料コンテンツ・月額会員・アフィリエイト・法人窓口

設定したものだけがサイトに表示されます。未設定なら何も表示されません（診断はすべて無料のまま）。

| 変数 | 用途 |
| --- | --- |
| `YEAR_REPORT_URL` | 年運の完全版（有料記事など）のURL。年運セクションに「有料」表示つきで出る |
| `PLUS_URL` | 月額会員 URASELA PLUS のURL。「月額」表示つきで出る |
| `AFFILIATE_URL` / `AFFILIATE_TITLE` / `AFFILIATE_TEXT` | 結果画面のアフィリエイト枠。「PR」表示と `rel="sponsored"` つきで出る |
| `STUDIO_CONTACT_URL` | `/studio/` の「制作を相談する」ボタンの宛先（`https://` か `mailto:`）。未設定ならお問い合わせページ |

URLは `https://` で始まるものだけ受け付けます。

### AdSense導入準備

審査・広告ユニット作成後に限り、次の環境変数を設定します。未設定の枠はHTML上でも非表示です。

| 変数 | 用途 |
| --- | --- |
| `ADSENSE_CLIENT_ID` | `ca-pub-`から始まるクライアントID |
| `ADSENSE_PUBLISHER_ID` | `pub-`から始まるパブリッシャーID（`ads.txt`生成用、未指定時はURASELAの正式ID） |
| `ADSENSE_SLOT_HOME_BOTTOM` | トップページ下部 |
| `ADSENSE_SLOT_POST_QUESTIONS` | 24問完了後 |
| `ADSENSE_SLOT_DIVINATIONS` | 占術結果の間 |
| `ADSENSE_SLOT_RESULT_MIDDLE` | 最終結果中盤 |
| `ADSENSE_SLOT_COMPATIBILITY_BOTTOM` | 相性診断結果下 |

質問回答中、タロット選択中、重要ボタン直前には広告を置きません。

## SEO・固定ページ

ビルド時に `robots.txt`、`sitemap.xml`、`ads.txt`、セキュリティヘッダー、16キャラの個別ページ、`/2027/`（年運）、`/studio/`（法人向け）、以下の固定ページを生成します。

- `/about/`
- `/privacy/`
- `/disclaimer/`
- `/contact/`
- `/terms/`

キャラ個別URLは実ファイルとして生成されるため、Cloudflare PagesとGitHub Pagesのどちらでも再読み込み時に404になりません。

## 計算について

四柱推命は立春基準の年柱・節入り近似の月柱・ユリウス通日による日柱・入力時のみ時柱、占星術は太陽・月・水星・金星・火星の黄経近似計算、数秘術は運命数・誕生日数・個人年数、九星気学は立春基準の本命星・節入り近似の月命星・年盤サイクルを使用します。タロットは大アルカナ22枚をシャッフルし、過去・現在・近未来で選んだ3枚の正逆と位置を性質スコアへ反映します。出生時間が未入力でも、時柱だけを除いて結果が欠落しない設計です。
