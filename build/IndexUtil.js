"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
var ENV_1 = require("./ENV");
function setEnvVar(key, value) {
    ENV_1.default[key] = value;
}
exports.setEnvVar = setEnvVar;
function changeDirectory(newFolderName) {
    if (fs.existsSync(newFolderName)) {
        setEnvVar('folder', newFolderName);
    }
    else {
        console.error('provided folder name appears to be invalid');
    }
}
exports.changeDirectory = changeDirectory;
/**
 * @param folder Is not useful when calling this directly (0 layers deep)
 */
function forEveryEntry(folder, callback) {
    if (typeof callback !== 'function') {
        console.error('callback does not appear to be a function');
        return;
    }
    fs.readdir(folder, { withFileTypes: true }, function (err, files) {
        if (err) {
            console.error(err);
        }
        files.forEach(function (ent) {
            console.log(path.join(folder, ent.name));
            callback(folder, ent);
        });
    });
}
exports.forEveryEntry = forEveryEntry;
function forEveryEntryDeep(folder, callback, depth) {
    if (depth === void 0) { depth = ENV_1.default.recursionDepth; }
    forEveryEntry(folder, function (deepFolder, ent) {
        callback(deepFolder, ent);
        if (depth <= 0) {
            return;
        }
        if (ent.isDirectory()) {
            return forEveryEntryDeep(path.join(deepFolder, ent.name), callback, depth - 1);
        }
    });
}
exports.forEveryEntryDeep = forEveryEntryDeep;
