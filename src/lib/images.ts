// All images imported as Vite-processed assets so they land in dist/assets/
// with content hashes — bypasses any Vercel routing issues with /images/*.
const raw = import.meta.glob<string>('../assets/*.{png,jpg,jpeg,gif,webp,svg}', {
  eager: true,
  import: 'default',
})

const MAP: Record<string, string> = {}
for (const [path, url] of Object.entries(raw)) {
  const filename = path.split('/').pop() ?? ''
  if (filename) MAP[filename] = url
}

/** Resolve an image filename or /images/... path to its Vite-processed URL. */
export function img(src: string): string {
  const filename = src.split('/').pop() ?? src
  return MAP[filename] ?? src
}
