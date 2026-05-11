#!/usr/bin/env node
// Copies onnxruntime-web WASM artifacts into public/ort-wasm/.
// Runs on postinstall so the binaries stay out of git but are present
// before next dev / next build.

import { mkdir, copyFile, readdir, access } from 'node:fs/promises';
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
  for (const name of entries) {
    if (!PATTERN.test(name)) continue;
    await copyFile(join(src, name), join(dst, name));
    copied++;
  }
  console.log(`[copy-ort-wasm] copied ${copied} files → ${dst}`);
}

main().catch((e) => {
  console.error('[copy-ort-wasm] failed:', e);
  process.exit(1);
});
