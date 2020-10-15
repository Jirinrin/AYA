import { exec } from "child_process";
import { r } from ".";
import ENV from "./ENV";

export {};

declare global {
  namespace NodeJS {
    interface Global {
      /**
       * Execute a command that will be executed in the underlying shell environment.
       */
      exec: (cmd: string) => void;
      /**
       * Generates a script based on the history of what you typed in the REPL. Three alternatives for specifying this in the params:
       * [int]: the total number of lines going back that you want
       * [int, int]: the range of lines that you want (e.g. [2, 4] gets the last 4 lines except the last line you typed)
       * [...int[]]: the indices of the lines that you wanted, counting back from the current line
       */
      scriptFromHistory(from: number): string;
    }
  }
}

global.exec = (cmd) => {
  exec(cmd, {
    cwd: ENV.cwd,
  }, (error, stdout, stderr) => {
    console.log(stdout);
    if (error) {
      console.error('Error encountered:');
      console.error(stderr);
    }
  });
};

global.scriptFromHistory = (...items: number[]) => {
  const lines = items.length === 1 
    ? r.history.slice(1, items[0]+1)
    : items.length === 2
      ? r.history.slice(items[0], items[1])
      : items.map(i => r.history[i]);
  return lines.reverse().join(' \n ');
};
