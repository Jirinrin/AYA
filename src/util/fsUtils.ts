import * as fs from 'fs';
import * as path from 'path';

import C from '../CONST';
import { config } from './LocalStorage';
import { putImageMetadataOnEntity } from '../modules/Image';
import { putMusicMetadataOnEntity } from '../modules/Music';
import { FileIteratorCallback } from '../types';

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
export async function forEveryEntry(folder: string, callback: FileIteratorCallback) {
  console.info(`Scanning ${folder}...`);
  try {
    if (typeof callback !== 'function')
      throw new Error('callback does not appear to be a function');

    const files = getEnts(folder);
    await Promise.all(
      files?.map(async (ent) => {
        if (C.musicMetadata) ent = await putMusicMetadataOnEntity(folder, ent);
        if (C.imageMetadata) ent = await putImageMetadataOnEntity(folder, ent);
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
