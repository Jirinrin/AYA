import { r } from "..";
import ENV from "../ENV";
import { FileIteratorCallback, RawModule } from "../types";
import { changeDirectory, evalls, getCommandHelp, getDirectory, setConfigItem } from "../util/replUtils";
import { config, IConfig, userScripts } from "../util/LocalStorage";
import { highlightLine } from "../util/replCustomization";
import { getCommand } from ".";

const withCheckUserScriptKey = (fn: (key: string) => any) => (key: string) => {
  if (!userScripts.s[key]) return console.error(`Userscript with key ${key} sure doesn\'t seem to exist`);
  return fn(key);
};

const Base: RawModule = {
  'ls': {
    help: 'Show entries in current directory',
    getRun: (iterator) => (s_dirOverwrite: string = undefined) =>
      iterator((e) => {
        console.log(e.isDirectory() ? e.name+'/' : e.name);
      }, getDirectory(s_dirOverwrite || ENV.cwd))
  },

  'cd': {
    help: 'Change current directory',
    run_s: changeDirectory,
  },
  'cwd': {
    help: 'Get current working directory',
    run_s: () => console.log(ENV.cwd),
  },
  
  'helpp': {
    help: 'Get help for specific command',
    run_c: evalls((commandName: string) => getCommandHelp(r, commandName)),
  },
  
  'config-get': {
    help: 'Print the contents of the config item with the key {$1}',
    run: <K extends keyof IConfig>(key: K) => console.log(config.s[key]),
  },
  'config-set': {
    help: 'Set the contents of config with the key {$1} to the code you define {$2}',
    run: setConfigItem,
  },
  'config-reset': {
    help: 'Reset the config to its default values',
    run_s: config.reset,
  },
  'config': {
    help: 'List all config items | opts: --withValues(-v)',
    run: (opts: {withValues: boolean}) => console.info('Available config:', opts.withValues ? verbose(config.s) :config.getKeysString()),
  },
  
  'doForEach': {
    help: 'For every entry in cwd execute callback {$1: (entry: Dirent, current directory: string) => void}',
    getRun: iterate => (callback: FileIteratorCallback) => iterate(callback),
  },
  
  'userscripts': {
    help: 'List all available userscripts',
    run: () => console.info(`Available userscripts: ${userScripts.getKeysString()}`),
  },
  'userscript-get': {
    help: 'Print the contents of the userscript with the key {$1}',
    run: withCheckUserScriptKey((key: string) => console.log( userScripts.s[key].split('\n').map(line => highlightLine(line.trim())).join('\n') )),
  },
  'userscript-set': {
    help: 'Set the contents of userscript with the key {$1} to the code you define {$2}',
    run: (key: string, ss_code: string) => {
      userScripts.set(key, ss_code.replace(/\\n/g, '\n'));
    },
  },
  'userscript-delete': {
    help: 'Delete userscript with the key(s) {$1} {$...}',
    run: (...keys: string[]) => {
      keys.forEach(withCheckUserScriptKey(key => userScripts.delete(key)));
    },
  },
  'userscript': {
    help: 'Run userscript with the key {$1}',
    run: withCheckUserScriptKey((key: string) => runUserscript(userScripts.s[key] + "\n")),
  },

  // 'eval': {
  //   help: 'Forcibly execute (eval) code in the underlying node.js environment',
  //   run_s: globalEval,
  // },
};

export async function runUserscript(txt: string) {
  const lines = txt.split('\n').map(l => l.trim());
  for (const line of lines) {
    if (line.startsWith('.')) {
      const [cmdMatch, cmdName] = getCommand(line);
      await r.commands[cmdName].action.bind(r)(line.slice(cmdMatch.length));
    } else if (line !== '') {
      r.write(line);
    }
  }
}

export default Base;
