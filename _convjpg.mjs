import sharp from 'sharp';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';
const ROOT='/home/user/Bloomzein/public/images';
function walk(d){let o=[];for(const e of readdirSync(d,{withFileTypes:true})){const p=join(d,e.name);if(e.isDirectory())o=o.concat(walk(p));else if(/\.jpe?g$/i.test(e.name))o.push(p);}return o;}
const js=walk(ROOT); let ib=0,ob=0,n=0;
for(const p of js){const out=p.replace(/\.jpe?g$/i,'.webp');ib+=statSync(p).size;await sharp(p).resize(1440,1440,{fit:'inside',withoutEnlargement:true}).webp({quality:80}).toFile(out);ob+=statSync(out).size;n++;}
console.log(`Converted ${n} JPG → WebP · ${(ib/1048576).toFixed(1)}MB → ${(ob/1048576).toFixed(1)}MB`);
