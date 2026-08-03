/**
 * upscale-videos.mjs — Pose-clip upscaler (720p → 1080p, integrated).
 *
 * Bloomzein pose/workout demo clips play in a `<video loop muted>` during a
 * flow. Some are authored at 720p; this tool re-encodes them to a sharper
 * target height (default 1080p) while preserving everything the player relies
 * on: the seamless loop (no frames added/dropped), exact duration, 30fps,
 * silent track, H.264 High / yuv420p, and a +faststart moov for instant start.
 *
 * It is NOT AI super-resolution — at ×1.5 (720→1080) a good Lanczos scale plus
 * a light unsharp gives a clean, sharper result without inventing detail.
 *
 * Usage:
 *   node upscale-videos.mjs [options]
 *   npm run videos:upscale -- [options]
 *
 * Options:
 *   --src <dir>     Source directory of .mp4 files   (default: public/videos)
 *   --out <dir>     Output directory                 (default: same as --src, in-place upgrade)
 *   --height <n>    Target height in px              (default: 1080)
 *   --only <slugs>  Comma-separated basenames to process, e.g. pose-tree,pose-boat
 *   --crf <n>       x264 quality, lower = better     (default: 18)
 *   --backup        Keep the original next to it as "<name>.orig.mp4"
 *   --force         Re-encode even if already >= target height
 *   --dry-run       Show what would happen; write nothing
 *
 * Idempotent: files already at/above the target height are skipped unless --force.
 * Requires devDependencies "ffmpeg-static" and "ffprobe-static" (npm install).
 */
import { readdirSync, statSync, renameSync, existsSync, copyFileSync, unlinkSync } from "node:fs";
import { join, basename } from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const FFMPEG = require("ffmpeg-static");
const FFPROBE = require("ffprobe-static").path;

// ── args ────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const o = {
    src: "public/videos",
    out: null,
    height: 1080,
    only: null,
    crf: 18,
    backup: false,
    force: false,
    dryRun: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === "--src") o.src = next();
    else if (a === "--out") o.out = next();
    else if (a === "--height") o.height = parseInt(next(), 10);
    else if (a === "--only")
      o.only = new Set(
        next()
          .split(",")
          .map((s) => s.trim().replace(/\.mp4$/i, "")),
      );
    else if (a === "--crf") o.crf = parseInt(next(), 10);
    else if (a === "--backup") o.backup = true;
    else if (a === "--force") o.force = true;
    else if (a === "--dry-run") o.dryRun = true;
    else if (a === "-h" || a === "--help") {
      printHelp();
      process.exit(0);
    } else {
      console.error(`Unknown option: ${a}`);
      process.exit(2);
    }
  }
  o.out ??= o.src;
  if (!Number.isFinite(o.height) || o.height < 2) {
    console.error("--height must be a positive number");
    process.exit(2);
  }
  return o;
}
function printHelp() {
  console.log(
    [
      "Pose-clip upscaler (720p → 1080p). See the header comment for full docs.",
      "",
      "  node upscale-videos.mjs                    # 720p→1080p in place (public/videos)",
      "  node upscale-videos.mjs --dry-run          # preview only, write nothing",
      "  node upscale-videos.mjs --only pose-tree   # one clip, with --backup to keep the original",
      "  npm run videos:upscale -- --height 1080",
      "",
      "Options: --src --out --height --only --crf --backup --force --dry-run",
    ].join("\n"),
  );
}

// ── ffprobe ─────────────────────────────────────────────────────────────────
function probe(file) {
  const r = spawnSync(
    FFPROBE,
    [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height,nb_read_packets",
      "-show_entries",
      "format=duration",
      "-count_packets",
      "-of",
      "json",
      file,
    ],
    { encoding: "utf8" },
  );
  if (r.status !== 0) throw new Error(`ffprobe failed on ${file}: ${r.stderr || r.error}`);
  const j = JSON.parse(r.stdout);
  const s = (j.streams && j.streams[0]) || {};
  return {
    width: Number(s.width),
    height: Number(s.height),
    frames: Number(s.nb_read_packets) || null,
    duration: Number(j.format?.duration) || null,
  };
}

// even integer (x264 requires even dimensions for yuv420p)
const even = (n) => Math.max(2, Math.round(n / 2) * 2);
const mb = (bytes) => (bytes / 1048576).toFixed(2) + "MB";

