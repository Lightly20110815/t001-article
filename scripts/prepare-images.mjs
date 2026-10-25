import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../', import.meta.url));
const sourceDirectory = path.join(root, 'Attachments');
const targetDirectory = path.join(root, 'public/images');
await mkdir(targetDirectory, { recursive: true });
await mkdir(path.join(root, 'src/generated'), { recursive: true });

const manifest = {};
const files = (await readdir(sourceDirectory)).filter((file) => /\.(jpe?g|png|webp)$/i.test(file));

for (const file of files) {
  const stem = path.parse(file).name.toLowerCase();
  const image = sharp(path.join(sourceDirectory, file)).rotate();
  const large = await image.clone().resize({ width: 1440, withoutEnlargement: true }).webp({ quality: 83 }).toFile(path.join(targetDirectory, `${stem}.webp`));
  const small = await image.clone().resize({ width: 720, withoutEnlargement: true }).webp({ quality: 80 }).toFile(path.join(targetDirectory, `${stem}-small.webp`));
  manifest[`Attachments/${file}`] = {
    src: `images/${stem}.webp`,
    small: `images/${stem}-small.webp`,
    width: large.width,
    height: large.height,
    smallWidth: small.width,
  };
}

await writeFile(path.join(root, 'src/generated/attachments.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Prepared ${files.length} photos.`);
