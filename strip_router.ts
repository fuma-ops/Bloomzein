import fs from 'node:fs';
import path from 'node:path';

const dir = 'src/pages';
const files = fs.readdirSync(dir);

for (const file of files) {
  if (!file.endsWith('.tsx')) continue;
  let code = fs.readFileSync(path.join(dir, file), 'utf8');

  // Replace <Link to="..."> with <a href="...">
  code = code.replace(/<Link\s+to=\{?([^}]+)\}?/g, '<a href={$1}');
  code = code.replace(/<Link\s+to="([^"]+)"/g, '<a href="$1"');
  code = code.replace(/<\/Link>/g, '</a>');
  code = code.replace(/import \{[^}]*Link[^}]*\} from ["']@tanstack\/react-router["'];?/g, '');
  
  // Remove createFileRoute wrapper
  code = code.replace(/import \{[^}]*createFileRoute[^}]*\} from ["']@tanstack\/react-router["'];?/g, '');
  code = code.replace(/export const Route = createFileRoute[^;]+;/g, '');
  
  // Clean up any remaining @tanstack/react-router imports (like useLoaderData)
  code = code.replace(/import \{[^}]*\} from ["']@tanstack\/react-router["'];?/g, '');

  code = code.replace(/Route\.useLoaderData\(\)/g, '{ tool: {} }'); // For app.tools.$slug.tsx mock

  fs.writeFileSync(path.join(dir, file), code);
}
console.log('Stripped router overhead');
