import * as fs from 'fs';
import * as fse from 'fs-extra';
import * as path from 'path';
import { clone } from 'lodash';

import { config } from './LocalStorage';
import { getExifMetadata } from './exif';
import { getMusicFileMetadata } from '../modules/Music';
import { DirentWithData, DirentWithMetadata, EntityType, FileIteratorCallback } from '../types';
import { setConsoleIndent, setConsoleIndentRel } from './consoleExtension';
import ENV from '../ENV';

export function doForEachAsync(folder: string, callback: FileIteratorCallback) {
  if (typeof callback !== 'function') {
    console.error('callback does not appear to be a function');
    return;
  }
  fs.readdir(folder, { withFileTypes: true }, (err, files) => {
    if (err) {
      console.error('Error reading dir:', err);
      return;
    }
    files?.forEach(async ent => {
      const entWithMetadata = await putMetadataOnEntity(putFileDataOnEntity(ent, folder));
      await callback(entWithMetadata, folder);
    });
  });
}

export interface IScanOptions {
  dontLogScanning?: boolean;
  noMetadata?: boolean;
  scanExcludeFilter?: string|RegExp;
}
export const scanOpt = '--dontLogScanning --noMetadata(-m) --scanExcludeFilter=<>|/<nameRegex>/';

// These options are really hard to pass through the (recursive) chain so we just bodge it like this.
export async function wrapScanOptions(opts: IScanOptions, cb: () => void | Promise<void>) {
  if (opts.dontLogScanning)   ENV.dontLogScanning = true;
  if (opts.noMetadata)        ENV.noMetadata = true;
  if (opts.scanExcludeFilter) ENV.scanExcludeFilter = new RegExp(opts.scanExcludeFilter);
  try {
    return await cb();
  } finally {
    ENV.dontLogScanning = false;
    ENV.noMetadata = false;
    ENV.scanExcludeFilter = undefined;
  }
}

export async function doForEach(folder: string, callback: FileIteratorCallback): Promise<void> {
  if (!ENV.dontLogScanning) console.info(`Scanning ${folder}...`);
  const indents = setConsoleIndentRel(1);
  try {
    if (typeof callback !== 'function')
      throw new Error('Callback should be a function');
    const mEnts = await getEntsWithMetadata(folder);

    for (const ent of mEnts) {
      try {
        await callback(ent, folder);
      } catch (err) {
        console.error('Error during callback:', err);
      }
    }

  } catch (err) {
    console.error('An error occurred:', err);
  } finally {
    setConsoleIndent(indents-1);
    if (!ENV.dontLogScanning) console.info('Done!');
  }
}

export async function doForEachDeep(
  folder: string, 
  callback: FileIteratorCallback,
  invDepth: number = config.s.recursionDepth,
): Promise<void> {
  await doForEach(folder, async (ent, deepFolder) => {
    await callback(ent, deepFolder);
    if (invDepth <= 0) {
      return;
    }
    if (ent.isDirectory() && !ENV.scanExcludeFilter?.test(ent.name)) {
      return await doForEachDeep(
        path.join(deepFolder, ent.name),
        callback,
        invDepth - 1,
      );
    }
  });

  if (invDepth === config.s.recursionDepth)
    console.info('Recursive action done!');
}

export interface IGetEntsFilters {
  entType?: EntityType;
  filter?: string|RegExp;
  ext?: string|RegExp;
}

// todo: somehow unite this with the checkFilter function in generalUtils? They have quite some overlap, you see.
export function checkEntFilters(e: DirentWithData, opts: IGetEntsFilters): boolean {
  return ( opts.entType === undefined || (opts.entType === 'file' ? e.isFile() : e.isDirectory()) )
      && ( opts.filter  === undefined || !!e.nameBase.match(opts.filter) )
      && ( opts.ext     === undefined || !!e.ext.match(new RegExp(opts.ext, 'i')) )
}

export function getEnts(folder: string, opts: IGetEntsFilters = {}): DirentWithData[] {
  return fs.readdirSync(folder, { withFileTypes: true })
    .map(ent => putFileDataOnEntity(ent, folder))
    .filter(ent => checkEntFilters(ent, opts));
}

// todo: maybe add max depth that's passed
export function getEntsDeep(folder: string, opts: IGetEntsFilters = {}): DirentWithData[] {
  const allEnts = getEnts(folder);
  return allEnts
    .flatMap(e => e.isDirectory()
      ? [e, ...getEntsDeep(e.path, opts)]
      : e
    )
    .filter(ent => checkEntFilters(ent, opts));
}

export async function getEntsWithMetadata(folder: string, opts: IGetEntsFilters = {}): Promise<DirentWithMetadata[]> {
  const ents = getEnts(folder, opts);
  return await Promise.all(
    ents?.map(putMetadataOnEntity) ?? [],
  );
}

