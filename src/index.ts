import * as U from './IndexUtil';
import * as repl from 'repl';
import * as fs from 'fs';
import { createInterface } from 'readline';
import E from './ENV';
import Modules from './modules';
import { Operation } from './types';
import ENV from './ENV';

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


function evall(func: Function) {
  return (args: string) => {
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

  r.defineCommand('cd', {
    help: 'change current directory',
    action: (newFolderName) => changeDirectory(newFolderName),
  })
  r.defineCommand('folder', {
    help: 'print current folder',
    action: () => console.log(E.folder),
  })

  r.defineCommand('fee', {
    help: 'for every entry in folder execute callback {$1: (entry: Dirent) => void}',
    action: evall((callback: (ent: fs.Dirent) => void) => U.forEveryEntry(ENV.folder, callback)),
  });

  Modules.forEach((mod) => {
    mod.forEach((op: Operation) => {
      r.defineCommand(op.abbrev, {
        help: `${op.help}`,
        action: evall(op.run),
      });
    });
  });
  // modules.foreach:
}

rl.question('What folder\n', (answer) => {
  changeDirectory(answer);
  rl.close();

  startRepl();
});
