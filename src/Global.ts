import { exec } from "child_process";
import { r } from ".";
import ENV from "./ENV";
import * as JSONbig from 'json-bigint';
import * as fs from "fs";
import * as path from "path";
import * as lodash from "lodash";
import { resolvePath } from "./util/replUtils";
import { getEnts, getEntsWithMetadata, pathToDirent, putMetadataOnEntity, simpleCopy, simpleMove, simpleRename } from "./util";
import { DirentWithMetadata } from "./types";

export {};

const wrapResolvePath1 = <T extends (path: string, ...args: any[]) => any>(fn: T): T =>
  ( (path, ...args) => fn(resolvePath(path), ...args) ) as T;
const wrapResolvePath2 = <T extends (p1: string, p2: string, ...args: any[]) => any>(fn: T): T =>
  ( (p1, p2, ...args) => fn(resolvePath(p1), resolvePath(p2), ...args) ) as T;

const globalAdditions = {
  /**
   * Execute a command that will be executed in the underlying shell environment.
   */
  exec: (cmd: string, printOutput = true) =>
    // todo: promisify
    new Promise((res, rej) =>
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
  move: wrapResolvePath2((filePath: string, moveToFolder: string) => {
    simpleMove(path.dirname(filePath), path.basename(filePath), moveToFolder, fs.statSync(filePath).isDirectory());
    console.log(`Moved "${filePath}" to "${moveToFolder}"`);
  }),
  copy: wrapResolvePath2((filePath: string, copyToFolder: string) => {
    const finalName = simpleCopy(path.dirname(filePath), path.basename(filePath), copyToFolder, fs.statSync(filePath).isDirectory());
    console.log(`Copied "${filePath}" to "${copyToFolder}"`);
  }),
  rename: wrapResolvePath1((filePath: string, newFileName: string) => {
    const finalName = simpleRename(path.dirname(filePath), path.basename(filePath), newFileName, fs.statSync(filePath).isDirectory())
    console.log(`Renamed "${path.basename(filePath)}" to "${finalName}"`);
  }),
  metadata: wrapResolvePath1(async (filePath: string) => {
    console.log('filepath', filePath);
    return putMetadataOnEntity(pathToDirent(filePath) as DirentWithMetadata, path.dirname(filePath)).catch(err => console.error('Error with getting metadata:', err));
  }),
  resolvePath,
  getEnts,
  getEntsWithMetadata,

  lo: lodash,
};

type GlobalAdditions = typeof globalAdditions;

declare global {
  namespace NodeJS {
    interface Global extends GlobalAdditions {}
  }
}

Object.assign(global, globalAdditions);
