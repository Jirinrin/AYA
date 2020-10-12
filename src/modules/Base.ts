import { r } from "..";
import ENV from "../ENV";
import { FileIteratorCallback, RawModule } from "../types";
import { changeDirectory, evalls, getCommandHelp, setConfigItem } from "../util/replUtils";
import { config, IConfig, userScripts } from "../util/LocalStorage";
import { highlightLine } from "../util/replCustomization";

const Base: RawModule = {
  'ls': {
    help: 'Show entries in current directory',
    getRun: iterator => () => iterator((e) => {
      console.log(e.isDirectory() ? e.name+'/' : e.name);
    }),
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
  'config': {
    help: 'List all config items',
    run: () => console.info(`Available config: ${config.getKeysString()}`),
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
    run: (key: string) => console.log(userScripts.s[key].split('\n').map(line => highlightLine(line.trim())).join('\n')),
  },
  'userscript-set': {
    help: 'Set the contents of userscript with the key {$1} to the code you define {$2}',
    run: (key: string, s_code: string) => userScripts.set(key, s_code.replace(/\\n/g, '\n')),
  },
  'userscript-delete': {
    help: 'Delete userscript with the key {$1}',
    run: (key: string) => userScripts.delete(key),
  },
  'userscript': {
    help: 'Run userscript with the key {$1}',
    run: (key: string) => r.write(userScripts.s[key] + "\n"),
  },

  // 'eval': {
  //   help: 'Forcibly execute (eval) code in the underlying node.js environment',
  //   run_s: globalEval,
  // },
};


export default Base;
