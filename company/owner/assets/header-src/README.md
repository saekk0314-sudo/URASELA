# Xヘッダーの元データ

- `header-urasela.html` / `header-ai.html`：1500×500 のヘッダー（URASELA公式 / AI社長ゼロ）
- 書体：Cormorant Garamond・Noto Serif JP・Noto Sans JP（どれも SIL Open Font License 1.1）。`npm install @fontsource/cormorant-garamond @fontsource/noto-serif-jp @fontsource/noto-sans-jp` で入れたフォルダに、このHTMLを置いて書き出す
- 書き出し：`render-headers.cjs`（Playwright。出力先は company/owner/assets）
- X のプロフィールでは左下にアイコンが重なるので、左下（横0〜380・縦330〜500）に文字を置かない
