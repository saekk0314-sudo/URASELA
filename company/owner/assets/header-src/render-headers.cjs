const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const root = '/tmp/claude-0/-home-user/7813b483-772a-5204-a5fc-a01c0f279ec2/scratchpad/fonts';
const out = '/home/user/URASELA/company/owner/assets';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1500, height: 500 }, deviceScaleFactor: 1 });
  await p.route('http://local.test/**', r => r.fulfill({ path: path.join(root, decodeURIComponent(new URL(r.request().url()).pathname)) }));
  for (const [html, png] of [['header-urasela.html', 'x-header-urasela.png'], ['header-ai.html', 'x-header-ai-shacho-zero.png']]) {
    await p.goto('http://local.test/' + html); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
    await p.locator('#h').screenshot({ path: path.join(out, png) });
  }
  // プロフィール画面の見え方（左下にアイコンが重なる）
  const q = await b.newPage({ viewport: { width: 1500, height: 700 }, deviceScaleFactor: 1 });
  const uri = f => 'data:image/png;base64,' + fs.readFileSync(path.join(out, f)).toString('base64');
  const mock = (hdr, icon, name) => `<div style="position:relative;width:1500px;height:700px;background:#fff;font-family:'WenQuanYi Zen Hei'"><img src="${uri(hdr)}" style="width:1500px;height:500px;display:block"><img src="${uri(icon)}" style="position:absolute;left:40px;top:333px;width:335px;height:335px;border-radius:50%;border:10px solid #fff;box-sizing:border-box"><div style="position:absolute;left:400px;top:540px;font-size:44px;font-weight:700">${name}</div></div>`;
  for (const [hdr, icon, name, png] of [['x-header-urasela.png', 'urasela-sns-icon-400.png', 'URASELA（ウラセラ）', 'preview-x-urasela.png'], ['x-header-ai-shacho-zero.png', 'ai-shacho-zero.png', 'AI社長ゼロ', 'preview-x-ai-shacho-zero.png']]) {
    await q.setContent(`<html><body style="margin:0">${mock(hdr, icon, name)}</body></html>`); await q.waitForTimeout(200);
    await q.screenshot({ path: path.join('/tmp/claude-0/-home-user/7813b483-772a-5204-a5fc-a01c0f279ec2/scratchpad', png) });
  }
  await b.close();
})();
