"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
function renameFile(containerFolder, fileName, newFileName) {
    if (fs.existsSync(path.join(containerFolder, newFileName))) {
        var i = 1;
        var ext = path.extname(newFileName);
        var baseName = ext ? newFileName.split(ext)[0] : newFileName;
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
