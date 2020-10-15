import * as fs from 'fs';
import * as path from 'path';

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
      console.error(err);
      return;
    }
    files?.forEach(async (ent: DirentWithMetadata) => {
      await putMetadataOnEntity(ent, folder);
      callback(ent, folder);
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
    const ents = getEnts(folder);
    const mEnts: DirentWithMetadata[] = await Promise.all(
      ents?.map(async (ent: DirentWithMetadata) => {
        return await putMetadataOnEntity(ent, folder);
      }) ?? [],
    );

    for (const ent of mEnts) {
      try {
        await callback(ent, folder);
      } catch (err) {
        console.error(err);
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

function putFileDataOnEntity(ent: DirentWithMetadata, folder: string): void {
  const [baseName, ext] = splitFileName(ent.name);
  ent.ext = ext.replace('.', '');
  ent.baseName = baseName;
  ent.path = path.resolve(folder, ent.name);
}

async function putMetadataOnEntity(ent: DirentWithMetadata, folder: string): Promise<DirentWithMetadata> {
  putFileDataOnEntity(ent, folder);
  if (config.s.musicMetadata) await putMusicMetadataOnEntity(ent, folder);
  if (config.s.imageMetadata) await putImageMetadataOnEntity(ent, folder);
  return ent;
}
