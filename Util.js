const fs = require('fs');
const path = require('path');

let folder;
function setFolder(path) {
  folder = path;
}

// GENERAL 

function renameFile(containerFolder, fileName, newFileName) {
  fs.rename(
    path.join(containerFolder, fileName),
    path.join(containerFolder, newFileName),
    () => {}
  );
}

// UTIL

/**
 * @param {(fileName: string) => void} callback 
 */
function forEveryEntry(containerFolder, callback) {
  if (typeof callback !== 'function') {
    console.error('callback does not appear to be a function');
    return;
  }
  const files = fs.readdirSync(containerFolder);
  files.forEach((fileName) => {
    console.log(fileName);
    callback(fileName);
  });
}

function forEveryEntryDeep() {

}

/**
 * @param {(fileName: string) => string} renameCallback
 */
function everyEntryRename(renameCallback) {
  forEveryEntry(folder, (fileName) => {
    renameFile(folder, fileName, renameCallback(fileName));
  });
}  

/**
 * @param {RegExp} exp: thing to try to match
 * @param {string} put: thing to put before the fileName
 */
function everyEntryHasToMatch(exp, put) {
  forEveryEntry(folder, (fileName) => {
    if (!fileName.toLowerCase().match(exp)) {
      renameFile(folder, fileName, `${put} - ${fileName}`);
    }
  });
}

/**
 * @param {string} part: thing that every filename has to include
 */
function everyEntryHasToInclude(part) {
  forEveryEntry(folder, (fileName) => {
    if (!fileName.toLowerCase().includes(part.toLowerCase())) {
      renameFile(folder, fileName, `${part} - ${fileName}`)
    }
  });
}

module.exports = {
  setFolder, 
  forEveryEntry, everyEntryRename, everyEntryHasToInclude, everyEntryHasToMatch
};