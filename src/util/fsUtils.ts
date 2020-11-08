import * as fs from 'fs';
import * as fse from 'fs-extra';
import * as path from 'path';
import { pick } from 'lodash';

import { config } from './LocalStorage';
import { putImageMetadataOnEntity } from '../modules/Image';
import { putMusicMetadataOnEntity } from '../modules/Music';
import { DirentWithMetadata, FileIteratorCallback } from '../types';
import { setConsoleIndent, setConsoleIndentRel } from './consoleExtension';

/**
 * @param folder Is not useful when calling this directly (0 layers deep)
 */
export function forEveryEntryAsync(folder: string, callback: FileIteratorCallback) {
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

/**
 * @param folder Is not useful when calling this directly (0 layers deep)
 */
export async function forEveryEntry(folder: string, callback: FileIteratorCallback): Promise<void> {
  console.info(`Scanning ${folder}...`);
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
    console.info('Done!');
  }
}

export async function forEveryEntryDeep(
  folder: string, 
  callback: FileIteratorCallback,
  invDepth: number = config.s.recursionDepth,
): Promise<void> {
  await forEveryEntry(folder, async (ent, deepFolder) => {
    await callback(ent, deepFolder);
    if (invDepth <= 0) {
      return;
    }
    if (ent.isDirectory()) {
      return await forEveryEntryDeep(
        path.join(deepFolder, ent.name),
        callback,
        invDepth - 1,
      );
    }
  });

  if (invDepth === 0)
    console.info('Recursive action done!');
}

export function getEnts(folder: string): fs.Dirent[] {
  return fs.readdirSync(folder, { withFileTypes: true });
}
export async function getEntsWithMetadata(folder: string): Promise<DirentWithMetadata[]> {
  const ents = getEnts(folder);
  return await Promise.all(
    ents?.map(async (ent: DirentWithMetadata) => {
      return await putMetadataOnEntity(ent, folder);
    }) ?? [],
  );
}

function getSafePath(unsafePath: string, isDirectory?: boolean) {
  if (!fs.existsSync(unsafePath))
    return unsafePath;

  const [baseName, ext] = splitFileName(path.basename(unsafePath), isDirectory);
  for (let i = 1; i < 100; i++) {
    const newNewName = `${baseName} (${i})${ext}`;
    const newNewPath = path.resolve(unsafePath, '..', newNewName);
    if (!fs.existsSync(newNewPath))
      return newNewPath;
  }
  throw new Error(`Couldn\'t find safe name in 100 incrementing tries for path: ${unsafePath}`);
}

export function safeRename(oldPath: string, newPath: string, isDirectory?: boolean): string {
  const safeNewPath = (oldPath !== newPath) ? getSafePath(newPath, isDirectory) : newPath;
  fs.renameSync(oldPath, safeNewPath);
  return path.basename(safeNewPath);
}

export function safeCopy(oldPath: string, newPath: string, isDirectory?: boolean): string {
  const safeNewPath = getSafePath(newPath, isDirectory);
  fse.copySync(oldPath, safeNewPath);
  return path.basename(safeNewPath);
}

export function splitFileName(fileName: string, isDirectory?: boolean): [baseName: string, ext: string] {
  if (isDirectory) return [fileName, ''];

  const ext = path.extname(fileName);
  const baseName = ext ? fileName.split(ext)[0] : fileName;
  return [baseName, ext];
}

export function simpleRename(containerFolder: string, fileName: string, newFileName: string, isDirectory?: boolean): string {
  return safeRename(
    path.join(containerFolder, fileName),
    path.join(containerFolder, newFileName),
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

export function simpleCopy(containerFolder: string, fileName: string, newFolderPath: string, isDirectory?: boolean): string {
  return safeCopy(
    path.join(containerFolder, fileName),
    path.join(newFolderPath,   fileName),
    isDirectory,
  );
}

function putFileDataOnEntity(ent: DirentWithMetadata, folder: string): void {
  const [baseName, ext] = splitFileName(ent.name);
  ent.ext = ext.replace('.', '');
  ent.baseName = baseName;
  ent.path = path.resolve(folder, ent.name);
}

export async function putMetadataOnEntity(ent: DirentWithMetadata, folder: string): Promise<DirentWithMetadata> {
  putFileDataOnEntity(ent, folder);
  if (config.s.musicMetadata) await putMusicMetadataOnEntity(ent, folder);
  if (config.s.imageMetadata) await putImageMetadataOnEntity(ent, folder);
  return ent;
}

export function pathToDirent(entPath: string): fs.Dirent {
  const test = pick(fs.statSync(entPath), 'isFile', 'isDirectory', 'isBlockDevice', 'isCharacterDevice', 'isSymbolicLink', 'isFIFO', 'isSocket');
  return {
    ...test,
    name: path.basename(entPath),
  }
}
