import * as repl from 'repl';
import { createInterface } from 'readline';
import minimist = require('minimist');
import { join as joinPath } from 'path';

import Modules from './modules';
import { Module } from './types';
import './Global';
import { config, ayaStorageDir } from './util/LocalStorage';
import { changeDirectory, globalEval } from './util/replUtils';
import { completer, setupReplCustomization } from './util/replCustomization';
import { setConsole } from './util/consoleExtension';
import { runScript } from './modules/Base';
import { readFileSync } from 'fs-extra';
import { evalRawStrings, getEnts } from './util';
import { REPLEval } from 'repl';
import ENV from './ENV';

setConsole();

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});
export let r: repl.REPLServer;

const initOptBools = ['start', 'continueAfterCmd', 'help'] as const;
const initOptStrings = ['dir'] as const;
const initOptsAll = [...initOptBools, ...initOptStrings];
type InitOptBools = typeof initOptBools[number];
type InitOptStrings = typeof initOptStrings[number];
type InitOpts = Record<InitOptBools, boolean> & Record<InitOptStrings, string>;
const initOptsAlias: Partial<Record<keyof InitOpts, string>> = { start: 's', continueAfterCmd: 'c', dir: 'd' };
const initOptsAliasReverse = Object.fromEntries(Object.entries(initOptsAlias).map(([k,v]) => [v,k]));

const rawInitArgs = process.argv.slice(2);
const initOpts: InitOpts & minimist.ParsedArgs = minimist(rawInitArgs, {alias: initOptsAliasReverse, boolean: initOptBools as any, string: initOptStrings as any}) as InitOpts & minimist.ParsedArgs;
const initBody = initOpts._.join(' ');


async function startRepl() {
  r = repl.start({
    ignoreUndefined: true,
    useGlobal: true,
    completer,
    useColors: true,
  });

  r.setupHistory(joinPath(ayaStorageDir, 'aya-history.txt'), (err => err && console.warn('Error loading history:', err)))

  const originalEval = r.eval;
  const newEval: REPLEval = (code, ...etc) => originalEval.call(r, evalRawStrings(code), ...etc);
  (r as any).eval = newEval;

  r.on('exit', process.exit);

  Object.values(Modules).forEach((mod: Module) => {
    Object.entries(mod).forEach(([k, op]) => {
      r.defineCommand(k, op);
    });
  });

  setupReplCustomization(r);

  config.validateJson();

  if (config.s.initScriptsDir) {
    // todo: somehow allow this to expose functions as 'commands'.
    getEnts(config.s.initScriptsDir, { ext: 'js' }).forEach(ent => globalEval(readFileSync(ent.path).toString()));
  }

  if (config.s.extraScriptsDir) {
    ENV.extraScriptsDirItems = getEnts(config.s.extraScriptsDir, { ext: /[jt]s/ }).map(e => e.name);
  }

  if (initBody) {
    await runScript(initBody.replace('\\n', '\n').replace(';;', '\n'));
    
    if (!initOpts.continueAfterCmd)
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
  if (initOpts.help) {
    console.log('Available options:\n' + initOptsAll.map(k => `--${k}` + (initOptsAlias[k] ? ` (-${initOptsAlias[k]})` : ``)).join('\n'));
    process.exit();
  }
  if (rawInitArgs[0] || config.s.alwaysStart)
    changeDirectory(initOpts.dir ?? process.cwd());
  else  
    await setFolderRecursive(10);
  rl.close();
  startRepl().catch(console.trace);
})();