// ── main ────────────────────────────────────────────────────────────────────
const opt = parseArgs(process.argv.slice(2));
if (!existsSync(opt.src)) {
  console.error(`Source dir not found: ${opt.src}`);
  process.exit(1);
}

const files = readdirSync(opt.src)
  .filter((f) => /\.mp4$/i.test(f))
  .filter((f) => !/\.orig\.mp4$/i.test(f)) // never re-process our own backups
  .filter((f) => !opt.only || opt.only.has(basename(f, ".mp4")))
  .sort();

if (files.length === 0) {
  console.log("No matching .mp4 files.");
  process.exit(0);
}

console.log(
  `Upscaler → ${opt.height}p  (src: ${opt.src}${opt.out !== opt.src ? `, out: ${opt.out}` : ", in place"})`,
);
console.log(`ffmpeg: ${FFMPEG}\n`);

let done = 0,
  skipped = 0,
  failed = 0,
  inBytes = 0,
  outBytes = 0;

for (const f of files) {
  const inPath = join(opt.src, f);
  const outPath = join(opt.out, f);
  let info;
  try {
    info = probe(inPath);
  } catch (e) {
    console.log(`✗ ${f}  (probe error: ${e.message})`);
    failed++;
    continue;
  }

  if (!opt.force && info.height >= opt.height) {
    console.log(`• ${f}  ${info.width}×${info.height}  already ≥ ${opt.height}p — skip`);
    skipped++;
    continue;
  }

  const targetH = opt.height;
  const targetW = even((info.width / info.height) * targetH);
  const label = `${info.width}×${info.height} → ${targetW}×${targetH}`;

  if (opt.dryRun) {
    console.log(`~ ${f}  ${label}  (dry-run)`);
    done++;
    continue;
  }

  const tmp = join(opt.out, `.${f}.tmp-${process.pid}.mp4`);
  // scale (Lanczos) + light luma-only unsharp; strip audio; preserve frames/timing.
  const vf = `scale=${targetW}:${targetH}:flags=lanczos,unsharp=5:5:0.5:5:5:0.0,format=yuv420p`;
  const args = [
    "-y",
    "-i",
    inPath,
    "-an", // silent (matches existing clips)
    "-vf",
    vf,
    "-fps_mode",
    "passthrough", // keep original frames → seamless loop preserved
    "-c:v",
    "libx264",
    "-profile:v",
    "high",
    "-preset",
    "slow",
    "-crf",
    String(opt.crf),
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    tmp,
  ];
  const r = spawnSync(FFMPEG, args, { encoding: "utf8" });
  if (r.status !== 0) {
    console.log(`✗ ${f}  (ffmpeg error)\n${(r.stderr || "").split("\n").slice(-4).join("\n")}`);
    try {
      if (existsSync(tmp)) unlinkSync(tmp);
    } catch {}
    failed++;
    continue;
  }

  // verify the loop invariant: frame count must be unchanged.
  let outInfo;
  try {
    outInfo = probe(tmp);
  } catch (e) {
    console.log(`✗ ${f}  (verify error: ${e.message})`);
    try {
      unlinkSync(tmp);
    } catch {}
    failed++;
    continue;
  }
  if (info.frames && outInfo.frames && info.frames !== outInfo.frames) {
    console.log(
      `✗ ${f}  frame count changed ${info.frames}→${outInfo.frames} (loop at risk) — kept original`,
    );
    try {
      unlinkSync(tmp);
    } catch {}
    failed++;
    continue;
  }

  if (opt.backup && outPath === inPath) {
    const bak = inPath.replace(/\.mp4$/i, ".orig.mp4");
    if (!existsSync(bak)) copyFileSync(inPath, bak);
  }
  const before = statSync(inPath).size;
  renameSync(tmp, outPath);
  const after = statSync(outPath).size;
  inBytes += before;
  outBytes += after;
  console.log(
    `✓ ${f}  ${label}  ${mb(before)} → ${mb(after)}${info.frames ? `  (${info.frames}f, loop preserved)` : ""}`,
  );
  done++;
}

console.log(
  `\nDone: ${done} upscaled, ${skipped} skipped, ${failed} failed` +
    (outBytes ? `  ·  ${mb(inBytes)} → ${mb(outBytes)}` : ""),
);
process.exit(failed ? 1 : 0);
