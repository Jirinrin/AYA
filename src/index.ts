import * as repl from 'repl';
import { createInterface } from 'readline';

import Modules from './modules';
import { Operation, FileIteratorCallback, FileIteratorCallbackSimple } from './types';
import './Global';
import './util/LocalStorage';
import { config, IConfig, userScripts } from './util/LocalStorage';
import ENV from './ENV';
import { changeDirectory, evall, forEveryEntrySimple, forEveryEntryDeep, getCommandHelp, ls, setConfigItem, evalls } from './util';
import { completer, setupSyntaxHighlighting } from './util/replCustomization';

setConsoleIndent(0);

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});
export let r: repl.REPLServer;

export interface ExtendedREPLCommand extends repl.REPLCommand {
  opts?: string[];
  optsValues?: Record<string, string[]>;
}

function startRepl() {
  r = repl.start({
    ignoreUndefined: true,
    useGlobal: true,
    completer,
    useColors: true,
  });

  setupSyntaxHighlighting(r);

  r.defineCommand('cd', {
    help: 'Change current directory',
    action: evalls(changeDirectory),
  });
  r.defineCommand('cwd', {
    help: 'Get current working directory',
    action: evalls(() => console.log(ENV.cwd)),
  });
  r.defineCommand('ls', {
    help: 'Show entries in current directory',
    action: evalls(ls),
  });

  r.defineCommand('helpp', {
    help: 'Get help for specific command',
    action: evalls((commandName: string) => getCommandHelp(r, commandName)),
  });

  r.defineCommand('config-get', {
    help: 'Print the contents of the config item with the key {$1}',
    action: evall(<K extends keyof IConfig>(key: K) => console.log(config.s[key])),
  });
  r.defineCommand('config-set', {
    help: 'Set the contents of config with the key {$1} to the code you define {$2}',
    action: evall(setConfigItem),
  });
  r.defineCommand('config', {
    help: 'List all config items',
    action: evall(() => console.info(`Available config: ${config.getKeysString()}`)),
  });
  
  r.defineCommand('fee', {
    help: 'For every entry in cwd execute callback {$1: (entry: Dirent) => void}',
    action: evall((callback: FileIteratorCallbackSimple) => forEveryEntrySimple(ENV.cwd, callback)),
  });
  r.defineCommand('fee-deep', {
    help: 'For every entry in cwd execute callback {$1: (current directory: string, entry: Dirent) => void} - does this recursively until the set depth',
    action: evall((callback: FileIteratorCallback) => forEveryEntryDeep(ENV.cwd, callback)),
  });

  // r.defineCommand('eval', {
  //   help: 'Forcibly execute (eval) code in the underlying node.js environment',
  //   action: globalEval,
  // });

  r.defineCommand('userscripts', {
    help: 'List all available userscripts',
    action: evall(() => console.info(`Available userscripts: ${userScripts.getKeysString()}`)),
  });
  r.defineCommand('userscript-get', {
    help: 'Print the contents of the userscript with the key {$1}',
    action: evall((key: string) => console.log(userScripts.s[key])),
  });
  r.defineCommand('userscript-set', {
    help: 'Set the contents of userscript with the key {$1} to the code you define {$2}',
    action: evall((key: string, s_code: string) => userScripts.set(key, s_code.replace(/\\n/g, '\n'))),
  });
  r.defineCommand('userscript-delete', {
    help: 'Delete userscript with the key {$1}',
    action: evall((key: string) => userScripts.delete(key)),
  });
  r.defineCommand('userscript', {
    help: 'Run userscript with the key {$1}',
    action: evall((key: string) => r.write(userScripts.s[key] + "\n")),
  });

  Modules.forEach((mod) => {
    mod.forEach((op: Operation) => {
      r.defineCommand(op.cmdName, {
        help: `${op.help}`,
        action: evall(op.run),
      });
    });
  });

  config.validateJson();

  Object.entries(r.commands).forEach(([, command]) => {
    if (command.help.includes('opts:')) {
      (command as ExtendedREPLCommand).opts = command.help
        .match(/--[\w=|]+/g)
        .map(o => {
          let [opt, val] = o.split('=', 2);
          if (val) {
            if (val.includes('|'))
              ((command as ExtendedREPLCommand).optsValues??={})[opt] = val.split('|');
            opt += '=';
          }
          return opt;
        });
    }
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
