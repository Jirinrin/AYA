import { readdirSync } from "fs";
import { r } from "..";
import ENV from "../ENV";
import { FileIteratorCallback, IMetadataFilterOpts, RawModule } from "../types";
import { changeDirectory, evalls, getCommandHelp, resolvePath, setConfigItem } from "../util/replUtils";
import { config, IConfig, userScripts } from "../util/LocalStorage";
import { highlightLine } from "../util/replCustomization";
import { getCommand } from ".";
import { checkMetadata, verbose } from "../util";

const withCheckUserScriptKey = (fn: (key: string) => any) => (key: string) => {
  if (!userScripts.s[key])
    return console.error(`Userscript with key "${key}" sure doesn\'t seem to exist`);
  return fn(key);
};

const Base: RawModule = {
  'ls': {
    help: 'Show entries in current directory or {$1} a relative/absolute directory you specify',
    getRun: (iterator) => (s_dirOverwrite: string = undefined) => {
      const dir = resolvePath(s_dirOverwrite || ENV.cwd)
      ENV.currentDirItems = readdirSync(dir);
      return iterator((e) => {
        console.log(e.isDirectory() ? e.name+'/' : e.name);
      }, dir)
    }
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
    help: 'Get help for a specific command',
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
  
  'doForEach': { // todo: add shorthand for userscripts
    help: 'For every entry in cwd execute callback {$1: (entry: Dirent, current directory: string) => void} | opts: --musicFiles, --imageFiles',
    getRun: iterate => (callback: FileIteratorCallback, opts: IMetadataFilterOpts) => iterate((ent, folder) => {
      if (!checkMetadata(ent, opts))
        return;
      return callback(ent, folder);
    }),
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
      // todo: allow dashes in key
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
    run: withCheckUserScriptKey((s_key: string) => runScript(userScripts.s[s_key] + "\n")),
  },
  'u': {
    help: 'Run userscript with the key {$1} (shorthand for .userscript)', // todo: only parse this in userscript and not show in help
    run: withCheckUserScriptKey((s_key: string) => runScript(userScripts.s[s_key] + "\n")),
  },

  // 'eval': {
  //   help: 'Forcibly execute (eval) code in the underlying node.js environment',
  //   run_s: globalEval,
  // },

  'mkdir': { run_s: dirName => global.mkdir(dirName) },
  'move': { run: (s_file: string, s_moveTo: string) => global.move(s_file, s_moveTo) },
  'copy': { run: (s_file: string, s_copyTo: string) => global.copy(s_file, s_copyTo) },
  'rename': { run: (s_file: string, s_newName: string) => global.rename(s_file, s_newName) },
  'metadata': { run: async (s_file: string) => console.logv(await global.metadata(s_file)) },
};

// todo: also use this flexible logic in the normal REPL environment
export async function runScript(txt: string) {
  const lines = txt.split(/&&|\n/).map(l => l.trim());
  for (const line of lines) {
    if (!line.trim()) continue;

    const userscript: string|undefined = userScripts.s[line.match(/\.u(?:serscript)? +(\S+)/)?.[1] ?? line.match(/^(\S+)/)?.[1]];

    const [cmdMatch, cmdName] = line.startsWith('.') ? getCommand(line) : line.match(/^(\S+) */);
    const cmd = r.commands[cmdName];

    if (userscript)
      await runScript(userscript);
    else if (cmd)
      await r.commands[cmdName].action.bind(r)(line.slice(cmdMatch.length));
    else if (line !== '')
      r.write(line + '\n'); // todo: globalEval? (so you can await it?)
  }
}

export default Base;
