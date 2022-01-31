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
import { doForEach, doForEachDeep, getEnts, getEntsWithMetadata, highlightExp, highlightExpsC, esc, pathToDirent, putMetadataOnEntity, readJson, simpleCopy, simpleMove, simpleRename, verbose, writeFile, writeJson, readFile, escPath, cwdRel, checkEntFilters, IGetEntsFilters, IScanOptions, wrapScanOptions } from "./util";
import { FileIteratorCallback } from "./types";
import { setExifMetadata } from "./util/exif";
import { setConsoleIndent } from './util/consoleExtension';

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
    fs.mkdirSync(escPath(path));
    console.log(highlightExp`Made dir "${path}"`);
  }),
  exists: wrapResolvePath1(fs.existsSync),
  move: wrapResolvePath2((filePath, moveToFolder) => {
    simpleMove(path.dirname(filePath), path.basename(filePath), moveToFolder, fs.statSync(filePath).isDirectory());
    console.log(highlightExp`Moved "${filePath}" to "${moveToFolder}"`);
  }),
  copy: wrapResolvePath2((filePath, copyToFolder, newFileName?: string) => {
    const finalName = simpleCopy(path.dirname(filePath), path.basename(filePath), copyToFolder, fs.statSync(filePath).isDirectory(), newFileName);
    console.log(highlightExp`Copied "${filePath}" to "${path.join(copyToFolder, finalName)}"`);
  }),
  rename: wrapResolvePath1((filePath, newFileName: string, withoutExt?: boolean) => {
    const ent = pathToDirent(filePath);
    const finalName = simpleRename(path.dirname(filePath), path.basename(filePath), withoutExt ? `${newFileName}.${ent.ext}` : newFileName, fs.statSync(filePath).isDirectory())
    if (finalName !== ent.name)
      console.log(highlightExp`Renamed "${cwdRel(filePath)}" to "${finalName}"`);
  }),
  remove: wrapResolvePath1(async filePath => {
    await trash(filePath);
    console.log(highlightExpsC(chalk.red)`Moved "${path.basename(filePath)}" to trash`);
  }),
  removeMulti: async (filePaths: string|string[]) => {
    console.log(`Going to remove ${typeof filePaths === 'string' ? '1' : filePaths.length} entities...`);
    await trash(filePaths);
    console.log(`Moved ${verbose(filePaths)} to trash`);
  },
  // todo: delete / rmdir functions
  metadata: wrapResolvePath1(async (filePath) => {
    return putMetadataOnEntity(pathToDirent(filePath)).catch(err => console.error('Error with getting metadata:', err));
  }),
  resolvePath,
  getEnts: wrapResolvePath1(getEnts),
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
  pasteClb: readFromClipboard,
  pasteClbJS: () => globalEval(readFromClipboard()),
  pasteClbJSON: () => JSON.parse(readFromClipboard()),

  setConsoleIndent,
  highlightExp,
};

type GlobalAdditions = typeof globalAdditions;

declare global {
  namespace NodeJS {
    interface Global extends GlobalAdditions {}
  }
}

Object.assign(global, globalAdditions);
