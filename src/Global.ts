import * as chalk from 'chalk';
import { exec } from "child_process";
import { r } from ".";
import ENV from "./ENV";
import * as JSONbig from 'json-bigint';
import * as fs from "fs";
import * as path from "path";
import * as lodash from "lodash";
import * as req from 'superagent';
import * as trash from 'trash';
import { readSync as readFromClipboard, writeSync as writeToClipboard } from 'clipboardy';
import { globalEval, resolvePath, wrapResolvePath1, wrapResolvePath2 } from "./util/replUtils";
import { doForEach, doForEachDeep, getEnts, getEntsWithMetadata, highlightExp, highlightExpsC, esc, pathToDirent, putMetadataOnEntity, readJson, simpleCopy, simpleMove, simpleRename, verbose, writeFile, writeJson, readFile, escPath, cwdRel, checkEntFilters, IGetEntsFilters, IScanOptions, wrapScanOptions, getEntsDeep, splitFileName, mkdirSafe } from "./util";
import { FileIteratorCallback } from "./types";
import { setExifMetadata } from "./util/exif";
import { setConsoleIndent } from './util/consoleExtension';
import { escapeRegExp } from 'lodash';
import { highlight } from './util/replCustomization';
import { listLanguages } from 'refractor';

export {};

const globalAdditions = {
  /**
   * Execute a command that will be executed in the underlying shell environment.
   */
  exec: (cmd: string, printOutput = true) =>
    // todo: use execSync/spawnSync or promisify
    new Promise((res, rej) =>
      // todo: use spawn https://stackoverflow.com/questions/10232192/exec-display-stdout-live
      exec(cmd, {
        cwd: ENV.cwd,
      }, (error, stdout, stderr) => {
        if (printOutput)
          console.log(stdout);
        if (error) {
          console.error('Error encountered:');
          console.error(stderr);
          rej(stderr);
        } else {
          res(stdout);
        }
      })
    ),
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
  resolvePath,
  getEnts: wrapResolvePath1(getEnts),
  getEntsDeep: wrapResolvePath1(getEntsDeep),
  getEntsWithMetadata: wrapResolvePath1(getEntsWithMetadata),
  getEntsNames: wrapResolvePath1((filePath, opts) => getEnts(filePath, opts).map(e => e.name)),

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

  readJson: wrapResolvePath1(readJson),
  readFile: wrapResolvePath1(readFile),
  writeJson: wrapResolvePath1(writeJson),
  writeFile: wrapResolvePath1(writeFile),

  showColor: (hex: string, customStr?: string) => console.log(chalk.bgHex(hex).black(customStr ?? hex)),

  lo: lodash,
  req,

  setTags: wrapResolvePath1(setExifMetadata),

  esc,
  escPath,
  cwdRel,

  copyClb: writeToClipboard,
  copyClbJSON: (entity: any) => writeToClipboard(JSON.stringify(entity)),
  // todo: aren't these better suited as commands?
  pasteClb: readFromClipboard,
  pasteClbJS: () => globalEval(readFromClipboard()),
  pasteClbJSON: () => JSON.parse(readFromClipboard()),

  setConsoleIndent,
  highlightExp,
  listlan: listLanguages,

  splitFileName,

  question: (q: string) => new Promise(res => r.question(chalk.magentaBright(`${q} `), res)),

  typeDocs: undefined,
};

// todo: rename 'doc' to 'type', and add actual docs that are a sentence or two about the function at hand

// todo: somehow automatically generate these docs
const globalItemDocs: Partial<Record<keyof typeof globalAdditions, string>> = {
  doForEach: '(filePath: string, callback: FileIteratorCallback, opts: IGetEntsFilters & IScanOptions = {}) => void',
  doForEachDeep: '(filePath: string, callback: FileIteratorCallback, opts: IGetEntsFilters & IScanOptions = {}) => void',
};

// todo: somehow automatically generate these docs
const typeDocs = {
  FileIteratorCallback: '(ent: DirentWithMetadata, folder: string) => void',
  IGetEntsFilters: '{ entType?: EntityType; filter?: string|RegExp; ext?: string|RegExp; }',
  IScanOptions: '{ dontLogScanning?: boolean; noMetadata?: boolean; }',
  DirentWithMetadata: '{ ext: string; nameBase: string; path: string; mm?: IAudioMetadata; em?: exif.Tags; } & Dirent',
  EntityType: "'file' | 'directory'",
}

const typeDocsTypes = Object.keys(typeDocs);
const typeDocsTypesMatch = new RegExp(typeDocsTypes.map(escapeRegExp).join('|'))

globalAdditions.typeDocs = typeDocs;

const makeDocFn = (doc: string) => {
  const fn = () => console.log(highlight(doc, 'ts'));
  fn._ = doc;
  return fn;
}
const makeDocXFn = (doc: string) => (iter = 100) => {
  var d = doc;
  while (typeDocsTypesMatch.test(d) && --iter >= 0)
    d = typeDocsTypes.filter(t => d.includes(t)).reduce((str, t) => str.replace(t, typeDocs[t]), d);
  return makeDocFn(d)();
}
Object.entries(globalItemDocs).forEach(([key, doc]) => globalAdditions[key].doc = makeDocFn(doc));
Object.entries(globalItemDocs).forEach(([key, doc]) => globalAdditions[key].docX = makeDocXFn(doc));

type GlobalAdditions = typeof globalAdditions;

declare global {
  namespace NodeJS {
    interface Global extends GlobalAdditions {}
  }
}

Object.assign(global, globalAdditions);