function getSafePath(unsafePath: string, isDirectory?: boolean) {
  if (!fs.existsSync(unsafePath))
    return unsafePath;

  const [nameBase, ext] = splitFileName(path.basename(unsafePath), isDirectory);
  for (let i = 1; i < 100; i++) {
    const newNewName = `${nameBase} (${i})${ext}`;
    const newNewPath = path.resolve(unsafePath, '..', newNewName);
    if (!fs.existsSync(newNewPath))
      return newNewPath;
  }
  throw new Error(`Couldn\'t find safe name in 100 incrementing tries for path: ${unsafePath}`);
}

export function safeRename(oldPath: string, newPath: string, isDirectory?: boolean): string {
  const safeNewPath = (oldPath.toLowerCase() !== newPath.toLowerCase()) ? getSafePath(newPath, isDirectory) : newPath;
  if (oldPath !== newPath)
    fs.renameSync(oldPath, safeNewPath);
  return safeNewPath;
}

export function safeCopy(oldPath: string, newPath: string, isDirectory?: boolean): string {
  const safeNewPath = getSafePath(escPath(newPath), isDirectory);
  fse.copySync(oldPath, safeNewPath);
  return safeNewPath;
}

export function mkdirSafe(dirPath: string): string {
  const safePath = getSafePath(escPath(dirPath), true);
  fse.mkdirSync(safePath);
  return safePath;
}

export function splitFileName(fileName: string, isDirectory?: boolean): [nameBase: string, ext: string] {
  if (isDirectory) return [fileName, ''];

  const ext = path.extname(fileName);
  const nameBase = ext ? fileName.split(ext)[0] : fileName;
  return [nameBase, ext];
}

export function cwdRel(absPath: string) {
  return path.relative(ENV.cwd, absPath);
}

export function simpleRename(containerFolder: string, fileName: string, newFileName: string, isDirectory?: boolean): string {
  return safeRename(
    path.join(containerFolder, fileName),
    path.join(containerFolder, esc(newFileName)),
    isDirectory,
  );
}

export function simpleMove(originalFolderPath: string, fileName: string, newFolderPath: string, isDirectory?: boolean, newFileName?: string): string {
  return safeRename(
    path.join(originalFolderPath, fileName),
    path.join(newFolderPath,      esc(newFileName ?? fileName)),
    isDirectory,
  );
}

export function simpleCopy(containerFolder: string, fileName: string, newFolderPath: string, isDirectory?: boolean, newFileName?: string): string {
  return safeCopy(
    path.join(containerFolder, fileName),
    path.join(newFolderPath,   esc(newFileName ?? fileName)),
    isDirectory,
  );
}

export function putFileDataOnEntity(ent: fs.Dirent, folder: string): DirentWithData {
  const [nameBase, ext] = splitFileName(ent.name, ent.isDirectory());
  const entWithData = clone(ent) as DirentWithData;
  entWithData.ext = ext.replace('.', '');
  entWithData.nameBase = nameBase;
  entWithData.path = path.join(folder, ent.name);
  entWithData.dirPath = folder;
  return entWithData;
}

export async function putMetadataOnEntity(ent: DirentWithData): Promise<DirentWithMetadata> {
  const entWithMetadata = clone(ent) as DirentWithMetadata;
  if (config.s.musicMetadata && !ENV.noMetadata) entWithMetadata.mm = await getMusicFileMetadata(ent.path);
  if (config.s.exifMetadata  && !ENV.noMetadata) entWithMetadata.em = await getExifMetadata(ent.path);
  return entWithMetadata;
}

export function pathToDirent(entPath: string): DirentWithData {
  const ent = fs.statSync(entPath) as (fs.Stats & { name: string });
  ent.name = path.basename(entPath);
  return putFileDataOnEntity(ent, path.dirname(entPath));
}

function splitPath(pathOrWhatever: string): [dir: string, base: string] {
  if (pathOrWhatever.length === 0)
    return ['', pathOrWhatever];
  const [, dir, base] = pathOrWhatever.match(/(^.*\\)?(.+$)/);
  return [dir ?? '', base];
}
function makePathSafeForWindowsFileName(input: string) {
  const [dir, base] = splitPath(input);
  return dir + base
    .replace(/:/g, '：')
    .replace(/\?/g, '？')
    .replace(/"/g, '”')
    .replace(/</g, '＜')
    .replace(/>/g, '＞')
    .replace(/\|/g, '｜')
    .replace(/\*/g, '＊')
    .trim()
    .replace(/\.$/, '∙');
}
function makeSafeForWindowsFileName(input: string) {
  return makePathSafeForWindowsFileName(input)
    .replace(/\\/g, '＼')
    .replace(/\//g, '／');
}
function makePathSafeForLinuxFileName(input: string) {
  return input.trim();
}
function makeSafeForLinuxFileName(input: string) {
  return makePathSafeForLinuxFileName(input)
    .replace(/\//g, '／');
}

export function esc(input: string) {
  switch (process.platform) {
    case 'win32':
      return makeSafeForWindowsFileName(input);
    default:
      return makeSafeForLinuxFileName(input);
  }
}

export function escPath(input: string) {
  switch (process.platform) {
    case 'win32':
      return makePathSafeForWindowsFileName(input);
    default:
      return makePathSafeForLinuxFileName(input);
  }
}
