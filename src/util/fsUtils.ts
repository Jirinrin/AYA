import * as fs from 'fs';
import * as path from 'path';

import { config } from './LocalStorage';
import { putImageMetadataOnEntity } from '../modules/Image';
import { putMusicMetadataOnEntity } from '../modules/Music';
import { FileIteratorCallback, FileIteratorCallbackSimple } from '../types';

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
      console.error(err);
      return;
    }
    files?.forEach(async (ent) => {
      if (C.musicMetadata) ent = await putMusicMetadataOnEntity(folder, ent);
      if (C.imageMetadata) ent = await putImageMetadataOnEntity(folder, ent);
      callback(folder, ent);
    });
  });
}

/**
 * @param folder Is not useful when calling this directly (0 layers deep)
 */
export async function forEveryEntry(folder: string, callback: FileIteratorCallback): Promise<void> {
  console.info(`Scanning ${folder}...`);
  try {
    if (typeof callback !== 'function')
      throw new Error('callback does not appear to be a function');

    const files = getEnts(folder);
    await Promise.all(
      files?.map(async (ent) => {
        if (config.s.musicMetadata) ent = await putMusicMetadataOnEntity(folder, ent);
        if (config.s.imageMetadata) ent = await putImageMetadataOnEntity(folder, ent);
        try { 
          callback(folder, ent);
        } catch (err) { 
          console.error(err);
        }
      })
    );

  } catch (err) {
    console.error('An error occurred:', err);
  } finally {
    console.info('Done!');
  }
}
export async function forEveryEntrySimple(folder: string, callback: FileIteratorCallbackSimple): Promise<void> {
  await forEveryEntry(folder, (f, e) => callback(e));
}

export async function forEveryEntryDeep(
  folder: string, 
  callback: FileIteratorCallback,
  depth: number = config.s.recursionDepth,
) {
  await forEveryEntry(folder, (deepFolder, ent) => {
    callback(deepFolder, ent);
    if (depth <= 0) {
      return;
    }
    if (ent.isDirectory()) {
      return forEveryEntryDeep(
        path.join(deepFolder, ent.name),
        callback,
        depth - 1,
      );
    }
  });

  if (depth === config.s.recursionDepth)
    console.info('Recursive action done!');
}

export function getEnts(folder: string): fs.Dirent[] {
  return fs.readdirSync(folder, { withFileTypes: true });
}

export function safeRename(oldPath: string, newPath: string, isDirectory?: boolean): string {
  if (fs.existsSync(newPath)) {
    let i = 1;
    const [baseName, ext] = splitFileName(path.basename(newPath), isDirectory);
    while (i < 100) {
      const newNewName = `${baseName} (${i})${ext}`;
      const newNewPath = path.resolve(newPath, '..', newNewName);
      if (!fs.existsSync(newNewPath)) {
        return safeRename(oldPath, newNewPath, isDirectory);
      }
      i++;
    }
    throw new Error(`Couldn\'t safely rename file in 100 incrementing tries:: ${oldPath} -> ${newPath}`);
  }

  fs.renameSync(oldPath, newPath);
  return path.basename(newPath);
}

export function splitFileName(fileName: string, isDirectory?: boolean): [string, string] {
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
