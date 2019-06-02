import * as U from './Util';
import * as repl from 'repl';
import * as fs from 'fs';
import { createInterface } from 'readline';
import E from './ENV';

createInterface
const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});
let r: repl.REPLServer;

function changeDirectory(newFolderName: string) {
  if (fs.existsSync(newFolderName)) {
    E.folder = newFolderName;
    U.setFolder(newFolderName);
  }
  else
    console.error('provided folder name appears to be invalid');
}


function evall(func: Function, envFolderFirstArg: boolean = false) {
  const initialArgs = envFolderFirstArg ? 
    [ E.folder ] : [];
  return (args: string) => {
    const argsArray = 
      args
        .split(',,')
        .map(arg => eval(arg));
    func(...initialArgs, ...argsArray);
    r.clearBufferedCommand();
  };
}


function startRepl() {
  r = repl.start();

  r.defineCommand('cd', {
    help: 'change current directory',
    action: (newFolderName) => changeDirectory(newFolderName)
  })
  r.defineCommand('folder', {
    help: 'print current folder',
    action: () => console.log(E.folder)
  })

  r.defineCommand('fee', {
    help: 'for every entry in folder execute callback {$1: (entry: Dirent) => void}',
    action: evall(U.forEveryEntry, true)
  });
  
  r.defineCommand('eer', {
    help: 'rename every entry in folder using {$1: (fileName: string) => string}',
    action: evall(U.everyEntryRename, true)
  });

  r.defineCommand('eehtm', {
    help: 'for every entry in folder rename to {$2: string} if it matches {$1: regex}`',
    action: evall(U.everyEntryHasToMatch, true)
  });
  
  r.defineCommand('eehti', {
    help: 'for every entry in folder rename if it includes string you provide`',
    action: evall(U.everyEntryHasToInclude, true)
  });
}

rl.question('What folder\n', (answer) => {
  changeDirectory(answer);
  rl.close();

  startRepl();
});
