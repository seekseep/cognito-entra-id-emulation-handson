#!/usr/bin/env node
/**
 * 各レクチャーのサンプルを ZIP 化し、site/public/downloads/ に出力する。
 *
 * レクチャーの形は 3 通りあり、どれも `<sec>-<lec>.zip` に出力する。
 *
 * ── A. example 方式（静的ブラウザアプリ。`<lec>/example/index.html` を持つ）
 *   中身: example/ 配下すべて（作業ツリー直読み。git 追跡は問わない）。
 *   ZIP 内のルートフォルダは常に `game/`。どの節を解凍しても `game/` になるので、
 *   前の `game/` に上書き展開すればそのまま育てていける。
 *   加えて `example/assets/` を持つレクチャーは、素材だけの
 *   `<sec>-<lec>-assets.zip`（ルートフォルダは `assets/`）も出す。
 *
 * ── A'. Office マクロ系（`<lec>/example/vba/` か `example/gas/` を持ち、index.html は無い）
 *   中身: example/ 配下すべて（data/*.xlsx・vba/*.bas・gas/*.gs）。
 *   ZIP 内のルートフォルダは `<lec>/`（節ごとに独立したフォルダとして展開する）。
 *   環境ごとの `<sec>-<lec>-excel.zip`（gas/ を除く）と `-sheets.zip`（vba/ を除く）も出す。
 *   Excel 用は、同じ名前の .xlsm（その節を終えた状態のマクロ入り）があるブックの .xlsx を入れない。
 *   スプレッドシート用は .xlsm を入れない。
 *   章の最初の節には、練習用ブック（.xlsx）だけの `<sec>-<lec>-start.zip`（その節を始める状態）も出す。
 *   本文の `./start.zip` がそれ（2 つ目以降の節は前の節の ZIP）を指す（sync-lectures.mjs）。
 *   本文のダウンロードボタンは、選んでいる環境の ZIP を指す（src/plugins/lib/platform-zip.mjs）。
 *   .bas だけは書き出し時に VBE が読める形へ変換する（convertForImport）:
 *     - 先頭に `Attribute VB_Name = "<ファイル名>"` を足す（インポート後のモジュール名）。
 *       リポジトリの .bas に書かないのは、本文の完成例からコピーして VBE に貼ると
 *       この行が構文エラーになるため
 *     - Shift_JIS（CP932）＋ CRLF にする。日本語版 Windows の VBE は .bas を CP932 として
 *       読むので、UTF-8 のままだとインポートした日本語が文字化けする
 *
 * ── B. 積み上げ方式（project/ から作る `<lec>/handson/` を持つ）
 *   中身: そのレクチャーを終えた時点の handson/（libs/snapshots.mjs が project/ から作るもの）。
 *   手元で動かしたときにできた node_modules・.env などは入れない（作り直したファイルだけを入れる）。
 *   ZIP 内のルートフォルダは常に `handson/`。受講者は最初に 1 度だけダウンロードし、
 *   あとは自分でファイルを足していく。途中のレクチャーの ZIP は、追いつくための控え。
 *   本文に `::download{dir="<dir>"}` があるレクチャーは、handson/<dir>/ だけの
 *   `<sec>-<lec>-<dir>.zip`（ルートフォルダは `<dir>/`）も出す。handson/ で展開すると置き換わる。
 *
 * ダウンロード URL の規約 (<sec>-<lec>.zip) は libs/naming.mjs に集約し、
 * sync-lectures.mjs のリンク生成と共有している。
 */

