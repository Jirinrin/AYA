"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Util_1 = require("./Util");
var ENV_1 = require("../ENV");
var module = {
    everyEntryRename: function (iterator) { return ({
        abbrev: 'eer',
        help: 'rename every entry in folder using {$1: (fileName: string) => string}',
        // TODO: add option to only rename base name (so don't regard extension if applicable and then append it at the end)
        // TODO: add option to only rename directory <> file names
        run: function (renameCallback) {
            iterator(ENV_1.default.folder, function (folder, ent) {
                var newName = renameCallback(ent.name);
                if (ent.name !== newName) {
                    console.log("Renaming " + ent.name + " to " + newName);
                    Util_1.renameFile(folder, ent.name, newName);
                }
            });
        }
    }); },
    everyEntryHasToMatch: function (iterator) { return ({
        abbrev: 'eehtm',
        help: 'for every entry in folder rename to {$2: string} if it matches {$1: regex}',
        /**
         * @param exp: thing to try to match
         * @param put: thing to put before the fileName
         */
        run: function (exp, put) {
            iterator(ENV_1.default.folder, function (folder, ent) {
                if (!ent.name.toLowerCase().match(exp)) {
                    Util_1.renameFile(folder, ent.name, put + " - " + ent);
                }
            });
        }
    }); },
    everyEntryHasToInclude: function (iterator) { return ({
        abbrev: 'eehti',
        help: 'for every entry in folder rename if it includes {$1: string} you provide',
        /**
         * @param part: thing that every filename has to include
         */
        run: function (part) {
            iterator(ENV_1.default.folder, function (folder, ent) {
                if (!ent.name.toLowerCase().includes(part.toLowerCase())) {
                    Util_1.renameFile(folder, ent.name, part + " - " + ent);
                }
            });
        }
    }); },
};
exports.default = module;
