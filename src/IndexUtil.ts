import E from './ENV';
import C from './CONST';
import * as fs from 'fs';
import * as path from 'path';

export function setFolder(path: string) {
  E.folder = path;
}

/**
 * @param folder Is not useful when calling this directly (0 layers deep)
 */
export function forEveryEntry(folder: string, callback: (folder: string, ent: fs.Dirent) => void) {
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

function forEveryEntryDeep(
  folder: string, 
  callback: (folder: string, ent: fs.Dirent) => void,
  depth: number = C.DEFAULT_DEEP_DEPTH,
) {
  forEveryEntry(folder, (deepFolder, ent) => {
    callback(deepFolder, ent);
    if (depth <= 0) {
      return;
    }
    if (ent.isDirectory()) {
      forEveryEntryDeep(
        path.join(deepFolder, ent.name),
        callback,
        depth - 1,
      );
    }
  });
}
