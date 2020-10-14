import * as repl from 'repl';
import { createInterface } from 'readline';
import minimist = require('minimist');

import Modules from './modules';
import { Module } from './types';
import './Global';
import './util/LocalStorage';
import { config, userScripts } from './util/LocalStorage';
import { changeDirectory } from './util/replUtils';
import { completer, setupReplCustomization } from './util/replCustomization';
import { setConsole } from './util/consoleExtension';
import { REPLCommand } from 'repl';
import { runUserscript } from './modules/Base';

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
  continueAfterCmd: boolean;
  // todo: 'cwd' or sth option
  // todo: help option to print these items as help...
}>;
const initOptsAlias: Record<string, keyof InitOpts> = { s: 'start', u: 'userscript', c: 'cmd', co: 'continueAfterCmd' };

const rawInitArgs = process.argv.slice(2);
const initOpts: InitOpts & minimist.ParsedArgs = minimist(rawInitArgs, {alias: initOptsAlias, boolean: ['start', 'exitAfterCmd']});
const initArgs = [initOpts._[0], initOpts._.slice(1).join(' ')] as [string?, string?];


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

  const userscript: string|undefined = userScripts.s[initOpts.userscript ?? initArgs[0]];
  const [cmd, cmdFromArg]: [REPLCommand|undefined, boolean] = initOpts.cmd ? [r.commands[initOpts.cmd], false] : [r.commands[initArgs[0]], true];

  if (userscript) {
    await runUserscript(userscript);
    if (!initOpts.continueAfterCmd)
      process.exit();
  } else if (cmd) {
    await cmd.action.bind(r)(cmdFromArg ? initArgs[1] : initArgs.join(' '));
    if (!initOpts.continueAfterCmd)
      process.exit();
  } else if (initArgs[0]) {
    r.write(initArgs.join(' ') + '\n');
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
  if (rawInitArgs[0])
    changeDirectory(process.cwd());
  else  
    await setFolderRecursive(10);
  rl.close();
  startRepl().catch(console.trace);
})();
