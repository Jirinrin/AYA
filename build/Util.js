"use strict";
exports.__esModule = true;
var fs = require('fs');
var path = require('path');
var folder;
function setFolder(path) {
    folder = path;
}
exports.setFolder = setFolder;
// GENERAL 
function renameFile(containerFolder, fileName, newFileName) {
    fs.rename(path.join(containerFolder, fileName), path.join(containerFolder, newFileName), function () { });
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
    var files = fs.readdirSync(containerFolder);
    files.forEach(function (fileName) {
        console.log(fileName);
        callback(fileName);
    });
}
exports.forEveryEntry = forEveryEntry;
function forEveryEntryDeep() {
}
/**
 * @param {(fileName: string) => string} renameCallback
 */
function everyEntryRename(renameCallback) {
    forEveryEntry(folder, function (fileName) {
        renameFile(folder, fileName, renameCallback(fileName));
    });
}
exports.everyEntryRename = everyEntryRename;
/**
 * @param {RegExp} exp: thing to try to match
 * @param {string} put: thing to put before the fileName
 */
function everyEntryHasToMatch(exp, put) {
    forEveryEntry(folder, function (fileName) {
        if (!fileName.toLowerCase().match(exp)) {
            renameFile(folder, fileName, put + " - " + fileName);
        }
    });
}
exports.everyEntryHasToMatch = everyEntryHasToMatch;
/**
 * @param {string} part: thing that every filename has to include
 */
function everyEntryHasToInclude(part) {
    forEveryEntry(folder, function (fileName) {
        if (!fileName.toLowerCase().includes(part.toLowerCase())) {
            renameFile(folder, fileName, part + " - " + fileName);
        }
    });
}
exports.everyEntryHasToInclude = everyEntryHasToInclude;
