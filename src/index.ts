import * as repl from 'repl';
import { createInterface } from 'readline';
import minimist = require('minimist');

import Modules from './modules';
import { Module } from './types';
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

type InitOpts = Partial<{
  start: boolean;
  userscript: string;
  cmd: string;
  exitAfterCmd: boolean;
}>;
const initOptsAlias: Record<string, keyof InitOpts> = { s: 'start', u: 'userscript', c: 'cmd', e: 'exitAfterCmd' };
// todo: help option to print these items as help...

const initArgs: InitOpts & minimist.ParsedArgs = minimist(process.argv.slice(2), {alias: initOptsAlias});
const initBody = initArgs._.join(' ');


async function startRepl() {
  r = repl.start({
    ignoreUndefined: true,
    useGlobal: true,
    completer,
    useColors: true,
  });

  Object.values(Modules).forEach((mod: Module) => {
    Object.entries(mod).forEach(([k, op]) => {
      r.defineCommand(k, op);
    });
  });

  setupReplCustomization(r);

  config.validateJson();

  if (initArgs.userscript) {
    await Modules.Base.userscript.action(initArgs.userscript);
    // todo: make userscript awaitable somehow
    // process.exit();
  } else if (initBody) {
    r.write(initBody)
    // todo: await
    // process.exit();
  } else if (initArgs.cmd) {
    await r.commands[initArgs.cmd as any].action.bind(r)(initBody);
    if (!initArgs.exitAfterCmd)
      process.exit();
  }
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
  if (initArgs.start || initArgs.userscript || initArgs.cmd || initBody)
    changeDirectory(process.cwd());
  else  
    await setFolderRecursive(10);
  rl.close();
  startRepl().catch(console.trace);
})();
