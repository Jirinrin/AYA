"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
function renameFile(containerFolder, fileName, newFileName) {
    fs.rename(path.join(containerFolder, fileName), path.join(containerFolder, newFileName), function () { });
}
exports.renameFile = renameFile;
