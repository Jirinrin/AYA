import { exec } from "child_process";
import { r } from ".";
import ENV from "./ENV";
import * as JSONbig from 'json-bigint';
import * as fs from "fs";
import * as path from "path";
import { resolvePath } from "./util/replUtils";
import { simpleMove } from "./util";

export {};

const wrapResolvePath = <T extends (path: string) => any>(fn: T): T =>
  ( (path: string) => fn(resolvePath(path)) ) as T;
const wrapResolvePath2 = <T extends (p1: string, p2: string) => any>(fn: T): T =>
  ( (p1: string, p2: string) => fn(resolvePath(p1), resolvePath(p2)) ) as T;

const globalAdditions = {
  /**
   * Execute a command that will be executed in the underlying shell environment.
   */
  exec: (cmd: string) =>
    // todo: promisify
    new Promise((res, rej) =>
      exec(cmd, {
        cwd: ENV.cwd,
      }, (error, stdout, stderr) => {
        console.log(stdout);
        if (error) {
          console.error('Error encountered:');
          console.error(stderr);
          rej(stderr);
        } else {
          res();
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

  mkdir: wrapResolvePath(fs.mkdirSync),
  exists: wrapResolvePath(fs.existsSync),
  move: wrapResolvePath2((filePath: string, moveToFolder: string) => {
    simpleMove(path.dirname(filePath), path.basename(filePath), moveToFolder, fs.lstatSync(filePath).isDirectory());
    console.log(`Moved ${filePath} to ${moveToFolder}`);
  }),
};

type GlobalAdditions = typeof globalAdditions;

declare global {
  namespace NodeJS {
    interface Global extends GlobalAdditions {}
  }
}

Object.assign(global, globalAdditions);
