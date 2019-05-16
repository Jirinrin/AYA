const U = require('./Util');
const repl = require('repl');
const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
let folder;
let r;

const str = 'siejfei';
str.replace()


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
  return (args) => {
    const argsArray = 
      args
        .split(',,')
        .map(arg => eval(arg));
    func(...argsArray);
    r.clearBufferedCommand();
  };
}


function startRepl() {
  r = repl.start();

  r.defineCommand('commands', () => {
    console.log(r.commands);
  });

  r.defineCommand('cd', {
    help: 'change current directory',
    action: (newFolderName) => changeDirectory(newFolderName)
  })
  r.defineCommand('folder', {
    help: 'print current folder',
    action: () => console.log(folder)
  })

  r.defineCommand('fee', {
    help: 'for every entry in folder execute callback {$1: (fileName: string) => void}',
    action: evall((callback) => U.forEveryEntry(folder, callback))
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


rl.question('What folder\n', (answer) => {
  changeDirectory(answer);
  rl.close();

  startRepl();
});


