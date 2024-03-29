import { readdirSync, readFileSync } from "fs";
import { r } from "..";
import ENV from "../ENV";
import { FileIteratorCallback, IMetadataFilterOpts, metadataFilterOpt, RawModule } from "../types";
import { changeDirectory, getCommandHelp, globalEval, resolvePath, setConfigItem } from "../util/replUtils";
import { config, IConfig, userScripts } from "../util/LocalStorage";
import { highlightLine } from "../util/replCustomization";
import { getCommand } from ".";
import { checkFilter, IScanOptions, scanOpt, verbose } from "../util";
import { WriteTags } from "exiftool-vendored";
import { ayaStorageDir } from "../util/localUtils";

const withCheckUserScriptKey = (fn: (key: string) => any) => (key: string) => {
  if (!userScripts.s[key])
    return console.error(`Userscript with key "${key}" sure doesn\'t seem to exist`);
  return fn(key);
};

export const helpp = (s_cmdName: string) => getCommandHelp(r, s_cmdName);

const Base: RawModule = {
  'ls': {
    help: 'Show entries in current directory or {$1} a relative/absolute directory you specify',
    noMetadata: true,
    getRun: (iterator) => (s_dirOverwrite: string = undefined) => {
      const dir = resolvePath(s_dirOverwrite || ENV.cwd)
      ENV.currentDirItems = readdirSync(dir);
      return iterator((e) => console.log(e.isDirectory() ? e.name+'/' : e.name), dir);
    }
  },

  'cd': {
    help: 'Change current directory',
    run: (s_dirPath: string) => changeDirectory(s_dirPath),
  },
  'cwd': {
    help: 'Get current working directory',
    run: () => console.log(ENV.cwd),
  },
  
  'helpp': {
    help: 'Get help for a specific command',
    run: helpp,
  },
  
  'configGet': {
    help: 'Print the contents of the config item with the key {$1}',
    run: <K extends keyof IConfig>(key: K) => console.log(config.s[key]),
  },
  'configSet': {
    help: 'Set the contents of config with the key {$1} to the code you define {$2}',
    run: setConfigItem,
  },
  'configReset': {
    help: 'Reset the config to its default values',
    run: config.reset,
  },
  'config': {
    help: 'List all config items',
    run: () => console.info('Current config:', verbose(config.s)),
  },
  
  'doForEach': { // todo: add shorthand for userscripts
    help: `For every entry in cwd execute callback {$1: (entry: Dirent, current directory: string) => void} | opts: ${metadataFilterOpt} ${scanOpt}`,
    getRun: iterate => async (callback: FileIteratorCallback, opts: IMetadataFilterOpts & IScanOptions) =>
      iterate((ent, folder) => checkFilter(ent, opts) ? callback(ent, folder) : null),
  },
  
  'userscriptList': {
    help: 'List all available userscripts',
    run: () => console.info(`Available userscripts: ${userScripts.getKeysString()}`),
  },
  'userscriptGet': {
    help: 'Print the contents of the userscript with the key {$1}',
    run: withCheckUserScriptKey((key: string) => console.log( userScripts.s[key].split('\n').map(line => highlightLine(line.trim())).join('\n') )),
  },
  // todo: somehow allow for difference between using '\n' in the script vs using it to distinguish between lines...
  'userscriptSet': {
    help: 'Set the contents of userscript with the key {$1} to the code you define {$2}',
    run: (key: string, ss_code: string) => {
      // todo: allow dashes in key
      userScripts.set(key, ss_code.replace(/\\n/g, '\n'));
    },
  },
  'userscriptDelete': {
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

  'mkdir': { run: s_dirName => global.mkdir(s_dirName) },
  'move': { run: (s_file: string, s_moveTo: string) => global.move(s_file, s_moveTo) },
  'copy': { run: (s_file: string, s_copyTo: string) => global.copy(s_file, s_copyTo) },
  'rename': { run: (s_file: string, s_newName: string) => global.rename(s_file, s_newName) },
  'remove': { run: (s_file: string) => global.remove(s_file) },
  'removeMulti': { run: (files: string|string[]) => global.removeMulti(files) },
  'metadata': { run: async (s_file: string) => console.logv(await global.metadata(s_file)) },
  'setTags': { run: async (s_file: string, tags: WriteTags) => global.setTags(s_file, tags) },

  'loadScript': {
    help: 'Load a script from the path {$1} you specify into the REPL context (silent version of .load), or directly from config.extraScriptsDir',
    run: (s_file: string) => global.loadScript(s_file, true),
  },
  'scr': {help: 'Shorthand for .loadScript', run: (s_file: string) => global.loadScript(s_file, true)},
  'pasteScript': {
    help: 'Paste some Javascript from your clipboard into the REPL context',
    run: () => global.pasteScript(),
  },

  'ayaStorageDir': {
    help: 'See where the aya\'s local files are stored',
    run: () => console.info(ayaStorageDir),
  },
};

// todo: also use this flexible logic in the normal REPL environment
export async function runScript(txt: string) {
  const lines = txt.split('\n').map(l => l.trim());
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
      try {
        await globalEval(`async () => ${line}`)();
      } catch (err) {
        // Thing failed, so just print it without await, whatever. If it still fails we'll get to see the error in the REPL
        r.write(line + '\n')
      }
  }
}

export default Base;
