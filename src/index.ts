import * as U from './IndexUtil';
import C from './CONST';
import * as repl from 'repl';
import { createInterface } from 'readline';
import Modules from './modules';
import { Operation, FileIteratorCallback } from './types';
import ENV from './ENV';
import { movePicturesTo, movePicturesFro, config } from './PictureOrg';

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});
let r: repl.REPLServer;


function evall(func: Function) {
  return (args: string) => {
    const argsArray = 
      args
        .split(',,')
        .map(arg => eval(arg));
    func(...argsArray);
    r.clearBufferedCommand(); /// Doesn't seem to do much
  };
}

function startRepl() {
  r = repl.start();

  // TODO: for setters, console.log the new value afterwards
  r.defineCommand('cd', {
    help: 'Change current directory',
    action: (newFolderName) => U.changeDirectory(newFolderName),
  });
  r.defineCommand('helpp', {
    help: 'Get help for specific command',
    action: (commandName: string) => U.getCommandHelp(r, commandName),
  });
  r.defineCommand('set-depth', {
    help: 'Set recursion depth for deep functions to {$1: number}',
    action: (newDepth: string) => U.setEnvVar('recursionDepth', Number(newDepth)),
  });

  r.defineCommand('move-to', {
    help: 'Move items to',
    action: movePicturesTo,
  });
  
  r.defineCommand('move-fro', {
    help: 'Move items fro',
    action: movePicturesFro,
  });

  r.defineCommand('config', {
    help: `Move to/fro to a certain config; available configs: ${Object.keys(C.pictureOrgConfigs)}`,
    action: config,
  });
}

function setFolderRecursive(repeatTimes: number, rootResolve?: () => void): Promise<void> {
  const triesLeft = repeatTimes - 1;

  return new Promise((res, rej) => {
    try {
      rl.question('What folder\n', (answer) => {
        const resolve = rootResolve || res;

        if (!triesLeft)
          console.log('Max tries were exceeded. Please set the folder via the .cd command');
        if (U.changeDirectory(answer) || triesLeft <= 0)
          resolve();
        else
          return setFolderRecursive(triesLeft, resolve);

      });
    } catch {
      rej();
    }
  });
}

setFolderRecursive(10)
.then(() => {
  rl.close();
  startRepl();
})
.catch(console.error);
