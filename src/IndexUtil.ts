import C from './CONST';
import * as fs from 'fs';
import * as path from 'path';
import { FileIteratorCallback } from './types';
import ENV from './ENV';

export function setEnvVar<K extends keyof typeof ENV>(key: K, value: typeof ENV[K]) {
  ENV[key] = value;
}

export function changeDirectory(newFolderName: string) {
  if (fs.existsSync(newFolderName)) {
    setEnvVar('folder', newFolderName);
  } else {
    console.error('provided folder name appears to be invalid');
  }
}

/**
 * @param folder Is not useful when calling this directly (0 layers deep)
 */
export function forEveryEntry(folder: string, callback: FileIteratorCallback) {
  if (typeof callback !== 'function') {
    console.error('callback does not appear to be a function');
    return;
  }
  fs.readdir(folder, { withFileTypes: true }, (err, files) => {
    if (err) {
      console.error(err);
    }
    files.forEach((ent) => {
      console.log(path.join(folder, ent.name));
      callback(folder, ent);
    });
  });
}

export function forEveryEntryDeep(
  folder: string, 
  callback: FileIteratorCallback,
  depth: number = ENV.recursionDepth,
) {
  forEveryEntry(folder, (deepFolder, ent) => {
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
}
