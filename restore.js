import fs from "fs";

function restore(file) {
  if (!fs.existsSync(file)) return;
  let text = fs.readFileSync(file, 'utf8');
  let newText = text
    .replace(/"https:\/\/picsum\.photos\/seed\/([^/]+)\/800\/800"/g, "\"/images/$1.png\"")
    .replace(/"https:\/\/api\.dicebear\.com\/8\.x\/shapes\/svg\?seed=([^"]+)"/g, "\"/images/$1.png\"")
    .replace(/"https:\/\/api\.dicebear\.com\/8\.x\/notionists\/svg\?seed=bloom"/g, "\"/images/me-avatar.png\"")
    .replace(/"https:\/\/picsum\.photos\/seed\/me-header\/800\/400"/g, "\"/images/me-header.png\"")
    .replace(/"https:\/\/picsum\.photos\/seed\/meals-hero\/800\/400"/g, "\"/images/meals-hero.jpg\"")
    .replace(/"https:\/\/picsum\.photos\/seed\/read-([^\/]+)\/800\/800"/g, "\"/images/read-$1.png\"")
    .replace(/"https:\/\/picsum\.photos\/seed\/morning\/800\/600"/g, "\"/images/blog-1.png\"")
    .replace(/"https:\/\/picsum\.photos\/seed\/pilates\/800\/600"/g, "\"/images/blog-2.png\"")
    .replace(/"https:\/\/picsum\.photos\/seed\/strawberry\/800\/600"/g, "\"/images/blog-3.png\"")
    .replace(/"https:\/\/picsum\.photos\/seed\/selfcare\/800\/600"/g, "\"/images/read-selfcare.png\"")

    // Fix specific jpgs
    .replace(/\/images\/meal-([a-z0-9-]*)\.png/g, "/images/meal-$1.jpg")
    .replace(/\/images\/shop-([a-z0-9-]*)\.png/g, "/images/shop-$1.jpg");

  if (text !== newText) {
    fs.writeFileSync(file, newText);
    console.log("Restored " + file);
  }
}

const files = [
  "./src/pages/app.tools.yoga.tsx",
  "./src/pages/app.tools.meals.tsx",
  "./src/pages/app.shop.tsx",
  "./src/pages/app.tools.notes.tsx",
  "./src/pages/app.me.tsx",
  "./src/pages/app.read.tsx",
  "./src/pages/Landing.tsx",
  "./src/pages/app.today.tsx",
  "./src/components/bloom/meals/data.ts"
];

for(let f of files) restore(f);
