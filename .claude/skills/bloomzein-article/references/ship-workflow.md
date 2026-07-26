# Ship workflow

Bloomzein is a Vite + React + TS SPA on Vercel, auto-deploying from `main`
(no CI gate). `npm run build` runs Vite only (no tsc typecheck), so a green
build means it bundles — but exhaustive `Record<Category, …>` maps will fail the
build if a category is missing from one, which is the useful guardrail.

## 1. Build

```bash
cd /home/user/Bloomzein && npm run build 2>&1 | grep -iE "error|✓ built|<category-slug>-"
```

Confirm the category chunk grew (its `<slug>-<hash>.js` size reflects the new
bodies) and there are no errors.

## 2. Screenshot-verify one article

Preview must run in the background or it dies when the shell exits:

```bash
npm run preview > /tmp/preview.log 2>&1 &   # then poll:
for i in $(seq 1 6); do curl -sf http://localhost:4173/app/read -o /dev/null && break || sleep 1; done
```

Drive Chromium with Playwright (pinned path in this environment):

```js
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await p.goto('http://localhost:4173/app/read', { waitUntil: 'networkidle' });
await p.getByText('<a distinctive phrase from the title>', { exact: false }).first().click();
await p.waitForTimeout(1400);
await p.screenshot({ path: '<out>.png', fullPage: true });
await b.close();
```

Then Read the PNG. Check: drop cap, sections, any `@tool` card, `@read` cards,
any `@chart`, and the "Keep reading" row all render. The `?article=<id>` URL
param does *not* open the reader — click the card text instead.

## 3. Ship (rebase-onto-main pattern)

PRs are squash-merged, so the working branch is re-cut from `main` each time:

```bash
git add -A && git commit -q -m "<message>"       # note the SHA
SHA=$(git rev-parse HEAD)
git fetch origin main -q
git checkout -B <designated-branch> origin/main -q
git cherry-pick $SHA
git push -u origin <designated-branch> --force-with-lease
```

Commit-message footer (this environment): end with the `Co-Authored-By:` and
`Claude-Session:` lines the environment specifies. Never put the model ID in the
message.

Then open + merge the PR with the GitHub MCP tools:
`mcp__github__create_pull_request` (base `main`) → `mcp__github__merge_pull_request`
(`merge_method: "squash"`). Every PR body ends with the Claude Code attribution
footer.

## 4. Hand back for review

New articles are live in `status: "review"`, which shows the in-app review panel
(comment box + Validate + "Copy feedback for Claude"). Tell the user the batch
is up, and that they review on the live site, then paste the copied feedback
back into chat.

## 5. Publish / revise on feedback

- **Validated** → remove `, status: "review"` from that article's catalogue
  entry. A `sed` like `s/\(id: "MW001".*\), status: "review",/\1,/` works, or
  edit directly. Rebuild + ship.
- **Needs changes** → revise the body (and/or add a chart), keep it in review,
  rebuild + ship, ask for re-review.

Confirm what's still in review after each pass:
`grep -oE 'id: "[A-Z]+[0-9]+"[^}]*status: "review"' src/lib/readsData.ts`
