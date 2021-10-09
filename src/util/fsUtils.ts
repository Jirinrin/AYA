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
    if (ent.isDirectory()) {
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

interface IGetEntsOpts {
  entType?: EntityType;
  filter?: string|RegExp;
  ext?: string|RegExp;
}
export function getEnts(folder: string, opts: IGetEntsOpts = {}): DirentWithData[] {
  let ents = fs.readdirSync(folder, { withFileTypes: true })
    .map(ent => putFileDataOnEntity(ent, folder));
  if (opts.entType)
    ents = ents.filter(e => (opts.entType === 'file' ? e.isFile() : e.isDirectory()));
  if (opts.filter)
    ents = ents.filter(e => e.nameBase.match(opts.filter));
  if (opts.ext)
    ents = ents.filter(e => e.ext.match(opts.ext));
  return ents;
}
export async function getEntsWithMetadata(folder: string, opts: IGetEntsOpts = {}): Promise<DirentWithMetadata[]> {
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
  return path.basename(safeNewPath);
}

export function safeCopy(oldPath: string, newPath: string, isDirectory?: boolean): string {
  const safeNewPath = getSafePath(escPath(newPath), isDirectory);
  fse.copySync(oldPath, safeNewPath);
  return path.basename(safeNewPath);
}

export function splitFileName(fileName: string, isDirectory?: boolean): [nameBase: string, ext: string] {
  if (isDirectory) return [fileName, ''];

  const ext = path.extname(fileName);
  const nameBase = ext ? fileName.split(ext)[0] : fileName;
  return [nameBase, ext];
}

export function simpleRename(containerFolder: string, fileName: string, newFileName: string, isDirectory?: boolean): string {
  return safeRename(
    path.join(containerFolder, fileName),
    path.join(containerFolder, esc(newFileName)),
    isDirectory,
  );
}

export function simpleMove(originalFolderPath: string, fileName: string, newFolderPath: string, isDirectory?: boolean): string {
  return safeRename(
    path.join(originalFolderPath, fileName),
    path.join(newFolderPath,      fileName),
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
  entWithData.path = path.resolve(folder, ent.name);
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
