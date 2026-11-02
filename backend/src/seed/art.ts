import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';

const SEED_DIR = 'images/demo';

/** A simple illustrated placeholder, so the demo store has no third-party imagery. */
export function artSvg(emojis: string[], from: string, to: string, width: number, height: number) {
  const size = Math.min(width, height);
  const big = Math.round(size * (emojis.length > 1 ? 0.38 : 0.52));
  const small = Math.round(big * 0.55);
  const [main, ...rest] = emojis;
  const positions = [
    [0.2, 0.34],
    [0.8, 0.36],
    [0.2, 0.8],
    [0.82, 0.78],
  ] as const;
  const extras = rest
    .slice(0, 4)
    .map((emoji, index) => {
      const [x, y] = positions[index] ?? [0.5, 0.5];
      return `<text x="${x * width}" y="${y * height}" font-size="${small}" text-anchor="middle" dominant-baseline="central">${emoji}</text>`;
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>
<rect width="${width}" height="${height}" fill="url(#g)"/>
<circle cx="${width * 0.5}" cy="${height * 0.54}" r="${size * 0.36}" fill="#fff" fill-opacity="0.32"/>
${extras}
<text x="${width * 0.5}" y="${height * 0.54}" font-size="${big}" text-anchor="middle" dominant-baseline="central">${main}</text>
</svg>`;
}

export async function saveArt(name: string, svg: string): Promise<string> {
  const directory = path.resolve(env.UPLOAD_DIR, SEED_DIR);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, `${name}.svg`), svg);
  return `/uploads/${SEED_DIR}/${name}.svg`;
}
