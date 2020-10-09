import * as repl from 'repl';
import { CompleterResult, createInterface } from 'readline';
import chalk from 'chalk';

import * as U from './IndexUtil';
import Modules from './modules';
import { Operation, FileIteratorCallback } from './types';
import { evall, globalEval } from './IndexUtil';
import './Global';
import './LocalStorage';
import { config, userScripts } from './LocalStorage';
import ENV from './ENV';

const prevConsoleLog = console.log;
const prevConsoleWarn = console.warn;
const prevConsoleError = console.error;
const prevConsoleInfo = console.info;
console.log = (...args: any[]) => prevConsoleLog(chalk.green(...args));
console.warn = (...args: any[]) => prevConsoleWarn(chalk.magenta(...args));
console.error = (...args: any[]) => prevConsoleError(chalk.redBright(...args));
console.info = (...args: any[]) => prevConsoleInfo(chalk.cyan(...args));

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});
let r: repl.REPLServer;


const wrappedEvall = (func: Function) => evall(func, r);

const completer = (line: string): CompleterResult => {
  try {

    let completions: string[] = [];
    let matchString = line;
  
    const userScriptMatch = line.match(/^\.userscript(?:-(get|set|delete))? /);
    if (userScriptMatch) {
      completions = Object.keys(userScripts.s);
      matchString = line.slice(userScriptMatch[0].length);
    } else if (line.startsWith('.')) {
      completions = Object.keys(r.commands);
      matchString = line.slice(1);
    }
  
    const hits = completions.filter((c) => c.startsWith(matchString));
    return [hits, matchString];
  } catch (err) {
    console.error('yabai!!', err);
  }
}

function startRepl() {
  r = repl.start({
    ignoreUndefined: true,
    useGlobal: true,
    completer,
  });

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
    action: (newDepth: string) => config.set('recursionDepth', Number(newDepth)),
  });
  // r.defineCommand('toggle-mm', {
  //   help: 'toggle access to music metadata',
  //   action: () => U.setEnvVar('musicMetadata', !ENV.musicMetadata),
  // });
  Object.keys(ENV).forEach((key) => {
    r.defineCommand(key, {
      help: `Print current value of env item "${key}"`,
      action: () => console.log(ENV[key]),
    })
  });
  Object.keys(config).forEach((key) => {
    r.defineCommand(key, {
      help: `Print current value of config item "${key}"`,
      action: () => console.log(config.s[key]),
    })
  });
  
  r.defineCommand('fee', {
    help: 'For every entry in folder execute callback {$1: (folder: string (irrelevant), entry: Dirent) => void}',
    action: wrappedEvall((callback: FileIteratorCallback) => U.forEveryEntry(ENV.folder, callback)),
  });
  r.defineCommand('fee-deep', {
    help: 'For every entry in folder execute callback {$1: (folder: string (irrelevant?), entry: Dirent) => void} - does this recursively until the set depth',
    action: wrappedEvall((callback: FileIteratorCallback) => U.forEveryEntryDeep(ENV.folder, callback)),
  });

  // r.defineCommand('eval', {
  //   help: 'Forcibly execute (eval) code in the underlying node.js environment',
  //   action: globalEval,
  // });

  r.defineCommand('userscripts', {
    help: 'Show what userscripts are available for you',
    action: wrappedEvall(() => console.info(`Available userscripts: ${userScripts.getKeysString()}`)),
  });
  r.defineCommand('userscript-get', {
    help: 'Print the contents of the userscript with the key {$1}',
    action: wrappedEvall((key: string) => console.log(userScripts.s[key])),
  });
  r.defineCommand('userscript-set', {
    help: 'Set the contents of userscript with the key {$1} to the code you define {$2}',
    action: wrappedEvall((key: string, s_code: string) => userScripts.set(key, s_code.replace(/\\n/g, '\n'))),
  });
  r.defineCommand('userscript-delete', {
    help: 'Delete userscript with the key {$1}',
    action: wrappedEvall((key: string) => userScripts.delete(key)),
  });
  r.defineCommand('userscript', {
    help: 'Run userscript with the key {$1}',
    action: wrappedEvall((key: string) => r.write(userScripts.s[key] + "\n")),
  });

  Modules.forEach((mod) => {
    mod.forEach((op: Operation) => {
      r.defineCommand(op.abbrev, {
        help: `${op.help}`,
        action: wrappedEvall(op.run),
      });
    });
  });
}

function setFolderRecursive(repeatTimes: number, rootResolve?: () => void): Promise<void> {
  const triesLeft = repeatTimes - 1;

  return new Promise((res, rej) => {
    try {
      rl.question(`What folder (type nothing to use the current working directory)\n`, (answer) => {
        const resolve = rootResolve || res;

        if (!triesLeft)
          return console.log('Max tries were exceeded. Please set the folder via the .cd command');
        if (U.changeDirectory(answer) || triesLeft <= 0)
          return resolve();
        else if (!answer) {
          console.log('...Never mind that => using cwd');
          U.changeDirectory(process.cwd());
          // U.changeDirectory(path.resolve('.'));
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
