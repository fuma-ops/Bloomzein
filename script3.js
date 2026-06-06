import fs from "fs";

const fileMealsData = "./src/components/bloom/meals/data.ts";
let codeMealsData = fs.readFileSync(fileMealsData, "utf8");
codeMealsData = codeMealsData.replace(/\/images\/meal-([a-z0-9-]*)\.jpg/g, "https://picsum.photos/seed/meal-$1/800/800");
fs.writeFileSync(fileMealsData, codeMealsData);

const fileMeals = "./src/pages/app.tools.meals.tsx";
let codeMeals = fs.readFileSync(fileMeals, "utf8");
codeMeals = codeMeals.replace(/\/images\/meals-hero\.jpg/g, "https://picsum.photos/seed/meals-hero/800/400");
fs.writeFileSync(fileMeals, codeMeals);

const fileRead = "./src/pages/app.read.tsx";
let codeRead = fs.readFileSync(fileRead, "utf8");
codeRead = codeRead.replace(/\/images\/read-([a-z0-9-]*)\.png/g, "https://picsum.photos/seed/read-$1/800/800");
fs.writeFileSync(fileRead, codeRead);
