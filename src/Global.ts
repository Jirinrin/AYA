import { exec } from "child_process";
import ENV from "./ENV";
import { logger, Logger, PersistentLogger, pLogger } from "./util/LocalStorage";

export {};

declare global {
  namespace NodeJS {
    interface Global {
      log: Logger['log'];
      pLog: PersistentLogger['log'];
      exec: (cmd: string) => void;
    } 
  }
}

global.log = logger.log;
global.pLog = pLogger.log;

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
