import * as chalk from 'chalk';
import { execSync } from "child_process";
import { r } from ".";
import ENV from "./ENV";
import * as JSONbig from 'json-bigint';
import * as fs from "fs";
import * as path from "path";
import * as lodash from "lodash";
import * as req from 'superagent';
import * as trash from 'trash';
import NodeID3 = require('node-id3');
import { readSync as readFromClipboard, writeSync as writeToClipboard } from 'clipboardy';
import { changeDirectory, loadCoad, loadScript, resolvePath, wrapResolvePath1, wrapResolvePath1Folder, wrapResolvePath2 } from "./util/replUtils";
import { doForEach, doForEachDeep, getEnts, getEntsWithMetadata, highlightExp, highlightExpsC, esc, pathToDirent, putMetadataOnEntity, readJson, simpleCopy, simpleMove, simpleRename, verbose, writeFile, writeJson, readFile, escPath, cwdRel, checkEntFilters, IGetEntsFilters, IScanOptions, wrapScanOptions, getEntsDeep, splitFileName, mkdirSafe, withFinally } from "./util";
import { DirentWithData, FileIteratorCallback } from "./types";
import { setExifMetadata } from "./util/exif";
import { indent, setConsoleIndent, withDeeperIndentation } from './util/consoleExtension';
import { escapeRegExp } from 'lodash';
import { highlight } from './util/replCustomization';
import { getTrackInfoFromMetadata, writeMp3Metadata } from './util/music';
import { userStorage } from './util/LocalStorage';
import { getAyaRootDir } from './util/localUtils';

export {};

type ExecSharedOpts = {cwd?: string, allowFail?: boolean}
interface Exec {
  (cmd: string, opts?: ExecSharedOpts): null;
  (cmd: string, opts?: ExecSharedOpts & {printOutput?: true, getOutput?: false}): null;
  (cmd: string, opts?: ExecSharedOpts & {printOutput?: true, getOutput: true}): string;
  (cmd: string, opts?: ExecSharedOpts & {printOutput: false, getOutput?: true}): string;
}

