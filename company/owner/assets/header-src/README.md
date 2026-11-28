# Xヘッダーの元データ

- `header-urasela.html` / `header-ai.html`：1500×500 のヘッダー（URASELA公式 / AI社長ゼロ）
- 書体：Cormorant Garamond・Noto Serif JP・Noto Sans JP（どれも SIL Open Font License 1.1）。`npm install @fontsource/cormorant-garamond @fontsource/noto-serif-jp @fontsource/noto-sans-jp` で入れたフォルダに、このHTMLを置いて書き出す
- 書き出し：`render-headers.cjs`（Playwright。出力先は company/owner/assets）
- X のプロフィールでは左下にアイコンが重なるので、左下（横0〜380・縦330〜500）に文字を置かない

## 投稿用の画像（`../post-images/`）

- `postimg.mjs`：URASELAの投稿画像（noteの見出し 1280×670、Xの投稿 1200×675）。勝負の月・休む月・本命星の宮は、サイトと同じ計算プログラム（`src/engine.js`）から入れる
- `aiimg.mjs`：AI社長ゼロの投稿画像（X 8枚・note第1話）と、特商法の記事の見出し
- 書き出し：`node postimg.mjs <フォントを入れたフォルダ> <出力先>`（`aiimg.mjs` も同じ）。出力先に `note/` と `x/` を作っておく
- 画像に載せる文字は、法務チェック済みの文面から取る。新しい言い回しを足したら、公開前に法務チェックにかける
