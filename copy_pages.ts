import fs from 'node:fs';
import path from 'node:path';

function copyDir(src: string, dest: string) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      // ignore
    } else if (entry.name.endsWith('.tsx')) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyDir('repo2/bloom-style-skeleton-main/src/routes', 'src/pages');
console.log('copied');
