import * as fs from 'fs';
import * as fse from 'fs-extra';
import * as path from 'path';

import { config } from './LocalStorage';
import { putExifMetadataOnEntity } from './exif';
import { putMusicMetadataOnEntity } from '../modules/Music';
import { DirentWithMetadata, EntityType, FileIteratorCallback } from '../types';
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
    files?.forEach(async (ent: DirentWithMetadata) => {
      await putMetadataOnEntity(ent, folder);
      await callback(ent, folder);
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
export function getEnts(folder: string, opts: IGetEntsOpts = {}): DirentWithMetadata[] {
  let ents = fs.readdirSync(folder, { withFileTypes: true })
    .map((ent: DirentWithMetadata) => putFileDataOnEntity(ent, folder));
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
    ents?.map(async (ent: DirentWithMetadata) => {
      return await putMetadataOnEntity(ent, folder);
    }) ?? [],
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
  const safeNewPath = getSafePath(esc(newPath), isDirectory);
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

export function putFileDataOnEntity(ent: DirentWithMetadata, folder: string): DirentWithMetadata {
  const [nameBase, ext] = splitFileName(ent.name, ent.isDirectory());
  ent.ext = ext.replace('.', '');
  ent.nameBase = nameBase;
  ent.path = path.resolve(folder, ent.name);
  return ent;
}

export async function putMetadataOnEntity(ent: DirentWithMetadata, folder: string): Promise<DirentWithMetadata> {
  if (config.s.musicMetadata) await putMusicMetadataOnEntity(ent, folder);
  if (config.s.exifMetadata) await putExifMetadataOnEntity(ent, folder);
  return ent;
}

export function pathToDirent(entPath: string): DirentWithMetadata {
  const ent = fs.statSync(entPath);
  return putFileDataOnEntity({
    name: path.basename(entPath),
    isFile: () => ent.isFile(),
    isDirectory: () => ent.isDirectory(),
    isBlockDevice: () => ent.isBlockDevice(),
    isCharacterDevice: () => ent.isCharacterDevice(),
    isSymbolicLink: () => ent.isSymbolicLink(),
    isFIFO: () => ent.isFIFO(),
    isSocket: () => ent.isSocket(),
  } as DirentWithMetadata, path.dirname(entPath));
}

function makeSafeForWindowsFileName(input: string) {
  return input
    .replace(/\\/g, '＼')
    .replace(/\//g, '／')
    .replace(/:/g, '：')
    .replace(/\?/g, '？')
    .replace(/"/g, '”')
    .replace(/</g, '＜')
    .replace(/>/g, '＞')
    .replace(/\|/g, '｜')
    .replace(/\*/g, '＊')
    .trim()
    .replace(/\.$/g, '∙');
}
function makeSafeForLinuxFileName(input: string) {
  return input
    .replace(/\//g, '／')
    .trim();
}

export function esc(input: string) {
  switch (process.platform) {
    case 'win32':
      return makeSafeForWindowsFileName(input);
    default:
      return makeSafeForLinuxFileName(input);
  }
}
