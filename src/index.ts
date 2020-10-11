import * as repl from 'repl';
import { createInterface } from 'readline';

import Modules from './modules';
import { Operation } from './types';
import './Global';
import './util/LocalStorage';
import { config } from './util/LocalStorage';
import { changeDirectory, evall, evalls, setConsole } from './util';
import { completer, setupReplCustomization } from './util/replCustomization';

setConsole();

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});
export let r: repl.REPLServer;

export interface CommandInfo {
  help: string;
  opts?: string[];
  renderOpts?: string[]; // parallel to opts
  optsValues?: Record<string, string[]>;
  optsAliases?: Record<string, string>;
}
export const cmdInfo: Record<string, CommandInfo> = {};

function startRepl() {
  r = repl.start({
    ignoreUndefined: true,
    useGlobal: true,
    completer,
    useColors: true,
  });

  try {
    Modules.forEach((mod) => {
      // todo: move logic to modules/index.ts
      mod.forEach((op: Operation) => {
        const info: CommandInfo = { help: op.help };
        op.help
          .match(/--[\w=|\(\)-]+/g)
          ?.forEach(o => {
            let [_, opt, alias, val] = o.match(/^--([^\(\)=]+)(?:\(-(\w)\))?(?:=(.+))?$/) ?? [];
            if (!_) return;
            (info.opts??=[]).push(opt);
            (info.renderOpts??=[]).push(`--${opt}` + (val ? '=' : ''));
            if (val?.includes('|'))
              (info.optsValues??={})[opt] = val.split('|');
            if (alias)
              (info.optsAliases??={})[alias] = opt; // does this go well now?
          });
        cmdInfo[op.cmdName] = info;
  
        r.defineCommand(op.cmdName, {
          help: op.help,
          action: op.simple ? evalls(op.run) : evall(op.run, info),
        });
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
