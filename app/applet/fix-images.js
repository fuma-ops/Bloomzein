import fs from "fs";
const file = "./src/pages/app.tools.yoga.tsx";
let code = fs.readFileSync(file, "utf8");
code = code.replace(/\/images\/pose-([a-z-]*)\.png/g, "https://api.dicebear.com/8.x/shapes/svg?seed=pose-$1");
fs.writeFileSync(file, code);

const file2 = "./src/pages/app.tools.meals.tsx";
let code2 = fs.readFileSync(file2, "utf8");
code2 = code2.replace(/\/images\/meal-([a-z-]*)\.jpg/g, "https://picsum.photos/seed/meal-$1/800/800");
fs.writeFileSync(file2, code2);

const fileShop = "./src/pages/app.shop.tsx";
let codeShop = fs.readFileSync(fileShop, "utf8");
codeShop = codeShop.replace(/\/images\/shop-([a-z-]*)\.jpg/g, "https://picsum.photos/seed/shop-$1/800/800");
fs.writeFileSync(fileShop, codeShop);

const fileNotes = "./src/pages/app.tools.notes.tsx";
let codeNotes = fs.readFileSync(fileNotes, "utf8");
codeNotes = codeNotes.replace(/\/images\/me-avatar\.png/g, "https://api.dicebear.com/8.x/notionists/svg?seed=bloom");
fs.writeFileSync(fileNotes, codeNotes);

const fileMe = "./src/pages/app.me.tsx";
let codeMe = fs.readFileSync(fileMe, "utf8");
codeMe = codeMe.replace(/\/images\/me-avatar\.png/g, "https://api.dicebear.com/8.x/notionists/svg?seed=bloom");
codeMe = codeMe.replace(/\/images\/me-header\.png/g, "https://picsum.photos/seed/me-header/800/400");
fs.writeFileSync(fileMe, codeMe);
