import { cp, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createZip } from '../src/shared/zip-write.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(root, 'bugpack-local-extension.zip');
const include = ['manifest.json', 'src', 'icons'];
const entries = [];
for (const path of include) {
  const full = join(root, path);
  const stat = await (await import('node:fs/promises')).stat(full);
  if (stat.isDirectory()) {
    const { readdir, readFile } = await import('node:fs/promises');
    async function walk(dir, rel) {
      for (const name of await readdir(dir, { withFileTypes: true })) {
        const childRel = rel ? `${rel}/${name.name}` : name.name;
        const child = join(dir, name.name);
        if (name.isDirectory()) await walk(child, childRel);
        else entries.push({ name: childRel, data: await readFile(child) });
      }
    }
    await walk(full, path);
  } else {
    entries.push({ name: path, data: await (await import('node:fs/promises')).readFile(full) });
  }
}
await (await import('node:fs/promises')).writeFile(output, Buffer.from(await (await createZip(entries)).arrayBuffer()));
console.log(`Created ${output}`);