import { createWriteStream } from 'node:fs';
import { glob, mkdir, readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';

import { ZipArchive } from 'archiver';
import iconv from 'iconv-lite';

import { walkFiles } from './libs/fs-walk.mjs';
import {
  assetsZipBasenameFor,
  dirZipBasenameFor,
  exampleDirOf,
  parseLectureRel,
  platformZipBasenameFor,
  startZipBasenameFor,
  zipBasenameFor,
} from './libs/naming.mjs';
import { DOWNLOADS_DIR, ROOT } from './libs/paths.mjs';
import { DOWNLOAD_RE } from './libs/handson-sentinels.mjs';
import { SNAPSHOT_DIRNAME, buildSnapshot, lectureIdOf } from './libs/snapshots.mjs';

const IGNORE_DIRS = new Set(['node_modules', '.git']);
const IGNORE_NAMES = new Set(['.DS_Store']);

/** VBE に読ませる形式へ変換する（.bas のみ）。それ以外のファイルは null（そのまま入れる）。 */
async function convertForImport(absPath) {
  if (path.extname(absPath).toLowerCase() !== '.bas') return null;
  const moduleName = path.basename(absPath, path.extname(absPath));
  const source = (await readFile(absPath, 'utf8')).replace(/\r\n/g, '\n');
  const text = `Attribute VB_Name = "${moduleName}"\n${source}`.replace(/\n/g, '\r\n');
  return iconv.encode(text, 'cp932');
}

/** files（<absDir> 相対）を outPath に ZIP 化する。ZIP 内は rootDir/ 配下に置く。 */
async function zipFiles(absDir, files, outPath, rootDir) {
  const output = createWriteStream(outPath);
  const archive = new ZipArchive({ zlib: { level: 9 } });
  const done = new Promise((resolve, reject) => {
    output.on('close', () => resolve(files.length));
    archive.on('warning', reject);
    archive.on('error', reject);
  });
  archive.pipe(output);
  for (const rel of files) {
    const abs = path.join(absDir, ...rel.split('/'));
    const name = path.posix.join(rootDir, rel);
    const converted = await convertForImport(abs);
    if (converted) archive.append(converted, { name });
    else archive.file(abs, { name });
  }
  archive.finalize();
  return done;
}

async function exists(abs) {
  try {
    await stat(abs);
    return true;
  } catch (e) {
    if (e.code === 'ENOENT') return false;
    throw e;
  }
}

// ---------------------------------------------------------------------------
// A / A'. example 方式（静的ブラウザ系・Office マクロ系）
// ---------------------------------------------------------------------------

async function findExampleLectures() {
  // 静的ブラウザ系は example/index.html、Office マクロ系は example/vba/ か example/gas/ が目印。
  const dirs = new Set();
  for (const pattern of ['sections/*/*/example/index.html', 'sections/*/*/example/vba', 'sections/*/*/example/gas']) {
    for await (const rel of glob(pattern, { cwd: ROOT })) {
      dirs.add(rel.split(path.sep).slice(0, 3).join('/'));
    }
  }
  return [...dirs].sort();
}

async function zipExample(lectureRel) {
  const { sec, lec } = parseLectureRel(lectureRel);
  const exampleAbs = path.join(ROOT, ...exampleDirOf(lectureRel).split('/'));
  const files = await walkFiles(exampleAbs, { ignoreDirs: IGNORE_DIRS, ignoreNames: IGNORE_NAMES });
  const outPath = path.join(DOWNLOADS_DIR, zipBasenameFor(sec, lec));
  // 静的ブラウザ系は前の game/ に上書き展開して育てるのでルートは常に game/。
  // Office マクロ系は節ごとに独立したフォルダとして配る。
  const isBrowserApp = await exists(path.join(exampleAbs, 'index.html'));
  const rootDir = isBrowserApp ? 'game' : lec;
  const count = await zipFiles(exampleAbs, files, outPath, rootDir);
  // Office マクロ系は、環境ごとの ZIP も出す（Excel は gas/ を、スプレッドシートは vba/ を入れない）。
  if (!isBrowserApp && files.some((f) => f.startsWith('vba/') || f.startsWith('gas/'))) {
    const hasXlsm = (f) => files.includes(f.replace(/\.xlsx$/, '.xlsm'));
    const pick = {
      excel: files.filter((f) => !f.startsWith('gas/') && !(f.endsWith('.xlsx') && hasXlsm(f))),
      sheets: files.filter((f) => !f.startsWith('vba/') && !f.endsWith('.xlsm')),
    };
    for (const platform of ['excel', 'sheets']) {
      await zipFiles(exampleAbs, pick[platform], path.join(DOWNLOADS_DIR, platformZipBasenameFor(sec, lec, platform)), rootDir);
    }
  }
  return count;
}

/**
 * Office マクロ系の章の最初の節には、その節を始める状態（練習用ブック .xlsx だけ）の ZIP を作る。
 * 2 つ目以降の節は、前の節を終えた状態の ZIP が始める状態になる（sync-lectures.mjs の `./start.zip`）。
 */
async function zipStart(lectureRel, isFirstInSection) {
  if (!isFirstInSection) return null;
  const { sec, lec } = parseLectureRel(lectureRel);
  const exampleAbs = path.join(ROOT, ...exampleDirOf(lectureRel).split('/'));
  if (await exists(path.join(exampleAbs, 'index.html'))) return null;
  const files = (await walkFiles(exampleAbs, { ignoreDirs: IGNORE_DIRS, ignoreNames: IGNORE_NAMES })).filter(
    (f) => f.startsWith('data/') && f.endsWith('.xlsx'),
  );
  if (files.length === 0) return null;
  await zipFiles(exampleAbs, files, path.join(DOWNLOADS_DIR, startZipBasenameFor(sec, lec)), lec);
  return files.length;
}

/**
 * example/assets/ があれば、その中身だけの ZIP を作る。無ければ null。
 * 学習者は game/ の隣に展開するだけで assets/ が揃う。
 */
async function zipExampleAssets(lectureRel) {
  const { sec, lec } = parseLectureRel(lectureRel);
  const assetsAbs = path.join(ROOT, ...exampleDirOf(lectureRel).split('/'), 'assets');
  let files;
  try {
    files = await walkFiles(assetsAbs, { ignoreDirs: IGNORE_DIRS, ignoreNames: IGNORE_NAMES });
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
  if (files.length === 0) return null;
  const outPath = path.join(DOWNLOADS_DIR, assetsZipBasenameFor(sec, lec));
  return zipFiles(assetsAbs, files, outPath, 'assets');
}

// ---------------------------------------------------------------------------
// B. 積み上げ方式
// ---------------------------------------------------------------------------

async function findHandsonLectures() {
  const found = [];
  for await (const abs of glob(`sections/*/*/${SNAPSHOT_DIRNAME}`, { cwd: ROOT })) found.push(path.posix.dirname(abs.split(path.sep).join('/')));
  return found.sort();
}

async function zipHandson(lectureRel) {
  const { sec, lec } = parseLectureRel(lectureRel);
  const snapshot = await buildSnapshot(lectureIdOf(sec, lec));
  const absDir = path.join(ROOT, ...lectureRel.split('/'), SNAPSHOT_DIRNAME);
  const outPath = path.join(DOWNLOADS_DIR, zipBasenameFor(sec, lec));
  return zipFiles(absDir, [...snapshot.keys()], outPath, SNAPSHOT_DIRNAME);
}

/** 本文の `::download{dir="..."}` ごとに、handson/<dir>/ だけの ZIP を作る。[dir, 件数] の配列を返す。 */
async function zipHandsonDirs(lectureRel) {
  const { sec, lec } = parseLectureRel(lectureRel);
  const body = await readFile(path.join(ROOT, ...lectureRel.split('/'), 'LECTURE.md'), 'utf8');
  const dirs = [...new Set(body.split('\n').map((line) => line.match(DOWNLOAD_RE)?.[1]).filter(Boolean))];
  if (dirs.length === 0) return [];
  const snapshot = await buildSnapshot(lectureIdOf(sec, lec));
  const absDir = path.join(ROOT, ...lectureRel.split('/'), SNAPSHOT_DIRNAME);
  const made = [];
  for (const dir of dirs) {
    const prefix = `${dir}/`;
    const files = [...snapshot.keys()].filter((rel) => rel.startsWith(prefix)).map((rel) => rel.slice(prefix.length));
    const outPath = path.join(DOWNLOADS_DIR, dirZipBasenameFor(sec, lec, dir));
    made.push([dir, await zipFiles(path.join(absDir, ...dir.split('/')), files, outPath, dir)]);
  }
  return made;
}

async function main() {
  await rm(DOWNLOADS_DIR, { recursive: true, force: true });
  await mkdir(DOWNLOADS_DIR, { recursive: true });

  const exampleLectures = await findExampleLectures();
  const seenSections = new Set();
  for (const lectureRel of exampleLectures) {
    const { sec, lec } = parseLectureRel(lectureRel);
    const count = await zipExample(lectureRel);
    const startCount = await zipStart(lectureRel, !seenSections.has(sec));
    seenSections.add(sec);
    if (startCount !== null) {
      console.log(`[build-downloads] ${lectureRel}/example/data -> site/public/downloads/${startZipBasenameFor(sec, lec)} (${startCount} files)`);
    }
    console.log(`[build-downloads] ${lectureRel}/example -> site/public/downloads/${zipBasenameFor(sec, lec)} (${count} files)`);
    const assetCount = await zipExampleAssets(lectureRel);
    if (assetCount !== null) {
      console.log(`[build-downloads] ${lectureRel}/example/assets -> site/public/downloads/${assetsZipBasenameFor(sec, lec)} (${assetCount} files)`);
    }
  }

  const handsonLectures = await findHandsonLectures();
  for (const lectureRel of handsonLectures) {
    const { sec, lec } = parseLectureRel(lectureRel);
    const count = await zipHandson(lectureRel);
    console.log(`[build-downloads] ${lectureRel}/${SNAPSHOT_DIRNAME} -> site/public/downloads/${zipBasenameFor(sec, lec)} (${count} files)`);
    for (const [dir, n] of await zipHandsonDirs(lectureRel)) {
      console.log(`[build-downloads] ${lectureRel}/${SNAPSHOT_DIRNAME}/${dir} -> site/public/downloads/${dirZipBasenameFor(sec, lec, dir)} (${n} files)`);
    }
  }

  if (exampleLectures.length === 0 && handsonLectures.length === 0) {
    console.warn('[build-downloads] no lectures found (sections/*/*/example/ or sections/*/*/handson/)');
  }

  console.log('[build-downloads] done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
