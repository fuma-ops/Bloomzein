import { defineConfig, type Plugin } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import tsconfigPaths from "vite-tsconfig-paths"
import { VitePWA } from "vite-plugin-pwa"
import { writeFileSync, mkdirSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { blogPaths } from "./src/lib/blog"
import { blogPages, blogIndexPage, type BlogPage } from "./src/lib/prerenderContent"

// Regenerate public/sitemap.xml from the live content on every build so new
// blog articles are always discoverable by Google without hand-editing.
function sitemapPlugin(): Plugin {
  const SITE = "https://www.bloomzein.com"
  const staticEntries: { loc: string; changefreq: string; priority: string }[] = [
    { loc: "/", changefreq: "weekly", priority: "1.0" },
    { loc: "/blog", changefreq: "daily", priority: "0.9" },
    { loc: "/guides", changefreq: "monthly", priority: "0.8" },
    { loc: "/guides/cycle-syncing", changefreq: "monthly", priority: "0.7" },
    { loc: "/guides/eating-for-your-cycle", changefreq: "monthly", priority: "0.7" },
    { loc: "/guides/cycle-synced-workouts", changefreq: "monthly", priority: "0.7" },
    { loc: "/faq", changefreq: "monthly", priority: "0.6" },
    { loc: "/help", changefreq: "monthly", priority: "0.5" },
    { loc: "/privacy", changefreq: "yearly", priority: "0.3" },
    { loc: "/terms", changefreq: "yearly", priority: "0.3" },
  ]
  const build = () => {
    const blog = blogPaths().map((loc) => ({ loc, changefreq: "monthly", priority: "0.6" }))
    const rows = [...staticEntries, ...blog]
      .map((e) => `  <url><loc>${SITE}${e.loc}</loc><changefreq>${e.changefreq}</changefreq><priority>${e.priority}</priority></url>`)
      .join("\n")
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows}\n</urlset>\n`
    writeFileSync("public/sitemap.xml", xml)
  }
  return { name: "bloomzein-sitemap", buildStart() { build() } }
}

// Prerender the public blog into real HTML files at build time. The app is a
// client-rendered SPA, so without this a crawler/social scraper fetching
// /blog/<slug> gets an empty shell. We take the built dist/index.html as the
// template, swap in each article's <title>/description/canonical/OpenGraph tags
// and inject the article text into #root — so Google indexes the words and
// social cards show the right title + image. React still boots and re-renders
// #root for the live reader. On Vercel a real file at the path is served in
// place of the SPA rewrite, so these win over the catch-all fallback.
function prerenderBlogPlugin(): Plugin {
  const SITE = "https://www.bloomzein.com"
  const abs = (p: string) => (p.startsWith("http") ? p : SITE + p)
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

  const renderPage = (tpl: string, page: BlogPage, isArticle: boolean): string => {
    const title = `${page.title} — Bloomzein`
    const img = abs(page.imagePath)
    const url = abs(page.urlPath)
    let html = tpl
    // <title>
    html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
    // description
    html = html.replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(page.description)}" />`)
    // canonical
    html = html.replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${esc(url)}" />`)
    // Open Graph
    html = html.replace(/<meta property="og:type"[^>]*>/, `<meta property="og:type" content="${isArticle ? "article" : "website"}" />`)
    html = html.replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${esc(title)}" />`)
    html = html.replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${esc(page.description)}" />`)
    html = html.replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${esc(url)}" />`)
    html = html.replace(/<meta property="og:image"[^>]*>/, `<meta property="og:image" content="${esc(img)}" />`)
    // Twitter
    html = html.replace(/<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${esc(title)}" />`)
    html = html.replace(/<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${esc(page.description)}" />`)
    html = html.replace(/<meta name="twitter:image"[^>]*>/, `<meta name="twitter:image" content="${esc(img)}" />`)
    // Article JSON-LD (helps Google understand it as an article)
    if (isArticle) {
      const ld = {
        "@context": "https://schema.org", "@type": "Article",
        headline: page.title, description: page.description,
        image: img, url, publisher: { "@type": "Organization", name: "Bloomzein" },
        mainEntityOfPage: url,
      }
      html = html.replace(/<\/head>/, `  <script type="application/ld+json">${JSON.stringify(ld)}</script>\n  </head>`)
    }
    // Inject the static article content for crawlers (React replaces it on boot).
    html = html.replace(/<div id="root">\s*<\/div>/, `<div id="root">${page.contentHtml}</div>`)
    return html
  }

  return {
    name: "bloomzein-prerender-blog",
    apply: "build",
    closeBundle() {
      const dist = "dist"
      let tpl: string
      try { tpl = readFileSync(join(dist, "index.html"), "utf8") } catch { return }
      const pages = [blogIndexPage(), ...blogPages()]
      let n = 0
      for (const page of pages) {
        const isArticle = page.urlPath !== "/blog"
        const outPath = join(dist, page.filePath)
        try {
          mkdirSync(dirname(outPath), { recursive: true })
          writeFileSync(outPath, renderPage(tpl, page, isArticle))
          n++
        } catch { /* skip a bad page rather than fail the build */ }
      }
      // eslint-disable-next-line no-console
      console.log(`[prerender] wrote ${n} blog HTML files`)
    },
  }
}

export default defineConfig({
  base: "/",
  publicDir: "public",
  plugins: [
    sitemapPlugin(),
    prerenderBlogPlugin(),
    react(),
    tailwindcss(),
    tsconfigPaths(),
    VitePWA({
      registerType: "autoUpdate",
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      injectManifest: {
        // No asset precaching — SW is push-notification-only.
        globPatterns: [],
      },
      includeAssets: ["apple-touch-icon.png", "pwa-192x192.png", "pwa-512x512.png"],
      manifest: {
        name: "Bloomzein",
        short_name: "Bloomzein",
        description: "Your softest era starts here ✿",
        theme_color: "#FF69B4",
        background_color: "#fff0f3",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        // Installed app opens straight into the app (Today). AuthGate then shows
        // Today for a signed-in member, or the sign-in for a logged-out visitor —
        // so members never land on the marketing page from the installed app.
        start_url: "/app/today",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // Split the stable framework code into its own long-cached chunk so
        // app updates don't force users to re-download React on every deploy.
        manualChunks: {
          "react-vendor": ["react", "react-dom"],
        },
      },
    },
  },
  server: {
    hmr: process.env.DISABLE_HMR !== 'true',
    watch: process.env.DISABLE_HMR === 'true' ? null : {},
  },
})
