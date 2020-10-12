import { exec } from "child_process";
import ENV from "./ENV";
import { logger, Logger, PersistentLogger, pLogger } from "./util/LocalStorage";

export {};

declare global {
  namespace NodeJS {
    interface Global {
      log: Logger['log'];
      logv: Logger['logv'];
      logl: Logger['logl'];
      pLog: PersistentLogger['log'];

      exec: (cmd: string) => void;
    } 
  }
}

global.log = logger.log.bind(logger);
global.logv = logger.logv.bind(logger);
global.logl = logger.logl.bind(logger);
global.pLog = pLogger.log.bind(pLogger);

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
