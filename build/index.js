"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var U = require("./IndexUtil");
var repl = require("repl");
var readline_1 = require("readline");
var modules_1 = require("./modules");
var ENV_1 = require("./ENV");
var rl = readline_1.createInterface({
    input: process.stdin,
    output: process.stdout
});
var r;
function evall(func) {
    return function (args) {
        var argsArray = args
            .split(',,')
            .map(function (arg) { return eval(arg); });
        func.apply(void 0, argsArray);
        r.clearBufferedCommand(); /// Doesn't seem to do much
    };
}
function startRepl() {
    r = repl.start();
    r.defineCommand('cd', {
        help: 'change current directory',
        action: function (newFolderName) { return U.changeDirectory(newFolderName); },
    });
    r.defineCommand('set-depth', {
        help: 'set recursion depth for deep functions to {$1: number}',
        action: function (newDepth) { return U.setEnvVar('recursionDepth', Number(newDepth)); },
    });
    Object.keys(ENV_1.default).forEach(function (key) {
        r.defineCommand(key, {
            help: "print current value of " + key,
            action: function () { return console.log(ENV_1.default[key]); },
        });
    });
    r.defineCommand('fee', {
        help: 'for every entry in folder execute callback {$1: (folder: string (irrelevant), entry: Dirent) => void}',
        action: evall(function (callback) { return U.forEveryEntry(ENV_1.default.folder, callback); }),
    });
    r.defineCommand('fee-deep', {
        help: 'for every entry in folder execute callback {$1: (folder: string (irrelevant), entry: Dirent) => void} - does this recursively until the set depth',
        action: evall(function (callback) { return U.forEveryEntryDeep(ENV_1.default.folder, callback); }),
    });
    modules_1.default.forEach(function (mod) {
        mod.forEach(function (op) {
            r.defineCommand(op.abbrev, {
                help: "" + op.help,
                action: evall(op.run),
            });
        });
    });
}
rl.question('What folder\n', function (answer) {
    U.changeDirectory(answer);
    rl.close();
    startRepl();
});
