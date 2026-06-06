import fs from "fs";
const file = "./src/pages/app.tools.yoga.tsx";
let code = fs.readFileSync(file, "utf8");
code = code.replace(/\/images\/pose-([a-z-]*)\.png/g, "https://picsum.photos/seed/pose-$1/800/800");
fs.writeFileSync(file, code);
