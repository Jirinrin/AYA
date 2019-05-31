var U = require('./Util');
var repl = require('repl');
var fs = require('fs');
var readline = require('readline');
var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
var folder;
var r;
function changeDirectory(newFolderName) {
    if (fs.existsSync(newFolderName)) {
        folder = newFolderName;
        U.setFolder(newFolderName);
    }
    else
        console.log('provided folder name appears to be invalid');
}
function evall(func) {
    /**
     * @param {string} args
     */
    return function (args) {
        var argsArray = args
            .split(',,')
            .map(function (arg) { return eval(arg); });
        func.apply(void 0, argsArray);
        r.clearBufferedCommand();
    };
}
function startRepl() {
    r = repl.start();
    r.defineCommand('commands', function () {
        console.log(r.commands);
    });
    r.defineCommand('cd', {
        help: 'change current directory',
        action: function (newFolderName) { return changeDirectory(newFolderName); }
    });
    r.defineCommand('folder', {
        help: 'print current folder',
        action: function () { return console.log(folder); }
    });
    r.defineCommand('fee', {
        help: 'for every entry in folder execute callback {$1: (fileName: string) => void}',
        action: evall(function (callback) { return U.forEveryEntry(folder, callback); })
    });
    r.defineCommand('eer', {
        help: 'rename every entry in folder using {$1: (fileName: string) => string}',
        action: evall(U.everyEntryRename)
    });
    r.defineCommand('eehtm', {
        help: 'for every entry in folder rename to {$2: string} if it matches {$1: regex}`',
        action: evall(U.everyEntryHasToMatch)
    });
    r.defineCommand('eehti', {
        help: 'for every entry in folder rename if it includes string you provide`',
        action: evall(U.everyEntryHasToInclude)
    });
}
rl.question('What folder\n', function (answer) {
    changeDirectory(answer);
    rl.close();
    startRepl();
});
