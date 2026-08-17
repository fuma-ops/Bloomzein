import { defineConfig, type Plugin } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import tsconfigPaths from "vite-tsconfig-paths"
import { VitePWA } from "vite-plugin-pwa"
import { writeFileSync } from "node:fs"
import { blogPaths } from "./src/lib/blog"

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

export default defineConfig({
  base: "/",
  publicDir: "public",
  plugins: [
    sitemapPlugin(),
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
