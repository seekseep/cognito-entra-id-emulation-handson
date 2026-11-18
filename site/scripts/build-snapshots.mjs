#!/usr/bin/env node
/**
 * project/（04 を終えた状態）から引き算して、各レクチャーを終えた時点の handson/ を
 * sections/<sec>/<lec>/handson/ に書き出す（目印の書き方は libs/snapshots.mjs）。
 *
 * 書き出したものはリポジトリに入れる。GitHub でもレクチャーごとの状態を読めるようにするためと、
 * 手元でそのレクチャーの状態を動かして確かめられるようにするため。
 * project/ を直したら、このスクリプトを流し直す（pnpm run build / dev の前にも自動で流れる）。
 *
 *   node scripts/build-snapshots.mjs          … 書き出す
 *   node scripts/build-snapshots.mjs --check  … 書き出したものが project/ と食い違っていれば exit 1
 */

import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { walkFiles } from './libs/fs-walk.mjs';
import { ROOT } from './libs/paths.mjs';
import { SNAPSHOT_DIRNAME, buildSnapshot, lectureIdOf, loadManifest } from './libs/snapshots.mjs';

const SECTIONS = path.join(ROOT, 'sections');
const check = process.argv.includes('--check');

async function lectureDirs() {
  const dirs = new Map();
  for (const sec of (await readdir(SECTIONS, { withFileTypes: true })).filter((e) => e.isDirectory())) {
    for (const lec of (await readdir(path.join(SECTIONS, sec.name), { withFileTypes: true })).filter((e) => e.isDirectory())) {
      dirs.set(lectureIdOf(sec.name, lec.name), path.join(SECTIONS, sec.name, lec.name));
    }
  }
  return dirs;
}

const { lectures } = await loadManifest();
const dirs = await lectureDirs();
let stale = 0;

for (const id of lectures) {
  const lectureDir = dirs.get(id);
  if (!lectureDir) throw new Error(`[build-snapshots] lectures.json の ${id} に当たるレクチャーが sections/ にありません`);
  const outDir = path.join(lectureDir, SNAPSHOT_DIRNAME);
  const snapshot = await buildSnapshot(id);

  if (check) {
    const existing = await walkFiles(outDir, { ignoreDirs: new Set(['node_modules', 'dist']) }).catch(() => []);
    const local = new Set(['.env', '.cognito.env', '.tokens.json', '.entra.env', 'package-lock.json']);
    const extra = existing.filter((rel) => !snapshot.has(rel) && !local.has(rel) && !rel.startsWith('.entra.'));
    let diff = extra.length;
    for (const [rel, text] of snapshot) {
      const current = await readFile(path.join(outDir, ...rel.split('/')), 'utf8').catch(() => null);
      if (current !== text) diff++;
    }
    if (diff) {
      console.error(`[build-snapshots] ${path.relative(ROOT, outDir)} が project/ と食い違っています（${diff} ファイル）`);
      stale++;
    }
    continue;
  }

  // 手元で動かしたときにできるもの（node_modules・.env など）は消さずに、配るファイルだけを入れ替える
  const existing = await walkFiles(outDir, { ignoreDirs: new Set(['node_modules', 'dist']) }).catch(() => []);
  const tracked = new Set(existing.filter((rel) => !rel.startsWith('.env') && !rel.startsWith('.cognito') && !rel.startsWith('.tokens') && !rel.startsWith('.entra') && rel !== 'package-lock.json'));
  for (const rel of tracked) if (!snapshot.has(rel)) await rm(path.join(outDir, ...rel.split('/')));
  for (const [rel, text] of snapshot) {
    const dest = path.join(outDir, ...rel.split('/'));
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, text);
  }
  console.log(`[build-snapshots] ${id} -> ${path.relative(ROOT, outDir)} (${snapshot.size} files)`);
}

if (stale) process.exit(1);