const globalAdditions = {
  /** Execute a command that will be executed in the underlying shell environment. */
  exec: ((cmd: string, opts: {printOutput?: boolean, getOutput?: boolean, cwd?: string, allowFail?: boolean} = {}) => {
    console.debug(cmd);

    try {
      // todo: this outputs annoying gibberish when there are non-ascii characters in the output. (See https://stackoverflow.com/a/59635209 but that doesn't even seem to work)
      const output = execSync(cmd, {
        cwd: opts.cwd ?? ENV.cwd,
        stdio: opts.printOutput === false || opts.getOutput ? 'pipe' : 'inherit',
      })?.toString();
  
      if (opts.printOutput !== false && opts.getOutput)
        console.log(output);
      return output;
    } catch (err) {
      if (!opts.allowFail) throw err;
    }
  }) as Exec,

  /**
   * Generates a script based on the history of what you typed in the REPL. Three alternatives for specifying this in the params:
   * [int]: the total number of lines going back that you want
   * [int, int]: the range of lines that you want (e.g. [2, 4] gets the last 4 lines except the last line you typed)
   * [...int[]]: the indices of the lines that you wanted, counting back from the current line
   */
  scriptFromHistory: (...items: number[]) => {
    const lines = items.length === 1 
      ? r.history.slice(1, items[0]+1)
      : items.length === 2
        ? r.history.slice(items[0], items[1])
        : items.map(i => r.history[i]);
    return lines.reverse().join(' \n ');
  },

  env: ENV,
  JSONbig: JSONbig,

  mkdir: wrapResolvePath1(path => {
    const createdPath = mkdirSafe(path);
    console.log(highlightExp`Made dir "${cwdRel(createdPath)}"`);
    return createdPath;
  }),
  exists: wrapResolvePath1(fs.existsSync),
  move: wrapResolvePath2((filePath, moveToFolder, newFileName?: string) => {
    const movedPath = simpleMove(path.dirname(filePath), path.basename(filePath), moveToFolder, fs.statSync(filePath).isDirectory(), newFileName);
    console.log(highlightExp`Moved "${cwdRel(filePath)}" to "${cwdRel(movedPath)}"`);
    return movedPath;
  }),
  copy: wrapResolvePath2((filePath, copyToFolder, newFileName?: string) => {
    const copiedPath = simpleCopy(path.dirname(filePath), path.basename(filePath), copyToFolder, fs.statSync(filePath).isDirectory(), newFileName);
    console.log(highlightExp`Copied "${cwdRel(filePath)}" to "${cwdRel(copiedPath)}"`);
    return copiedPath;
  }),
  rename: wrapResolvePath1((filePath, newFileName: string, withoutExt?: boolean) => {
    const ent = pathToDirent(filePath);
    const renamedpath = simpleRename(path.dirname(filePath), path.basename(filePath), withoutExt ? `${newFileName}.${ent.ext}` : newFileName, fs.statSync(filePath).isDirectory())
    if (renamedpath !== ent.path)
      console.log(highlightExp`Renamed "${cwdRel(filePath)}" to "${path.basename(renamedpath)}"`);
    return renamedpath;
  }),
  remove: wrapResolvePath1(async filePath => {
    await trash(filePath);
    console.log(highlightExpsC(chalk.red)`Moved "${cwdRel(filePath)}" to trash`);
  }),
  removeMulti: async (filePaths: string|string[]) => {
    console.log(`Going to remove ${typeof filePaths === 'string' ? '1' : filePaths.length} entities...`);
    if (typeof filePaths === 'string')
      filePaths = [filePaths];

    await trash(filePaths);
    console.log(`Moved ${verbose(filePaths.map(cwdRel))} to trash`);
  },
  metadata: wrapResolvePath1(async (filePath) => {
    return putMetadataOnEntity(pathToDirent(filePath)).catch(err => console.error('Error with getting metadata:', err));
  }),
  getEnts: wrapResolvePath1Folder(getEnts),
  getFirstEnt: wrapResolvePath1Folder((filePath): DirentWithData|undefined => getEnts(filePath)[0]),
  getEntsDeep: wrapResolvePath1Folder(getEntsDeep),
  getEntsWithMetadata: wrapResolvePath1Folder(getEntsWithMetadata),
  getEntsNames: wrapResolvePath1Folder((filePath, opts) => getEnts(filePath, opts).map(e => e.name)),
  getFirstEntName: wrapResolvePath1Folder((filePath, opts): string|undefined => getEnts(filePath, opts).map(e => e.name)[0]),

  doForEach: wrapResolvePath1(async (filePath, callback: FileIteratorCallback, opts: IGetEntsFilters & IScanOptions = {}) =>
    wrapScanOptions(opts, () => 
      doForEach(filePath, (e, f) => checkEntFilters(e, opts) ? callback(e, f) : null)
    )
  ),
  doForEachDeep: wrapResolvePath1(async (filePath, callback: FileIteratorCallback, opts: IGetEntsFilters & IScanOptions = {}) =>
    wrapScanOptions(opts, () =>
      doForEachDeep(filePath, (e, f) => checkEntFilters(e, opts) ? callback(e, f) : null)
    )
  ),

  cd: (toDir: string): void => {
    const result = changeDirectory(toDir);
    if (result == false)
      throw new Error("Change directory failed");
  },
  withCwd: wrapResolvePath1(<T>(tempCwd: string, callback: () => T): T => {
    const originalCwd = ENV.cwd;
    if (!changeDirectory(tempCwd, true)) return;
    return withFinally(() => withDeeperIndentation(callback), () => changeDirectory(originalCwd, true))
  }),

  setTags: wrapResolvePath1(setExifMetadata),
  getTrackInfoFromMetadata,
  writeMp3Metadata: wrapResolvePath1(writeMp3Metadata),
  readMp3Metadata: wrapResolvePath1(filePath => NodeID3.read(filePath)),

  readJson: wrapResolvePath1(readJson),
  readFile: wrapResolvePath1(readFile),
  writeJson: wrapResolvePath1(writeJson),
  writeFile: wrapResolvePath1(writeFile),
  editFile: wrapResolvePath1((filePath, editCallback: (fileContents: string) => string) =>
    writeFile(filePath, editCallback(readFile(filePath)))),
  createWriteStream: wrapResolvePath1(fs.createWriteStream),

  showColor: (hex: string, customStr?: string) => console.log(chalk.bgHex(hex).black(customStr ?? hex)),

  ch: chalk,
  lo: lodash,
  req,

  resolvePath,
  cwdRel,
  esc,
  escPath,

  copyClb: writeToClipboard,
  copyClbJSON: (entity: any) => writeToClipboard(JSON.stringify(entity)),

  pasteClb: readFromClipboard,
  pasteScript: () => loadCoad(readFromClipboard(), true),
  pasteClbJSON: () => JSON.parse(readFromClipboard()),
  editClb: (editCallback: (oldClb: string) => string) =>
    writeToClipboard(editCallback(readFromClipboard())),

  setConsoleIndent,
  withDeeperIndentation,
  highlightExp,

  userStorage,

  splitFileName,
  basenameBase: (filePathOrName: string) => splitFileName(path.basename(filePathOrName))[0],

  question: async (q: string) => {
    const answer = await new Promise<string>(res => r.question(indent() + chalk.magentaBright(`${q} `), res));
    return answer.trim();
  },

  loadScript: (file: string, logAdded = false) => loadScript(file, logAdded),

  typeDocs: undefined,
};

