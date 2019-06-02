import E from './ENV';
import C from './CONST';
import * as fs from 'fs';
import * as path from 'path';

export function setFolder(path: string) {
  E.folder = path;
}

export function forEveryEntry(folder: string, callback: (ent: fs.Dirent) => void) {
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
      callback(ent);
    });
  });
}

function forEveryEntryDeep(
  folder: string, 
  callback: (ent: fs.Dirent) => void,
  depth: number = C.DEFAULT_DEEP_DEPTH,
) {
  forEveryEntry(folder, (ent) => {
    callback(ent);
    if (depth <= 0) {
      return;
    }
    if (ent.isDirectory()) {
      forEveryEntryDeep(
        path.join(folder, ent.name),
        callback,
        depth - 1,
      );
    }
  });
}
