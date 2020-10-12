import * as repl from 'repl';
import { createInterface } from 'readline';
import minimist = require('minimist');

import Modules from './modules';
import { Operation } from './types';
import './Global';
import './util/LocalStorage';
import { config } from './util/LocalStorage';
import { changeDirectory } from './util/replUtils';
import { completer, setupReplCustomization } from './util/replCustomization';
import { setConsole } from './util/consoleExtension';

setConsole();

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});
export let r: repl.REPLServer;

type StartOptions = Partial<{
  start: boolean;
}>;

const initArgs: StartOptions & Exclude<minimist.ParsedArgs, '_'|'--'> = minimist(process.argv, {alias: {s: 'start'}});
const initBody = initArgs._.join(' ');


function startRepl() {
  r = repl.start({
    ignoreUndefined: true,
    useGlobal: true,
    completer,
    useColors: true,
  });

  Modules.forEach((mod) => {
    mod.forEach((op: Operation) => {
      r.defineCommand(op.cmdName, op);
    });
  });

  setupReplCustomization(r);

  config.validateJson();
}


function setFolderRecursive(repeatTimes: number, rootResolve?: () => void): Promise<void> {
  const triesLeft = repeatTimes - 1;

  return new Promise((res, rej) => {
    try {
      rl.question(`What folder (type nothing to use the current working directory)\n`, (answer) => {
        const resolve = rootResolve ?? res;

        if (!triesLeft)
          return resolve(console.log('Max tries were exceeded. Please set the folder via the .cd command'));
        if (!answer) {
          changeDirectory(process.cwd());
          return resolve();
        } else if (changeDirectory(answer) || triesLeft <= 0) {
          return resolve();
        }
        return setFolderRecursive(triesLeft, resolve);

      });
    } catch {
      rej();
    }
  });
}

(async function start() {
  if (initArgs.start)
    changeDirectory(process.cwd());
  else  
    await setFolderRecursive(10);
  rl.close();
  try {
    startRepl();
  } catch (err) {
    console.trace(err);
  }
})();
