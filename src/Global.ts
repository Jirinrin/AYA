import { exec } from "child_process";
import ENV from "./ENV";

export {};

declare global {
  namespace NodeJS {
    interface Global {
      exec: (cmd: string) => void;
    } 
  }
}

global.exec = (cmd) => {
  exec(cmd, {
    cwd: ENV.folder,
  }, (error, stdout, stderr) => {
    console.log(stdout);
    if (error) {
      console.error('Error encountered:');
      console.error(stderr);
    }
  });
};
