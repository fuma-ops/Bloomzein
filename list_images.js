import fs from "fs";
import path from "path";

function walk(dir, files = []) {
  fs.readdirSync(dir).forEach(f => {
    let p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, files);
    else if (p.endsWith('.tsx') || p.endsWith('.ts')) files.push(p);
  });
  return files;
}

const allFiles = walk('./src');
const images = new Set();
const regex = /\/images\/[a-zA-Z0-9_-]+\.(png|jpg)/g;

for(let f of allFiles) {
  let text = fs.readFileSync(f, 'utf8');
  let match;
  while ((match = regex.exec(text)) !== null) {
    images.add(match[0]);
  }
}

console.log(Array.from(images).sort().join('\n'));
