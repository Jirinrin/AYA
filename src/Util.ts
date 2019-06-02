import E from './ENV';
import C from './CONST';
import * as fs from 'fs';
import * as path from 'path';

export function setFolder(path: string) {
  E.folder = path;
}

// GENERAL 

function renameFile(containerFolder: string, fileName: string, newFileName: string) {
  fs.rename(
    path.join(containerFolder, fileName),
    path.join(containerFolder, newFileName),
    () => {}
  );
}

// UTIL

export function forEveryEntry(folder: string, callback: (ent: fs.Dirent) => void) {
  if (typeof callback !== 'function') {
    console.error('callback does not appear to be a function');
    return;
  }
  fs.readdir(folder, { withFileTypes: true }, (err, files) => {
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

export function everyEntryRename(folder: string, renameCallback: (fileName: string) => string) {
  forEveryEntry(folder, (ent) => {
    renameFile(folder, ent.name, renameCallback(ent.name));
  });
}  

/**
 * @param exp: thing to try to match
 * @param put: thing to put before the fileName
 */
export function everyEntryHasToMatch(folder: string, exp: RegExp, put: string) {
  forEveryEntry(folder, (ent) => {
    if (!ent.name.toLowerCase().match(exp)) {
      renameFile(folder, ent.name, `${put} - ${ent}`);
    }
  });
}

/**
 * @param part: thing that every filename has to include
 */
export function everyEntryHasToInclude(folder: string, part: string) {
  forEveryEntry(folder, (ent) => {
    if (!ent.name.toLowerCase().includes(part.toLowerCase())) {
      renameFile(folder, ent.name, `${part} - ${ent}`)
    }
  });
}
