// Google AdSense configuration.
//
// Ads are shown to FREE users only — <AdSlot> renders nothing for Bloom+ users.
// The loader script lives in index.html. We use MANUAL ad units (not Auto ads)
// so premium users never see ads; create each ad unit in the AdSense dashboard
// and paste its slot ID below. An empty slot id = that placement is inert.
export const AD_CLIENT = "ca-pub-8156754023993120";

export const AD_SLOTS = {
  /** Bottom of a blog article. */
  article: "",
  /** On a public /tools/<slug> landing page. */
  tool: "",
  /** Inside the free app experience. */
  app: "",
};
