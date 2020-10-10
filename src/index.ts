import * as repl from 'repl';
import { CompleterResult, createInterface, cursorTo } from 'readline';
import chalk from 'chalk';
import refractor, { RefractorNode } from 'refractor';

import Modules from './modules';
import { Operation, FileIteratorCallback } from './types';
import './Global';
import './util/LocalStorage';
import { config, IConfig, logger, userScripts } from './util/LocalStorage';
import ENV from './ENV';
import { changeDirectory, evall, forEveryEntry, forEveryEntryDeep, getCommandHelp, globalEval, setConfigItem } from './util';
import highlightLookup from './highlightLookup'

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

interface ExtendedREPLCommand extends repl.REPLCommand {
  opts?: string[];
  optsValues?: Record<string, string[]>;
}

const wrappedEvall = (func: Function) => evall(func, r);

const completer = (line: string): CompleterResult => {
  let completions: string[] = [];
  let matchString = line;


  if (line.startsWith('.')) {
    const [cmdMatch, cmdName] = line.match(/^\.([\w-]+) +/) ?? [];
    if (cmdName && r.commands[cmdName]) {
      const {opts, optsValues} = r.commands[cmdName] as ExtendedREPLCommand;
      // console.log(JSON.stringify(commandData))
      const typingOption = line.match(/(--\w*)([= ]\w*)?$/);
      if (typingOption && opts) {
        const [typOptMatch, typOptName, typOptFromEquals] = typingOption;
        if (typOptFromEquals) {
          completions = optsValues[typOptName] ?? [];
          matchString = line.slice(typingOption.index+typOptName.length+1); // Assuming you put only one character between opt and value
        } else {
          completions = opts;
          matchString = line.slice(typingOption.index);
        }
      } else if (cmdName.match(/^userscript(?:-(get|set|delete))/)) {
        completions = Object.keys(userScripts.s);
        matchString = line.slice(cmdMatch.length);
      } else if (cmdName.match(/^config-[gs]et/)) {
        completions = Object.keys(config.s);
        matchString = line.slice(cmdMatch.length);
      } else if (cmdName === 'help') {
        completions = Object.keys(r.commands);
        matchString = line.slice(4+1+1);
      }
    } else {
      completions = Object.keys(r.commands);
      matchString = line.slice(1);
    }
  }

  const hits = completions.filter((c) => c.startsWith(matchString));
  return [hits, matchString];
}

function startRepl() {
  r = repl.start({
    ignoreUndefined: true,
    useGlobal: true,
    completer,
    useColors: true,
  });

  const rr = r as any;

  // todo: streamline this whole bunch of code

  const parseHighlightNode = (node: RefractorNode, classNames: string[] = []): string => {
    if (node.type === 'element')
      return node.children.map(c => parseHighlightNode(c, node.properties.className)).join('');

    let val = node.value;
    classNames.forEach(className => {
      if (className === 'token') return;
      const ch = highlightLookup[className];
      if (ch) val = ch(val);
      else logger.log('unknown highlight class:', className);
    });
    return val;
  };

  process.stdin.on('keypress', (c, k) => {
    if (!config.s.syntaxHighlighting) return;

    if (c !== "\"\\u0003\"" && c !== "\"\\r\"") {
      setTimeout(() => {
        const hlLine = refractor.highlight(rr.line, 'js')
          .map(c => parseHighlightNode(c))
          .join('');
        rr._refreshCurrentLine(hlLine);
      }, 0);
    }
  });

  function refreshCurrentLine(input: string) {
    const line = this._prompt + input;
    const cursorPos = this.getCursorPos();
    cursorTo(this.output, 0);
    this._writeToOutput(line);
    cursorTo(this.output, cursorPos.cols);
  }
  rr._refreshCurrentLine = refreshCurrentLine;

  // end todo streamline

  r.defineCommand('cd', {
    help: 'Change current directory',
    action: (newFolderName) => changeDirectory(newFolderName),
  });
  r.defineCommand('cwd', {
    help: 'Get current working directory',
    action: () => console.log(ENV.cwd),
  });

  r.defineCommand('helpp', {
    help: 'Get help for specific command',
    action: (commandName: string) => getCommandHelp(r, commandName),
  });

  r.defineCommand('config-get', {
    help: 'Print the contents of the config item with the key {$1}',
    action: wrappedEvall(<K extends keyof IConfig>(key: K) => console.log(config.s[key])),
  });
  r.defineCommand('config-set', {
    help: 'Set the contents of config with the key {$1} to the code you define {$2}',
    action: wrappedEvall(setConfigItem),
  });
  r.defineCommand('config', {
    help: 'List all config items',
    action: wrappedEvall(() => console.info(`Available config: ${config.getKeysString()}`)),
  });
  
  r.defineCommand('fee', {
    help: 'For every entry in folder execute callback {$1: (folder: string (irrelevant), entry: Dirent) => void}',
    action: wrappedEvall((callback: FileIteratorCallback) => forEveryEntry(ENV.cwd, callback)),
  });
  r.defineCommand('fee-deep', {
    help: 'For every entry in folder execute callback {$1: (folder: string (irrelevant?), entry: Dirent) => void} - does this recursively until the set depth',
    action: wrappedEvall((callback: FileIteratorCallback) => forEveryEntryDeep(ENV.cwd, callback)),
  });

  // r.defineCommand('eval', {
  //   help: 'Forcibly execute (eval) code in the underlying node.js environment',
  //   action: globalEval,
  // });

  r.defineCommand('userscripts', {
    help: 'List all available userscripts',
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

  config.validateJson();

  Object.entries(r.commands).forEach(([cmdName, command]) => {
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
