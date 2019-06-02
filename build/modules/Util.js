"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
function renameFile(containerFolder, fileName, newFileName) {
    if (fs.existsSync(path.join(containerFolder, newFileName))) {
        var i = 1;
        var _a = splitFileName(newFileName), baseName = _a[0], ext = _a[1];
        while (i < 100) {
            var newNewFileName = baseName + " (" + i + ")" + ext;
            if (!fs.existsSync(path.join(containerFolder, newNewFileName))) {
                return renameFile(containerFolder, fileName, newNewFileName);
            }
            i++;
        }
        return new Error('Couldn\'t rename file in 100 incrementing tries');
    }
    fs.rename(path.join(containerFolder, fileName), path.join(containerFolder, newFileName), function () { });
}
exports.renameFile = renameFile;
function splitFileName(fileName) {
    var ext = path.extname(fileName);
    var baseName = ext ? fileName.split(ext)[0] : fileName;
    return [baseName, ext];
}
exports.splitFileName = splitFileName;
