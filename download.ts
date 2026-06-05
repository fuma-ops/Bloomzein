import fs from 'node:fs';
import { pipeline } from 'node:stream/promises';
import unzipper from 'unzipper';

async function downloadAndExtract() {
  const url = 'https://codeload.github.com/fuma-ops/bloom-style-skeleton/zip/refs/heads/main';
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const fileStream = fs.createWriteStream('repo2.zip');
    await pipeline(res.body as any, fileStream);
    console.log('Downloaded. Extracting...');
    await new Promise((resolve, reject) => {
      fs.createReadStream('repo2.zip')
        .pipe(unzipper.Extract({ path: 'repo2' }))
        .on('close', resolve)
        .on('error', reject);
    });
    console.log('Extracted to repo2 folder');
  } catch(e) {
    console.error(e);
  }
}
downloadAndExtract();
