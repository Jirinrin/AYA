import * as fs from 'fs';
import * as fse from 'fs-extra';
import * as path from 'path';
import { clone } from 'lodash';

import { config } from './LocalStorage';
import { getExifMetadata } from './exif';
import { getMusicFileMetadata, getTrackInfoFromMetadata } from './music';
import { DirentWithData, DirentWithMetadata, EntityType, FileData, FileIteratorCallback } from '../types';
import { setConsoleIndent, setConsoleIndentRel } from './consoleExtension';
import ENV from '../ENV';
import { FILE_EXT_PATTERNS } from './generalUtils';

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
  progressUpdates?: boolean;
}
export const scanOpt = '--dontLogScanning --noMetadata(-m) --progressUpdates --scanExcludeFilter=<>|/<nameRegex>/';

// These options are really hard to pass through the (recursive) chain so we just bodge it like this.
export async function wrapScanOptions(opts: IScanOptions, cb: () => void | Promise<void>) {
  if (opts.dontLogScanning)   ENV.dontLogScanning = true;
  if (opts.noMetadata)        ENV.noMetadata = true;
  if (opts.progressUpdates)   ENV.progressUpdates = true;
  if (opts.scanExcludeFilter) ENV.scanExcludeFilter = new RegExp(opts.scanExcludeFilter);
  try {
    return await cb();
  } finally {
    ENV.dontLogScanning = false;
    ENV.noMetadata = false;
    ENV.scanExcludeFilter = undefined;
    ENV.progressUpdates = false;
  }
}

async function _doForEach(rootPath: string, ents: DirentWithData[], callback: FileIteratorCallback) {
  let i = 0;
  try {
    for (const ent of ents) {
      if (ENV.progressUpdates)
        console.info(`Progress: ${++i}/${ents.length} (${Math.round(i/ents.length*100)}%)`);
      const mEnt = await putMetadataOnEntity(ent);
      const levelsBelowRoot = path.relative(rootPath, ent.path).split(path.sep).length - 1;
      setConsoleIndent(levelsBelowRoot);
      await callback(mEnt, rootPath);
    }
  } catch (err) {
    console.error('An error occurred:', err);
  } finally {
    setConsoleIndent(0);
  }
}

type DoForEachOpts = IGetEntsFilters & IScanOptions & { deep?: boolean, invDepth?: number };

export async function doForEacho(folder: string, opts: DoForEachOpts, callback: FileIteratorCallback): Promise<void> {
  if (!opts.dontLogScanning) console.info(`Scanning ${folder}...`);
  if (typeof callback !== 'function')
    throw new Error('Callback should be a function');
  const ents = opts.deep ? getEntsDeep(folder, opts, opts.invDepth) : getEnts(folder, opts);
  await _doForEach(folder, ents, callback);
  if (!ENV.dontLogScanning) console.info('Done!');
}

export async function doForEach(folder: string, callback: FileIteratorCallback): Promise<void> {
  return doForEacho(folder, {}, callback);
}

export async function doForEachDeep(folder: string, callback: FileIteratorCallback, invDepth: number = config.s.recursionDepth): Promise<void> {
  return doForEacho(folder, { deep: true, invDepth }, callback);
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
  // todo: get ents through a glob (with globby)
  return fs.readdirSync(folder, { withFileTypes: true })
    .map(ent => putFileDataOnEntity(ent, folder))
    .filter(ent => checkEntFilters(ent, opts));
}

export function getEntsWithStats(folder: string, opts: IGetEntsFilters = {}): (DirentWithData & fs.Stats)[] {
  return fs.readdirSync(folder)
    .map(p => pathToDirent(path.join(folder, p)))
    .filter(ent => checkEntFilters(ent, opts));
}

export function getEntsDeep(folder: string, opts: IGetEntsFilters = {}, invDepth = config.s.recursionDepth): DirentWithData[] {
  if (invDepth <= 0) {
    console.debug('invDepth reached 0, getEntsDeep will return empty array');
    return [];
  }
  const allEnts = getEnts(folder);
  return allEnts
    .flatMap(e => e.isDirectory() ? [e, ...getEntsDeep(e.path, opts, invDepth - 1)] : e)
    .filter(ent => checkEntFilters(ent, opts));
}

export async function getEntsWithMetadata(folder: string, opts: IGetEntsFilters = {}): Promise<DirentWithMetadata[]> {
  const ents = getEnts(folder, opts);
  return await Promise.all(
    ents?.map(e => putMetadataOnEntity(e)) ?? [],
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

// todo: move to generalUtils (so that generalUtils doesn't have to import fsUtils)
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

export function putFileDataOnEntity<D extends fs.Dirent>(ent: D, folder: string): D & FileData {
  const [nameBase, ext] = splitFileName(ent.name, ent.isDirectory());
  const entWithData = clone(ent) as D & FileData;
  entWithData.ext = ext.replace('.', '');
  entWithData.nameBase = nameBase;
  entWithData.path = path.join(folder, ent.name);
  entWithData.dirPath = folder;
  return entWithData;
}

export async function putMetadataOnEntity(ent: DirentWithData): Promise<DirentWithMetadata> {
  const entWithMetadata = clone(ent) as DirentWithMetadata;
  if (config.s.musicMetadata && !ENV.noMetadata) 
    entWithMetadata.mm = await getMusicFileMetadata(ent.path);
  if (config.s.exifMetadata && !ENV.noMetadata)
    entWithMetadata.em = await getExifMetadata(ent.path);
  if ((entWithMetadata.em || entWithMetadata.mm) && ent.ext.match(FILE_EXT_PATTERNS.music))
    entWithMetadata.trackInfo = getTrackInfoFromMetadata(entWithMetadata);
  const stats = fs.statSync(ent.path);
  return Object.assign(entWithMetadata, stats)
}

export function pathToDirent(entPath: string): (DirentWithData & fs.Stats) {
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
