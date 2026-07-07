import { chromium } from 'playwright-core';
const seed = {
  'bloom:cycle-settings': JSON.stringify({ lastPeriodStart: '2026-06-24', cycleLength: 28, periodLength: 5 }),
  'bloom:cycle-phase': 'follicular', 'bloom:yoga-streak': JSON.stringify({ count: 8 }),
};
const css = '.z-\\[100\\]{display:none!important}.blur-sm{filter:none!important}.pointer-events-none{pointer-events:auto!important}';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [w,h,tag] of [[1280,820,'desktop'],[390,844,'mobile']]) {
  const ctx = await b.newContext({ viewport:{width:w,height:h}, serviceWorkers:'block' });
  await ctx.addInitScript((s)=>{try{for(const[k,v]of Object.entries(s))localStorage.setItem(k,v);}catch{}}, seed);
  const page = await ctx.newPage();
  await page.goto('http://localhost:4332/app/calendar', { waitUntil:'networkidle' });
  await page.waitForTimeout(1000);
  await page.addStyleTag({ content: css }).catch(()=>{});
  await page.waitForTimeout(300);
  await page.getByRole('button').filter({ hasText: /^1(\s|$)/ }).first().click().catch(()=>{});
  await page.waitForTimeout(600);
  const box = await page.locator('text=July 1, text=/July 1/').first().boundingBox().catch(()=>null);
  console.log(`${tag} (${w}x${h}) card left edge x:`, box?.x, 'width:', box?.width);
  await page.screenshot({ path:`/tmp/claude-0/-home-user-Bloomzein/bdc2381e-dfa9-5b03-88ab-cc7e0b1cec44/scratchpad/panel-${tag}.png` });
  await ctx.close();
}
await b.close();
