import * as chalk from "chalk";
import { formatMsg, withFinally } from ".";
import ENV from "../ENV";
import {logger, Logger, PersistentLogger, pLogger } from "./LocalStorage";

declare global {
  interface Console {
    llogv: Logger['logv'];
    llog: Logger['log'];
    llogl: Logger['logl'];
    plog: PersistentLogger['log'];
    // extra colors
    logPurple: Console['log'];
    logPink: Console['log'];
    // verbose with json syntax highlighting
    logv: Console['log'];
    // log on same line
    logsl: Console['log'];
  }
}

console.llog = logger.log;
console.llogv = logger.logv;
console.llogl = logger.logl;
console.plog = pLogger.log;

export function indent(indents: number = currentIndents): string {
  return '  '.repeat(indents);
}

export function getTrace() {
  const err = { name: ' ' };
  Error.captureStackTrace(err, getTrace);
  return (err as Error).stack.trim().slice(1);
}

type ConsolePairing<K extends keyof Console = any> = [log: Console[K], ch: chalk.Chalk, verbose?: boolean];
const consolePairings: Partial<{[K in keyof Console]: ConsolePairing<K>}> = {
  log: [console.log, chalk.green],
  warn: [console.warn, chalk.yellow],
  error: [console.error, chalk.redBright],
  info: [console.info, chalk.cyan],
  debug: [console.debug, chalk.gray],
  dir: [console.dir, chalk.magenta],
  table: [console.table, chalk.magentaBright],
  logPurple: [console.log, chalk.magenta],
  logPink: [console.log, chalk.magentaBright],
  logv: [console.log, chalk.green, true],
}
const consolePairingsParsed: Array<[k: keyof Console, getConsoleFn: (indents: number) => Console['log']]> =
  Object.entries(consolePairings).map(([k, [consoleFn, ch, v]]: [keyof Console, ConsolePairing]) =>
    [k, (indents: number) => (...args: any[]) => consoleFn(indent(indents) + ch(formatMsg(v ?? false, ...args)))]
  );

// todo: maybe a fancy matching thing that replaces absolute paths by a version relative to the CWD

export function setConsole(indents: number = 0) {
  consolePairingsParsed.forEach(([k, getConsoleFn]) => console[k] = getConsoleFn(indents) as any);
  console.logsl = (...args: any[]) => process.stdout.write(indent(indents) + formatMsg(false, ...args));
}

let currentIndents = 0;
export function setConsoleIndentRel(indentsDiff: number) {
  // todo: this is irrelevant when you want to manually set the indentation regardless of 'scanning' text
  if (ENV.dontLogScanning) return indentsDiff;
  currentIndents = Math.max(currentIndents + indentsDiff, 0);
  setConsole(currentIndents);
  return currentIndents;
}

export const withDeeperIndentation = <T>(callback: () => T): T => {
  const indents = setConsoleIndentRel(1);
  return withFinally(callback, () => setConsoleIndent(indents-1));
}
export function setConsoleIndent(indents: number) {
  if (currentIndents === indents) return;
  currentIndents = indents;
  setConsole(currentIndents);
}
