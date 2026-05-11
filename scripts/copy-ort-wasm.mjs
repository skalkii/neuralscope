#!/usr/bin/env node
// Copies onnxruntime-web WASM artifacts into public/ort-wasm/.
// Runs on postinstall so the binaries stay out of git but are present
// before next dev / next build.

import { mkdir, copyFile, readdir, access, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const src = join(root, 'node_modules', 'onnxruntime-web', 'dist');
const dst = join(root, 'public', 'ort-wasm');

const PATTERN =
  /^ort-wasm-simd-threaded\.(wasm|mjs|asyncify\.(wasm|mjs)|jsep\.(wasm|mjs)|jspi\.(wasm|mjs))$/;

async function exists(p) {
  try {
    await access(p, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!(await exists(src))) {
    console.warn(
      `[copy-ort-wasm] onnxruntime-web not installed yet; skipping (looked for ${src}).`,
    );
    return;
  }
  await mkdir(dst, { recursive: true });
  const entries = await readdir(src);
  let copied = 0;
  let skipped = 0;
  for (const name of entries) {
    if (!PATTERN.test(name)) continue;
    const srcPath = join(src, name);
    const dstPath = join(dst, name);
    let needsCopy = true;
    try {
      const [sStat, dStat] = await Promise.all([stat(srcPath), stat(dstPath)]);
      if (dStat.size === sStat.size && dStat.mtimeMs >= sStat.mtimeMs) {
        needsCopy = false;
      }
    } catch {
      needsCopy = true;
    }
    if (needsCopy) {
      await copyFile(srcPath, dstPath);
      copied++;
    } else {
      skipped++;
    }
  }
  console.log(
    `[copy-ort-wasm] ${copied} copied, ${skipped} up-to-date → ${dst}`,
  );
}

main().catch((e) => {
  console.error('[copy-ort-wasm] failed:', e);
  process.exit(1);
});