(() => {
  const globalDeclarationsContents = readFile(path.join(getAyaRootDir(), 'aya.global.d.ts'));

  const typeDefRgx = /type (\w+) = (.+);/;
  const typeDocs: Record<string, string> = {};
  globalDeclarationsContents.match(new RegExp(typeDefRgx, 'g')).forEach(line => {
    const [, name, def] = line.match(typeDefRgx);
    typeDocs[name] = def;
  });

  globalAdditions.typeDocs = typeDocs;

  const typeDocsTypes = Object.keys(typeDocs);
  const typeDocsTypesMatch = new RegExp(typeDocsTypes.map(escapeRegExp).join('|'));
  
  const makeTypeDefFn = (decl: string) => {
    const fn = () => console.log(highlight(decl, 'ts'));
    fn._ = decl;
    return fn;
  }
  const makeTypeDefFnX = (decl: string) => (iter = 100) => {
    var d = decl;
    while (typeDocsTypesMatch.test(d) && --iter >= 0)
      d = typeDocsTypes.filter(t => d.includes(t)).reduce((str, t) => str.replace(t, typeDocs[t]), d);
    return makeTypeDefFn(d)();
  }

  // todo: maybe match multi-line jsdoc comments
  const declRgx = /(?:\/\*\* (.+) \*\/[\n\r]+)? *function (\w+)(\(.+\):.+);/;
  globalDeclarationsContents.match(new RegExp(declRgx, 'g')).forEach(line => {
    const [, doc, fnName, decl] = line.match(declRgx);
    // console.log('decl', line, fnName, decl)
    const actualFunction = globalAdditions[fnName];
    if (!actualFunction || 'type' in actualFunction) return;

    const tp = decl.replace(/\):/g, ') =>');

    if (doc) actualFunction.doc = doc;
    Object.defineProperty(actualFunction, 'type', {get: makeTypeDefFn(tp) });
    actualFunction.typeS = tp;
    actualFunction.typeX = makeTypeDefFnX(tp);
  });
})();

type GlobalAdditions = typeof globalAdditions;

declare global {
  namespace NodeJS {
    interface Global extends GlobalAdditions {}
  }
}

Object.assign(global, globalAdditions);
