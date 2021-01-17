import { exec } from "child_process";
import { r } from ".";
import ENV from "./ENV";
import * as JSONbig from 'json-bigint';
import * as fs from "fs";
import * as path from "path";
import * as lodash from "lodash";
import * as req from 'superagent';
import { resolvePath, wrapResolvePath1, wrapResolvePath2 } from "./util/replUtils";
import { doForEach, doForEachDeep, getEnts, getEntsWithMetadata, pathToDirent, putMetadataOnEntity, readJson, simpleCopy, simpleMove, simpleRename, writeJson } from "./util";
import { DirentWithMetadata, FileIteratorCallback } from "./types";
import { setExifMetadata } from "./util/exif";

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

  mkdir: wrapResolvePath1(fs.mkdirSync),
  exists: wrapResolvePath1(fs.existsSync),
  move: wrapResolvePath2((filePath, moveToFolder) => {
    simpleMove(path.dirname(filePath), path.basename(filePath), moveToFolder, fs.statSync(filePath).isDirectory());
    console.log(`Moved "${filePath}" to "${moveToFolder}"`);
  }),
  copy: wrapResolvePath2((filePath, copyToFolder) => {
    const finalName = simpleCopy(path.dirname(filePath), path.basename(filePath), copyToFolder, fs.statSync(filePath).isDirectory());
    console.log(`Copied "${filePath}" to "${copyToFolder}"`);
  }),
  rename: wrapResolvePath1((filePath, newFileName: string, withoutExt?: boolean) => {
    const ent = pathToDirent(filePath);
    const finalName = simpleRename(path.dirname(filePath), path.basename(filePath), withoutExt ? `${newFileName}.${ent.ext}` : newFileName, fs.statSync(filePath).isDirectory())
    console.log(`Renamed "${path.basename(filePath)}" to "${finalName}"`);
  }),
  // todo: delete / rmdir functions
  metadata: wrapResolvePath1(async (filePath) => {
    return putMetadataOnEntity(pathToDirent(filePath) as DirentWithMetadata, path.dirname(filePath)).catch(err => console.error('Error with getting metadata:', err));
  }),
  resolvePath,
  getEnts: wrapResolvePath1(getEnts),
  getEntsWithMetadata: wrapResolvePath1(getEntsWithMetadata),

  doForEach: wrapResolvePath1(doForEach),
  doForEachDir: wrapResolvePath1(async (filePath, callback: FileIteratorCallback) => doForEach(filePath, (e, f) => e.isDirectory() ? callback(e, f) : null)),
  doForEachFile: wrapResolvePath1(async (filePath, callback: FileIteratorCallback) => doForEach(filePath, (e, f) => e.isFile() ? callback(e, f) : null)),
  doForEachDeep: wrapResolvePath1(doForEachDeep),

  readJson: wrapResolvePath1(readJson),
  writeJson: wrapResolvePath1(writeJson),

  lo: lodash,
  req,

  setTags: wrapResolvePath1(setExifMetadata),

  // todo: some things for reading/writing files
};

type GlobalAdditions = typeof globalAdditions;

declare global {
  namespace NodeJS {
    interface Global extends GlobalAdditions {}
  }
}

Object.assign(global, globalAdditions);
