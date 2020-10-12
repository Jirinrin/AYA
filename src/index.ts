import * as repl from 'repl';
import { createInterface } from 'readline';

import Modules from './modules';
import { Operation } from './types';
import './Global';
import './util/LocalStorage';
import { config } from './util/LocalStorage';
import { changeDirectory, setConsole } from './util';
import { completer, setupReplCustomization } from './util/replCustomization';

setConsole();

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});
export let r: repl.REPLServer;

function startRepl() {
  r = repl.start({
    ignoreUndefined: true,
    useGlobal: true,
    completer,
    useColors: true,
  });

  try {
    Modules.forEach((mod) => {
      mod.forEach((op: Operation) => {
        r.defineCommand(op.cmdName, op);
      });
    });
  } catch (err) {
    console.trace(err);
  }

  setupReplCustomization(r);

  config.validateJson();
}

function setFolderRecursive(repeatTimes: number, rootResolve?: () => void): Promise<void> {
  const triesLeft = repeatTimes - 1;

  return new Promise((res, rej) => {
    try {
      rl.question(`What folder (type nothing to use the current working directory)\n`, (answer) => {
        const resolve = rootResolve || res;

        if (!triesLeft)
          return console.log('Max tries were exceeded. Please set the folder via the .cd command');
        if (changeDirectory(answer) || triesLeft <= 0)
          return resolve();
        else if (!answer) {
          console.log('...Never mind that => using cwd');
          changeDirectory(process.cwd());
          // changeDirectory(path.resolve('.'));
          return resolve();
        }
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
