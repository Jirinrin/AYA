import E from './ENV';
import * as fs from 'fs';
import * as path from 'path';

let folder: string;
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

export function forEveryEntry(folder: string, callback: (fileName: string) => void) {
  if (typeof callback !== 'function') {
    console.error('callback does not appear to be a function');
    return;
  }
  const files = fs.readdirSync(folder);
  files.forEach((fileName) => {
    console.log(fileName);
    callback(fileName);
  });
}

// function forEveryEntryDeep() {

// }

export function everyEntryRename(folder: string, renameCallback: (fileName: string) => string) {
  forEveryEntry(folder, (fileName) => {
    renameFile(folder, fileName, renameCallback(fileName));
  });
}  

/**
 * @param exp: thing to try to match
 * @param put: thing to put before the fileName
 */
export function everyEntryHasToMatch(folder: string, exp: RegExp, put: string) {
  forEveryEntry(folder, (fileName) => {
    if (!fileName.toLowerCase().match(exp)) {
      renameFile(folder, fileName, `${put} - ${fileName}`);
    }
  });
}

/**
 * @param part: thing that every filename has to include
 */
export function everyEntryHasToInclude(folder: string, part: string) {
  forEveryEntry(folder, (fileName) => {
    if (!fileName.toLowerCase().includes(part.toLowerCase())) {
      renameFile(folder, fileName, `${part} - ${fileName}`)
    }
  });
}
