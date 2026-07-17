/**
 * Guided "Build your Bloom world" onboarding.
 *
 * Today is the spine: its checklist leads her, one step at a time, into each tool
 * (cycle → meals → diet → movement → mood). Each tool, when she finishes its
 * setup WHILE guided, shows a soft celebration and hands her back to Today, which
 * highlights + scrolls to the next step. When everything's set, Today plays a
 * little finale.
 *
 * The "am I mid-guided-setup?" flag lives in sessionStorage on purpose: it must
 * survive full-page navigations between tools, but must NOT persist across
 * sessions or be touched by the cloud-sync layer (which wraps localStorage only).
 */
const GUIDE_KEY = "bloom:setup-guide";

/** True while she's actively walking the guided setup (set when she taps a step). */
export function isGuided(): boolean {
  try { return sessionStorage.getItem(GUIDE_KEY) === "1"; } catch { return false; }
}

/** Mark that she's in the guided flow — called when she taps a Today checklist step. */
export function startGuide(): void {
  try { sessionStorage.setItem(GUIDE_KEY, "1"); } catch {}
  try { window.dispatchEvent(new Event("bloom:guide-updated")); } catch {}
}

/** Clear the guided flow — called once her world is fully built. */
export function endGuide(): void {
  try { sessionStorage.removeItem(GUIDE_KEY); } catch {}
  try { window.dispatchEvent(new Event("bloom:guide-updated")); } catch {}
}
